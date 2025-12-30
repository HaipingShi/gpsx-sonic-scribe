import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import { compressAudio } from '../services/mediaEngine';
import { smartSplitAudio } from '../services/vadService';
import { transcribeChunk } from '../services/aliyunService';
import { polishChunk } from '../services/deepSeekService';
import { polishChunkGemini } from '../services/geminiService';
import { executeSoloPipeline, resumeFromCheckpoint, pausePipeline, getSoloStatus } from '../services/soloModeService';

const prisma = new PrismaClient();

export const createProject = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        const originalFile = req.file;
        const uploadDir = path.dirname(originalFile.path);

        // Create a unique directory for this project's assets to avoid collisions
        const projectFolderName = path.parse(originalFile.filename).name;
        const projectDir = path.join(uploadDir, projectFolderName);
        if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true });
        }

        console.log(`[Create] Processing upload into isolated dir: ${projectDir}`);

        // 1. Compress Audio (Output into project-specific dir)
        const compressedFilePath = await compressAudio(originalFile.path, projectDir);

        // 2. Delete Original (Heavy) File from temporary upload location
        fs.unlink(originalFile.path, (err) => {
            if (err) console.error('[Create] Failed to cleanup original file:', err);
            else console.log('[Create] Original file deleted to save space.');
        });

        // 3. VAD Smart Splitting (Chunks will be in projectDir/chunks/)
        const chunks = await smartSplitAudio(compressedFilePath, projectDir);

        // 4. Create Database Entry with Chunks
        const project = await prisma.project.create({
            data: {
                originalFilename: originalFile.originalname,
                filePath: compressedFilePath,
                status: 'UPLOADED',
                mode: 'SOLO', // Always default to SOLO
                audioChunks: {
                    create: chunks.map(chunk => ({
                        index: chunk.index,
                        filePath: chunk.chunkPath,
                        durationMs: chunk.durationMs,
                        isSilence: false,
                    }))
                }
            },
            include: {
                audioChunks: true
            }
        });

        // 5. Trigger Solo Pipeline in background
        executeSoloPipeline(project.id).catch(err => {
            console.error(`[Solo] Failed to auto-start pipeline for ${project.id}:`, err);
        });

        res.status(201).json(project);
    } catch (error: any) {
        console.error('Project creation failed:', error.message);
        res.status(500).json({ error: `Failed to process upload: ${error.message}` });
    }
};

export const listProjects = async (_req: Request, res: Response): Promise<void> => {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { createdAt: 'desc' },
        });
        res.json(projects);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

export const deleteProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        console.log(`[Delete] Request to delete project: ${id}`);

        const project = await prisma.project.findUnique({
            where: { id },
            include: { audioChunks: true }
        });

        if (!project) {
            console.warn(`[Delete] Project not found: ${id}`);
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // 1. Delete Audio Chunks Files
        if (project.audioChunks && project.audioChunks.length > 0) {
            console.log(`[Delete] Cleaning up ${project.audioChunks.length} audio chunks...`);
            for (const chunk of project.audioChunks) {
                if (fs.existsSync(chunk.filePath)) {
                    try {
                        fs.unlinkSync(chunk.filePath);
                    } catch (err) {
                        console.error(`[Delete] Failed to delete chunk file: ${chunk.filePath}`, err);
                    }
                }
            }
        }

        // 2. Delete Main compressed File
        if (fs.existsSync(project.filePath)) {
            try {
                fs.unlinkSync(project.filePath);
                console.log(`[Delete] Project main file deleted: ${project.filePath}`);
            } catch (err) {
                console.error(`[Delete] Failed to delete main file: ${project.filePath}`, err);
            }
        }

        // 3. Cleanup Directory if it's empty and specific to the project
        const projectDir = path.dirname(project.filePath);
        const storageUploadsDir = path.join(process.cwd(), 'storage', 'uploads');

        if (projectDir !== storageUploadsDir && projectDir.startsWith(storageUploadsDir) && fs.existsSync(projectDir)) {
            try {
                // Check if directory is empty or just has 'chunks' subdir which we can also remove
                const chunksDir = path.join(projectDir, 'chunks');
                if (fs.existsSync(chunksDir)) {
                    const chunkFiles = fs.readdirSync(chunksDir);
                    if (chunkFiles.length === 0) {
                        fs.rmdirSync(chunksDir);
                    }
                }

                const remainingFiles = fs.readdirSync(projectDir);
                if (remainingFiles.length === 0) {
                    fs.rmdirSync(projectDir);
                    console.log(`[Delete] Project directory cleaned up: ${projectDir}`);
                }
            } catch (err) {
                console.error(`[Delete] Failed to cleanup project directory: ${projectDir}`, err);
            }
        }

        // 4. Delete from DB (Cascade will handle segments, documents, etc.)
        await prisma.project.delete({ where: { id } });
        console.log(`[Delete] Project record deleted from DB: ${id}`);

        res.status(200).json({ message: 'Project and all associated assets deleted successfully' });
    } catch (error: any) {
        console.error("[Delete] Project Error:", error.message);
        res.status(500).json({ error: `Failed to delete project: ${error.message}` });
    }
};

