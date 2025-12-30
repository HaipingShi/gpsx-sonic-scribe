import { PrismaClient } from '@prisma/client';
import pLimit from 'p-limit';
import fs from 'fs';
import path from 'path';
import { transcribeChunk } from './aliyunService';
import { transcribeChunkAliyun } from './aliyunFunasr';
import { polishChunkWithValidation, PolishingConfig, PolishResult } from './deepSeekService';
import { polishChunkWithGemini } from './geminiService';

const prisma = new PrismaClient();

// ============================================================================
// System Settings Loading
// ============================================================================

interface SystemSettings {
    defaultTemplateId?: string;
    defaultPolishModel?: 'deepseek' | 'gemini';
    promptTemplates?: Array<{
        id: string;
        name: string;
        prompt: string;
    }>;
}

function loadSystemSettings(): SystemSettings {
    const settingsPath = path.join(__dirname, '..', '..', 'storage', 'settings.json');
    try {
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.warn('[Solo] Failed to load system settings, using defaults');
    }
    return {};
}

function getTemplatePrompt(settings: SystemSettings): string {
    const templateId = settings.defaultTemplateId || 'professional';
    const template = settings.promptTemplates?.find(t => t.id === templateId);

    if (template?.prompt) {
        console.log(`[Solo] Using template: ${template.name}`);
        return template.prompt;
    }

    // Fallback default prompt
    return `你是一位专业的文本编辑。

## 任务: 润色文本
将录音转写的口语化文本整理成流畅、专业的书面表达。

## 规则:
1. 删除口头禅、重复词和无意义的语气词
2. 规范标点符号，确保句子结构清晰
3. 修正语法错误
4. 保持原意不变

## 输出要求:
仅输出润色后的文本。`;
}

// ============================================================================
// Checkpoint State Machine
// ============================================================================

/**
 * Checkpoint stages for Solo Mode automation
 */
export enum Checkpoint {
    UPLOADED = 'UPLOADED',
    COMPRESSED = 'COMPRESSED',
    CHUNKED = 'CHUNKED',
    TRANSCRIBED = 'TRANSCRIBED',
    VALIDATED = 'VALIDATED',
    POLISHED = 'POLISHED',
    MERGED = 'MERGED',
    COMPLETE = 'COMPLETE',
}

/**
 * Validation status for individual segments
 */
export enum ValidationStatus {
    PENDING = 'PENDING',
    VERIFIED = 'VERIFIED',
    HALLUCINATORY = 'HALLUCINATORY',
    FAILED = 'FAILED',
}

// ============================================================================
// Concurrency Control
// ============================================================================

const LIMITS = {
    transcribe: 3,    // Aliyun/Groq rate limit
    polish: 5,        // DeepSeek polishing (includes validation now)
};

const transcribeLimit = pLimit(LIMITS.transcribe);
const polishLimit = pLimit(LIMITS.polish);

// ============================================================================
// Pipeline State Tracking (In-Memory)
// ============================================================================

interface PipelineState {
    isRunning: boolean;
    isPaused: boolean;
    transcribeActive: number;
    transcribePending: number;
    polishActive: number;
    polishPending: number;
    failedChunks: Array<{ chunkId: string; error: string; retryAttempt: number }>;
}

// In-memory state per project (for real-time status updates)
const pipelineStates = new Map<string, PipelineState>();

function initPipelineState(projectId: string): PipelineState {
    const existing = pipelineStates.get(projectId);
    if (existing?.isRunning) return existing;

    const state: PipelineState = {
        isRunning: true,
        isPaused: false,
        transcribeActive: 0,
        transcribePending: 0,
        polishActive: 0,
        polishPending: 0,
        failedChunks: [],
    };
    pipelineStates.set(projectId, state);
    return state;
}

export function getPipelineState(projectId: string): PipelineState | undefined {
    return pipelineStates.get(projectId);
}

// ============================================================================
// Core Pipeline Functions
// ============================================================================

/**
 * Advance project checkpoint and persist to database
 */
async function advanceCheckpoint(projectId: string, checkpoint: Checkpoint): Promise<void> {
    await prisma.project.update({
        where: { id: projectId },
        data: { checkpoint },
    });
    console.log(`[Solo] Project ${projectId} checkpoint: ${checkpoint}`);
}

/**
 * Process a single chunk through the pipeline: Transcribe → Validate → Polish
 */