export const getProject = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                audioChunks: {
                    include: {
                        draftSegment: {
                            include: {
                                polishedSegment: true
                            }
                        }
                    },
                    orderBy: { index: 'asc' }
                },
                draftDocuments: true,
                finalDocuments: true,
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Map to Frontend Interface (calculate times and structure segments)
        let currentTime = 0;
        const chunks = project.audioChunks.map(chunk => {
            const startTime = currentTime;
            const endTime = currentTime + (chunk.durationMs / 1000);
            currentTime = endTime;

            const draftSegments = chunk.draftSegment ? [{
                startTime,
                endTime,
                text: chunk.draftSegment.rawText
            }] : [];

            const polishedSegments = chunk.draftSegment?.polishedSegment ? [{
                startTime,
                endTime,
                text: chunk.draftSegment.polishedSegment.polishedText
            }] : [];

            // Determine chunk status
            let status = 'PENDING';
            if (chunk.draftSegment) status = 'TRANSCRIBED';
            if (chunk.draftSegment?.polishedSegment) status = 'POLISHED';

            return {
                id: chunk.id,
                startTime,
                endTime,
                status,
                draftSegments,
                polishedSegments
            };
        });

        res.json({ ...project, chunks });
    } catch (error) {
        console.error("Get Project Error:", error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

/**
 * Triggers transcription for all chunks in a project.
 * POST /api/projects/:id/transcribe
 */
export const startTranscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id },
            include: { audioChunks: true }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Update status
        await prisma.project.update({ where: { id }, data: { status: 'DRAFTING' } });

        // Process Chunks (Fire and Forget / Async Background)
        (async () => {
            for (const chunk of project.audioChunks) {
                try {
                    const text = await transcribeChunk(chunk.filePath);

                    await prisma.draftSegment.upsert({
                        where: { chunkId: chunk.id },
                        update: { rawText: text },
                        create: {
                            chunkId: chunk.id,
                            rawText: text,
                            confidence: 0.9,
                            providerResponseJson: '{}'
                        }
                    });
                    console.log(`Chunk ${chunk.index} transcribed.`);
                } catch (err) {
                    console.error(`Chunk ${chunk.index} failed:`, err);
                }
            }

            await prisma.project.update({ where: { id }, data: { status: 'POLISHING' } });
        })();

        res.json({ message: 'Transcription started', chunkCount: project.audioChunks.length });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Transcription start failed' });
    }
};

/**
 * Triggers polishing with Context Window.
 * POST /api/projects/:id/polish
 * Body: { mode, tone, cleaningRules, customInstructions }
 */
export const startPolishing = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { mode, tone, cleaningRules, customInstructions } = req.body;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                audioChunks: { include: { draftSegment: true } }
            }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Save Prompt Config if provided
        if (mode || tone || cleaningRules || customInstructions) {
            await prisma.project.update({
                where: { id },
                data: {
                    promptConfig: JSON.stringify({ mode, tone, cleaningRules, customInstructions })
                }
            });
        }

        // Update status
        await prisma.project.update({ where: { id }, data: { status: 'POLISHING' } });

        // Polishing Logic
        const config = { mode, tone, cleaningRules, customInstructions };
        const chunks = project.audioChunks.sort((a, b) => a.index - b.index);

        (async () => {
            let previousContext = "";

            for (const chunk of chunks) {
                if (!chunk.draftSegment) continue;

                try {
                    console.log(`Polishing chunk ${chunk.index}...`);
                    const polishedText = await polishChunk({
                        previousContext,
                        currentRawText: chunk.draftSegment.rawText,
                        config
                    });

                    await prisma.polishedSegment.upsert({
                        where: { draftSegmentId: chunk.draftSegment.id },
                        update: { polishedText, status: 'APPROVED' },
                        create: {
                            draftSegmentId: chunk.draftSegment.id,
                            polishedText: polishedText,
                            status: 'APPROVED'
                        }
                    });

                    // Update Context
                    previousContext += polishedText + " ";
                    if (previousContext.length > 5000) {
                        previousContext = previousContext.slice(-2000);
                    }
                } catch (err) {
                    console.error(`Polishing chunk ${chunk.index} failed`, err);
                }
            }

            await prisma.project.update({ where: { id }, data: { status: 'COMPLETED' } });
        })();

        res.json({ message: 'Polishing started (Sequential)' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Polishing failed' });
    }
};

export const downloadResult = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                audioChunks: {
                    include: {
                        draftSegment: {
                            include: { polishedSegment: true }
                        }
                    },
                    orderBy: { index: 'asc' }
                }
            }
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Aggregate Text
        let content = "";
        project.audioChunks.forEach(chunk => {
            if (chunk.draftSegment?.polishedSegment) {
                content += chunk.draftSegment.polishedSegment.polishedText + "\n\n";
            } else if (chunk.draftSegment) {
                content += chunk.draftSegment.rawText + "\n\n";
            }
        });

        if (!content) {
            content = "No content generated yet.";
        }

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename="${project.originalFilename}_result.txt"`);
        res.send(content);

    } catch (error) {
        console.error("Download Error:", error);
        res.status(500).json({ error: 'Failed to download result' });
    }
};

/**
 * Batch download multiple projects as a ZIP file
 * POST /api/projects/download-batch
 * Body: { projectIds: string[] }
 */
export const downloadBatchZip = async (req: Request, res: Response): Promise<void> => {
    try {
        const { projectIds } = req.body;

        if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
            res.status(400).json({ error: 'No project IDs provided' });
            return;
        }

        // Import archiver dynamically
        const archiver = require('archiver');

        // Fetch all projects
        const projects = await prisma.project.findMany({
            where: { id: { in: projectIds } },
            include: {
                audioChunks: {
                    include: {
                        draftSegment: {
                            include: { polishedSegment: true }
                        }
                    },
                    orderBy: { index: 'asc' }
                }
            }
        });

        if (projects.length === 0) {
            res.status(404).json({ error: 'No projects found' });
            return;
        }

        // Set headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="audioscribe_batch_${Date.now()}.zip"`);

        // Create archive
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(res);

        // Add each project's content to the archive
        for (const project of projects) {
            let content = '';
            project.audioChunks.forEach(chunk => {
                if (chunk.draftSegment?.polishedSegment) {
                    content += chunk.draftSegment.polishedSegment.polishedText + "\n\n";
                } else if (chunk.draftSegment) {
                    content += chunk.draftSegment.rawText + "\n\n";
                }
            });

            if (!content) {
                content = '尚无内容';
            }

            // Sanitize filename
            const safeName = project.originalFilename.replace(/[^a-zA-Z0-9\u4e00-\u9fa5._-]/g, '_');
            archive.append(content, { name: `${safeName}_result.txt` });
        }

        await archive.finalize();
        console.log(`[Batch Download] Created ZIP with ${projects.length} files`);

    } catch (error) {
        console.error("Batch Download Error:", error);
        res.status(500).json({ error: 'Failed to create batch download' });
    }
};

// ============================================================================
// Solo Mode Controller Functions
// ============================================================================

/**
 * Start Solo Mode automation for a project
 * POST /api/projects/:id/solo/start
 */