async function processChunkPipeline(
    chunkId: string,
    projectId: string,
    polishingConfig?: PolishingConfig,
    model: 'deepseek' | 'gemini' = 'gemini'
): Promise<{ success: boolean; error?: string }> {
    const state = pipelineStates.get(projectId);
    if (!state) return { success: false, error: 'Pipeline not initialized' };
    if (state.isPaused) return { success: false, error: 'Pipeline paused' };

    try {
        // Get chunk info
        const chunk = await prisma.audioChunk.findUnique({
            where: { id: chunkId },
            include: { draftSegment: { include: { polishedSegment: true } } },
        });
        if (!chunk) throw new Error(`Chunk ${chunkId} not found`);
        if (chunk.isSilence) {
            console.log(`[Solo] Skipping silence chunk ${chunk.index}`);
            return { success: true };
        }

        // STEP 1: Transcribe (only if raw text is missing)
        let rawText = chunk.draftSegment?.rawText;

        if (!rawText) {
            state.transcribePending++;
            rawText = await transcribeLimit(async () => {
                state.transcribePending--;
                state.transcribeActive++;
                try {
                    return await transcribeChunk(chunk.filePath);
                } finally {
                    state.transcribeActive--;
                }
            });

            // Save draft segment
            const ds = await prisma.draftSegment.upsert({
                where: { chunkId },
                create: {
                    chunkId,
                    rawText,
                    confidence: 0.8,
                    providerResponseJson: JSON.stringify({ source: 'aliyun-funasr' }),
                    validationStatus: ValidationStatus.PENDING,
                },
                update: {
                    rawText,
                    validationStatus: ValidationStatus.PENDING,
                },
            });
            // Link it for later
            chunk.draftSegment = ds as any;
        }

        // STEP 2: Polish (only if polished text is missing)
        let existingPolished = chunk.draftSegment?.polishedSegment;

        if (existingPolished) {
            console.log(`[Solo] Chunk ${chunk.index} already has polished text, skipping Step 2.`);
            return { success: true };
        }

        state.polishPending++;
        const previousContext = await getPreviousContext(projectId, chunk.index);

        let polishResult: PolishResult;

        if (model === 'gemini') {
            // Use Gemini for polishing
            const polishedResult = await polishLimit(async () => {
                state.polishPending--;
                state.polishActive++;
                try {
                    console.log(`[Solo] Polishing chunk ${chunk.index} with Gemini...`);
                    const result = await polishChunkWithGemini({
                        previousContext,
                        currentRawText: rawText,
                        config: polishingConfig,
                    });
                    return result;
                } finally {
                    state.polishActive--;
                }
            });

            polishResult = {
                polishedText: polishedResult.polishedText,
                hasRepetition: false,
            };
        } else {
            // Use DeepSeek for polishing (with validation)
            polishResult = await polishLimit(async () => {
                state.polishPending--;
                state.polishActive++;
                try {
                    console.log(`[Solo] Polishing chunk ${chunk.index} with DeepSeek...`);
                    return await polishChunkWithValidation({
                        previousContext,
                        currentRawText: rawText,
                        config: polishingConfig,
                    });
                } finally {
                    state.polishActive--;
                }
            });
        }

        // Update validation status
        if (polishResult.hasRepetition) {
            console.log(`[Solo] Chunk ${chunk.index} has repetition warning: ${polishResult.repetitionWarnings?.join(', ')}`);
            await prisma.draftSegment.update({
                where: { chunkId },
                data: {
                    validationStatus: ValidationStatus.VERIFIED,
                    validationResult: JSON.stringify({
                        hasRepetition: true,
                        warnings: polishResult.repetitionWarnings,
                    }),
                },
            });
        } else {
            await prisma.draftSegment.update({
                where: { chunkId },
                data: { validationStatus: ValidationStatus.VERIFIED },
            });
        }

        // Save polished segment
        const dsId = chunk.draftSegment?.id;
        if (!dsId) throw new Error(`Draft segment missing for chunk ${chunk.index} before polishing.`);

        await prisma.polishedSegment.upsert({
            where: { draftSegmentId: dsId },
            create: {
                draftSegmentId: dsId,
                polishedText: polishResult.polishedText,
                status: polishResult.hasRepetition ? 'NEEDS_REVIEW' : 'APPROVED',
            },
            update: {
                polishedText: polishResult.polishedText,
                status: polishResult.hasRepetition ? 'NEEDS_REVIEW' : 'APPROVED',
            },
        });

        console.log(`[Solo] Chunk ${chunk.index} completed successfully`);
        return { success: true };

    } catch (error: any) {
        console.error(`[Solo] Chunk ${chunkId} error:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Get polished text from previous chunks for context
 */
async function getPreviousContext(projectId: string, currentIndex: number): Promise<string> {
    const previousChunks = await prisma.audioChunk.findMany({
        where: {
            projectId,
            index: { lt: currentIndex },
            isSilence: false,
        },
        include: {
            draftSegment: {
                include: { polishedSegment: true },
            },
        },
        orderBy: { index: 'desc' },
        take: 2, // Last 2 chunks for context
    });

    return previousChunks
        .reverse()
        .map(c => c.draftSegment?.polishedSegment?.polishedText || c.draftSegment?.rawText || '')
        .join('\n\n');
}

// ============================================================================
// Main Pipeline Executor
// ============================================================================

/**
 * Execute the complete Solo Mode pipeline for a project
 */
export async function executeSoloPipeline(projectId: string): Promise<void> {
    const existing = pipelineStates.get(projectId);
    if (existing?.isRunning) {
        console.log(`[Solo] Pipeline already running for ${projectId}`);
        return;
    }

    console.log(`[Solo] Starting pipeline for project ${projectId}`);
    const state = initPipelineState(projectId);

    try {
        // Update project mode and status
        await prisma.project.update({
            where: { id: projectId },
            data: { mode: 'SOLO', status: 'DRAFTING' },
        });

        // Get project with chunks
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                audioChunks: {
                    orderBy: { index: 'asc' },
                    include: {
                        draftSegment: {
                            include: { polishedSegment: true }
                        }
                    }
                },
            },
        });
        if (!project) throw new Error(`Project ${projectId} not found`);

        // Check if chunking is needed (resume support)
        const checkpoint = project.checkpoint as Checkpoint;
        if (checkpoint === Checkpoint.UPLOADED) {
            // Need to compress and chunk first - this should already be done via upload flow
            console.log(`[Solo] Project at UPLOADED, assuming chunks already exist`);
            await advanceCheckpoint(projectId, Checkpoint.CHUNKED);
        }

        // Get non-silence chunks to process
        const chunksToProcess = project.audioChunks.filter(c => !c.isSilence);
        console.log(`[Solo] Processing ${chunksToProcess.length} chunks...`);

        // Load system settings (template + model)
        const systemSettings = loadSystemSettings();
        const templatePrompt = getTemplatePrompt(systemSettings);
        const defaultModel = systemSettings.defaultPolishModel || 'gemini';

        console.log(`[Solo] Using model: ${defaultModel}`);

        // Build polishing config from system settings
        const polishingConfig: PolishingConfig = project.promptConfig
            ? { ...JSON.parse(project.promptConfig), customInstructions: templatePrompt }
            : {
                mode: 'Rewrite & Polish',
                tone: '专业',
                cleaningRules: ['去除口头禅', '规范标点', '修正语病'],
                customInstructions: templatePrompt,
            };

        console.log(`[Solo] Using polish config: tone=${polishingConfig.tone}, template prompt loaded`);

        // Process Transcription in parallel (Stage 1)
        console.log(`[Solo] Stage 1: Parallel Transcription...`);
        const transcribePromises = chunksToProcess.map(async (chunk) => {
            // Check if already transcribed
            if (chunk.draftSegment) return { success: true, chunkId: chunk.id };

            state.transcribePending++;
            return transcribeLimit(async () => {
                state.transcribePending--;
                state.transcribeActive++;
                try {
                    console.log(`[Solo] Transcribing chunk ${chunk.index}...`);
                    const rawText = await transcribeChunkAliyun(chunk.filePath);

                    const ds = await prisma.draftSegment.upsert({
                        where: { chunkId: chunk.id },
                        create: {
                            chunkId: chunk.id,
                            rawText,
                            confidence: 0.8,
                            providerResponseJson: JSON.stringify({ source: 'aliyun-funasr' }),
                            validationStatus: ValidationStatus.PENDING,
                        },
                        update: {
                            rawText,
                            validationStatus: ValidationStatus.PENDING,
                        },
                    });
                    return { success: true, chunkId: chunk.id, rawText };
                } catch (err: any) {
                    console.error(`[Solo] Transcription failed for ${chunk.index}:`, err.message);
                    return { success: false, chunkId: chunk.id, error: err.message };
                } finally {
                    state.transcribeActive--;
                }
            });
        });

        const transcribeResults = await Promise.all(transcribePromises);
        const transcribeFailures = transcribeResults.filter((r: any) => !r.success);

        if (transcribeFailures.length > 0) {
            console.error(`[Solo] ${transcribeFailures.length} chunks failed transcription. Aborting pipeline.`);
            throw new Error(`Transcription stage failed`);
        }

        await advanceCheckpoint(projectId, Checkpoint.TRANSCRIBED);

        // Process Polishing sequentially (Stage 2)
        // This ensures getPreviousContext always gets the *latest polished* text
        console.log(`[Solo] Stage 2: Sequential Polishing for context coherence...`);
        const results = [];
        for (const chunk of chunksToProcess) {
            // Refresh chunk data to get potential existing polished text
            const currentChunk = await prisma.audioChunk.findUnique({
                where: { id: chunk.id },
                include: { draftSegment: { include: { polishedSegment: true } } }
            });

            if (currentChunk?.draftSegment?.polishedSegment) {
                console.log(`[Solo] Chunk ${chunk.index} already polished, skipping.`);
                results.push({ success: true, chunkId: chunk.id });
                continue;
            }

            const res = await processChunkPipeline(chunk.id, projectId, polishingConfig, defaultModel);
            results.push(res);
        }

        // Check results
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;
        console.log(`[Solo] Chunk processing complete: ${successCount} success, ${failCount} failed`);

        // Advance checkpoint based on completion
        if (failCount === 0) {
            await advanceCheckpoint(projectId, Checkpoint.POLISHED);
        } else {
            await advanceCheckpoint(projectId, Checkpoint.VALIDATED);
        }

        // Merge step (create final document)
        await performMerge(projectId);
        await advanceCheckpoint(projectId, Checkpoint.MERGED);

        // Mark complete
        await prisma.project.update({
            where: { id: projectId },
            data: { status: 'COMPLETED' },
        });
        await advanceCheckpoint(projectId, Checkpoint.COMPLETE);

        console.log(`[Solo] Pipeline complete for project ${projectId}`);

    } catch (error: any) {
        console.error(`[Solo] Pipeline error for ${projectId}:`, error.message);
        // Update project status to indicate error
        await prisma.project.update({
            where: { id: projectId },
            data: { status: 'ERROR' },
        });
        throw error;
    } finally {
        const s = pipelineStates.get(projectId);
        if (s) s.isRunning = false;
        // Cleanup state after debounce
        setTimeout(() => pipelineStates.delete(projectId), 60000);
    }
}

/**
 * Merge all polished segments into a final document
 */
async function performMerge(projectId: string): Promise<void> {
    const chunks = await prisma.audioChunk.findMany({
        where: { projectId, isSilence: false },
        include: {
            draftSegment: {
                include: { polishedSegment: true },
            },
        },
        orderBy: { index: 'asc' },
    });

    const mergedContent = chunks
        .map(c => c.draftSegment?.polishedSegment?.polishedText || c.draftSegment?.rawText || '')
        .filter(Boolean)
        .join('\n\n');

    // Save merged content to file
    const fs = await import('fs');
    const path = await import('path');
    const outputDir = path.join(process.cwd(), 'storage', 'outputs', projectId);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputPath = path.join(outputDir, 'merged.md');
    fs.writeFileSync(outputPath, mergedContent);

    // Create FinalDocument record
    await prisma.finalDocument.create({
        data: {
            projectId,
            contentPath: outputPath,
        },
    });

    console.log(`[Solo] Merged document saved to ${outputPath}`);
}

/**
 * Resume pipeline from last checkpoint
 */
export async function resumeFromCheckpoint(projectId: string): Promise<void> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    console.log(`[Solo] Resuming from checkpoint: ${project.checkpoint}`);

    // Re-run pipeline - it will skip completed steps based on checkpoint
    await executeSoloPipeline(projectId);
}

/**
 * Pause the pipeline for a project
 */
export function pausePipeline(projectId: string): void {
    const state = pipelineStates.get(projectId);
    if (state) {
        state.isPaused = true;
        console.log(`[Solo] Pipeline paused for ${projectId}`);
    }
}

/**
 * Get current solo mode status for a project
 */
export async function getSoloStatus(projectId: string): Promise<{
    checkpoint: string;
    mode: string;
    transcribeActive: number;
    transcribePending: number;
    polishActive: number;
    polishPending: number;
    failedChunks: Array<{ chunkId: string; error: string; retryAttempt: number }>;
}> {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
    });
    if (!project) throw new Error(`Project ${projectId} not found`);

    const state = pipelineStates.get(projectId);

    return {
        checkpoint: project.checkpoint,
        mode: project.mode,
        transcribeActive: state?.transcribeActive || 0,
        transcribePending: state?.transcribePending || 0,
        polishActive: state?.polishActive || 0,
        polishPending: state?.polishPending || 0,
        failedChunks: state?.failedChunks || [],
    };
}

/**
 * Recover all stuck pipelines (called on server start)
 */
export async function initializePipelineRecovery(): Promise<void> {
    console.log('[Solo] Initializing pipeline recovery...');
    try {
        const stuckProjects = await prisma.project.findMany({
            where: {
                status: 'POLISHING',
            }
        });

        if (stuckProjects.length === 0) {
            console.log('[Solo] No stuck pipelines found.');
            return;
        }

        console.log(`[Solo] Found ${stuckProjects.length} stuck projects. Resuming...`);

        for (const project of stuckProjects) {
            console.log(`[Solo] Resuming project ${project.id} (${project.originalFilename})`);
            // Fire and forget so we don't block server startup
            resumeFromCheckpoint(project.id).catch(err => {
                console.error(`[Solo] Failed to resume project ${project.id}:`, err.message);
            });
        }
    } catch (error) {
        console.error('[Solo] Error during pipeline recovery initialization:', error);
    }
}