export const startSoloMode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Start pipeline in background (non-blocking)
        executeSoloPipeline(id).catch(err => {
            console.error(`[Solo] Pipeline failed for ${id}:`, err);
        });

        res.json({
            message: 'Solo Mode started',
            projectId: id,
            status: 'PROCESSING'
        });

    } catch (error) {
        console.error("Start Solo Mode Error:", error);
        res.status(500).json({ error: 'Failed to start Solo Mode' });
    }
};

/**
 * Resume Solo Mode automation from checkpoint
 * POST /api/projects/:id/solo/resume
 */
export const resumeSoloMode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({ where: { id } });
        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        if (project.mode !== 'SOLO') {
            res.status(400).json({ error: 'Project is not in Solo Mode' });
            return;
        }

        // Resume pipeline in background
        resumeFromCheckpoint(id).catch(err => {
            console.error(`[Solo] Resume failed for ${id}:`, err);
        });

        res.json({
            message: 'Solo Mode resumed',
            projectId: id,
            checkpoint: project.checkpoint
        });

    } catch (error) {
        console.error("Resume Solo Mode Error:", error);
        res.status(500).json({ error: 'Failed to resume Solo Mode' });
    }
};

/**
 * Pause Solo Mode automation
 * POST /api/projects/:id/solo/pause
 */
export const pauseSoloMode = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        pausePipeline(id);

        res.json({
            message: 'Solo Mode paused',
            projectId: id
        });

    } catch (error) {
        console.error("Pause Solo Mode Error:", error);
        res.status(500).json({ error: 'Failed to pause Solo Mode' });
    }
};

/**
 * Get Solo Mode real-time status
 * GET /api/projects/:id/solo/status
 */
export const getSoloModeStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const status = await getSoloStatus(id);
        res.json(status);

    } catch (error) {
        console.error("Get Solo Status Error:", error);
        res.status(500).json({ error: 'Failed to get Solo Mode status' });
    }
};

/**
 * Get merged document with raw and polished text for comparison
 * GET /api/projects/:id/merged
 */
export const getMergedDocument = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                audioChunks: {
                    orderBy: { index: 'asc' },
                    include: {
                        draftSegment: {
                            include: {
                                polishedSegment: true,
                            },
                        },
                    },
                },
                finalDocuments: true,
            },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        // Build comparison data for each chunk
        const chunks = project.audioChunks
            .filter((chunk: typeof project.audioChunks[0]) => !chunk.isSilence)
            .map((chunk: typeof project.audioChunks[0]) => ({
                index: chunk.index,
                chunkId: chunk.id,
                audioPath: `/storage/uploads/chunks/${path.basename(chunk.filePath)}`,
                durationMs: chunk.durationMs,
                rawText: chunk.draftSegment?.rawText || '',
                polishedText: chunk.draftSegment?.polishedSegment?.polishedText || '',
                status: chunk.draftSegment?.polishedSegment?.status || 'PENDING',
                hasRepetition: chunk.draftSegment?.validationResult
                    ? JSON.parse(chunk.draftSegment.validationResult).hasRepetition
                    : false,
            }));

        // Build merged content
        const mergedRaw = chunks.map((c: { rawText: string }) => c.rawText).filter(Boolean).join('\n\n');
        const mergedPolished = chunks.map((c: { polishedText: string; rawText: string }) => c.polishedText || c.rawText).filter(Boolean).join('\n\n');

        // Get latest final document
        const latestFinalDoc = project.finalDocuments[0];

        res.json({
            projectId: id,
            status: project.status,
            checkpoint: project.checkpoint,
            chunks,
            merged: {
                raw: mergedRaw,
                polished: mergedPolished,
            },
            finalDocumentPath: latestFinalDoc?.contentPath,
        });

    } catch (error) {
        console.error("Get Merged Document Error:", error);
        res.status(500).json({ error: 'Failed to get merged document' });
    }
};

/**
 * Intelligent Text Analysis
 * POST /api/projects/polish/analyze
 * Body: { text }
 */
export const analyzeText = async (req: Request, res: Response): Promise<void> => {
    try {
        const { text } = req.body;
        if (!text || text.length < 10) {
            res.status(400).json({ error: 'Text too short for analysis' });
            return;
        }

        // Use DeepSeek to analyze
        const { polishChunkWithValidation } = require('../services/deepSeekService');
        const client = require('../services/deepSeekService').getNextClient();

        const systemPrompt = `You are a text analysis assistant. Analyze the input text and suggest the best polishing configuration.
Return ONLY a JSON object with:
{
  "recommendedStrategy": "paragraph" | "sentence" | "chars",
  "recommendedTone": "Professional" | "Casual" | "Academic",
  "suggestedHotwords": ["word1", "word2"],
  "summary": "Brief analysis of the text structure and content"
}`;

        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text.slice(0, 2000) } // Analysis only needs a sample
            ],
            temperature: 0.2,
            response_format: { type: 'json_object' },
        });

        const analysis = JSON.parse(response.choices[0].message.content || '{}');
        res.json(analysis);

    } catch (error) {
        console.error("Analyze Text Error:", error);
        res.status(500).json({ error: 'Analysis failed' });
    }
};


// Single Chunk Operations for Manual Mode
export const transcribeSingleChunk = async (req: Request, res: Response): Promise<void> => {
    const { projectId, chunkId } = req.params;

    try {
        const chunk = await prisma.audioChunk.findUnique({
            where: { id: chunkId },
            include: { draftSegment: true },
        });

        if (!chunk || chunk.projectId !== projectId) {
            res.status(404).json({ error: 'Chunk not found' });
            return;
        }

        console.log(`[Manual Mode] Transcribing chunk ${chunk.index} for project ${projectId}`);

        const transcription = await transcribeChunk(chunk.filePath);

        // Upsert draft segment
        await prisma.draftSegment.upsert({
            where: { chunkId },
            update: {
                rawText: transcription,
                confidence: 1.0,
                providerResponseJson: JSON.stringify({ source: 'manual' }),
            },
            create: {
                chunkId,
                rawText: transcription,
                confidence: 1.0,
                providerResponseJson: JSON.stringify({ source: 'manual' }),
            },
        });

        res.json({ success: true, chunkId, transcription });
    } catch (error: any) {
        console.error('[Manual Mode] Transcription failed:', error.message);
        res.status(500).json({ error: error.message || 'Transcription failed' });
    }
};

export const polishSingleChunk = async (req: Request, res: Response): Promise<void> => {
    const { projectId, chunkId } = req.params;
    const { config, model } = req.body; // model: 'deepseek' | 'gemini'

    try {
        const chunk = await prisma.audioChunk.findUnique({
            where: { id: chunkId },
            include: {
                draftSegment: { include: { polishedSegment: true } },
            },
        });

        if (!chunk || chunk.projectId !== projectId) {
            res.status(404).json({ error: 'Chunk not found' });
            return;
        }

        if (!chunk.draftSegment) {
            res.status(400).json({ error: 'Chunk must be transcribed first' });
            return;
        }

        const selectedModel = model || 'deepseek';
        console.log(`[Manual Mode] Polishing chunk ${chunk.index} with ${selectedModel.toUpperCase()}`);

        let polished: string;

        if (selectedModel === 'gemini') {
            // Use Gemini Flash
            polished = await polishChunkGemini({
                previousContext: '',
                currentRawText: chunk.draftSegment.rawText,
                config: config || {},
            });
        } else {
            // Default: Use DeepSeek
            polished = await polishChunk({
                previousContext: '',
                currentRawText: chunk.draftSegment.rawText,
                config: config || {},
            });
        }

        // Upsert polished segment
        await prisma.polishedSegment.upsert({
            where: { draftSegmentId: chunk.draftSegment.id },
            update: {
                polishedText: polished,
                status: 'APPROVED',
            },
            create: {
                draftSegmentId: chunk.draftSegment.id,
                polishedText: polished,
                status: 'APPROVED',
            },
        });

        // Check if all chunks are now polished - update project status
        const allChunks = await prisma.audioChunk.findMany({
            where: { projectId, isSilence: false },
            include: {
                draftSegment: {
                    include: { polishedSegment: true },
                },
            },
        });

        const allPolished = allChunks.every(
            (c) => c.draftSegment?.polishedSegment?.polishedText
        );

        if (allPolished) {
            console.log(`[Manual Mode] All chunks polished. Updating project status to COMPLETED.`);
            await prisma.project.update({
                where: { id: projectId },
                data: {
                    status: 'COMPLETED',
                    checkpoint: 'COMPLETE',
                },
            });
        } else {
            // Ensure project is marked as POLISHING if not already
            await prisma.project.update({
                where: { id: projectId },
                data: { status: 'POLISHING' },
            });
        }

        res.json({ success: true, chunkId, polishedText: polished, model: selectedModel });
    } catch (error: any) {
        console.error('[Manual Mode] Polishing failed:', error.message);
        res.status(500).json({ error: error.message || 'Polishing failed' });
    }
};

export const retrySingleChunk = async (req: Request, res: Response): Promise<void> => {
    const { projectId, chunkId } = req.params;

    try {
        const chunk = await prisma.audioChunk.findUnique({
            where: { id: chunkId },
            include: { draftSegment: { include: { polishedSegment: true } } },
        });

        if (!chunk || chunk.projectId !== projectId) {
            res.status(404).json({ error: 'Chunk not found' });
            return;
        }

        console.log(`[Manual Mode] Retrying chunk ${chunk.index} for project ${projectId}`);

        // Delete existing segments
        if (chunk.draftSegment) {
            await prisma.draftSegment.delete({ where: { id: chunk.draftSegment.id } });
        }

        // Re-transcribe
        const transcription = await transcribeChunk(chunk.filePath);

        // Save new draft segment
        await prisma.draftSegment.create({
            data: {
                chunkId,
                rawText: transcription,
                confidence: 1.0,
                providerResponseJson: JSON.stringify({ source: 'retry' }),
                retryAttempt: (chunk.draftSegment?.retryAttempt || 0) + 1,
            },
        });

        res.json({ success: true, chunkId, transcription });
    } catch (error: any) {
        console.error('[Manual Mode] Retry failed:', error.message);
        res.status(500).json({ error: error.message || 'Retry failed' });
    }
};

// Re-transcription - Clear old data and restart
export const retranscribeProject = async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { mode } = req.body; // 'SOLO' or 'MANUAL'

    try {
        // 1. Verify project exists
        const project = await prisma.project.findUnique({
            where: { id },
            include: { audioChunks: { include: { draftSegment: { include: { polishedSegment: true } } } } },
        });

        if (!project) {
            res.status(404).json({ error: 'Project not found' });
            return;
        }

        console.log(`[Retranscribe] Starting re-transcription for project ${id}`);

        // 2. Delete all polished segments first (due to foreign key constraints)
        const polishedCount = await prisma.polishedSegment.deleteMany({
            where: {
                draftSegment: {
                    audioChunk: {
                        projectId: id,
                    },
                },
            },
        });

        console.log(`[Retranscribe] Deleted ${polishedCount.count} polished segments`);

        // 3. Delete all draft segments
        const draftCount = await prisma.draftSegment.deleteMany({
            where: {
                audioChunk: {
                    projectId: id,
                },
            },
        });

        console.log(`[Retranscribe] Deleted ${draftCount.count} draft segments`);

        // 4. Reset project status (keep audio chunks and files)
        const updatedProject = await prisma.project.update({
            where: { id },
            data: {
                status: 'UPLOADED',
                checkpoint: 'CHUNKED', // Audio is already split
                mode: mode || 'MANUAL',
            },
        });

        console.log(`[Retranscribe] Project status reset to UPLOADED/CHUNKED`);

        // 5. If Solo Mode requested, auto-start
        if (mode === 'SOLO') {
            console.log(`[Retranscribe] Auto-starting Solo Mode`);
            // Call the Solo Mode service
            await executeSoloPipeline(id);
        }

        res.json({
            success: true,
            message: 'Project reset for re-transcription',
            project: updatedProject,
            deletedSegments: {
                drafts: draftCount.count,
                polished: polishedCount.count,
            },
        });
    } catch (error: any) {
        console.error('[Retranscribe] Error:', error.message);
        res.status(500).json({ error: error.message || 'Re-transcription failed' });
    }
};