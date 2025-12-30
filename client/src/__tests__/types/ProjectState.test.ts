import { describe, it, expect } from 'vitest';
import { ProcessingPhase, ProjectState, PhaseProgress } from '@/types/project';

describe('ProcessingPhase Enum', () => {
    it('should define all required upload phases', () => {
        expect(ProcessingPhase.UPLOADED).toBe('UPLOADED');
        expect(ProcessingPhase.COMPRESSED).toBe('COMPRESSED');
        expect(ProcessingPhase.CHUNKED).toBe('CHUNKED');
    });

    it('should define all required transcription phases', () => {
        expect(ProcessingPhase.TRANSCRIBING).toBe('TRANSCRIBING');
        expect(ProcessingPhase.TRANSCRIBED).toBe('TRANSCRIBED');
        expect(ProcessingPhase.VALIDATED).toBe('VALIDATED');
    });

    it('should define all required polishing phases', () => {
        expect(ProcessingPhase.POLISHING).toBe('POLISHING');
        expect(ProcessingPhase.POLISHED).toBe('POLISHED');
    });

    it('should define finalization phases', () => {
        expect(ProcessingPhase.MERGED).toBe('MERGED');
        expect(ProcessingPhase.COMPLETE).toBe('COMPLETE');
    });

    it('should define error and control phases', () => {
        expect(ProcessingPhase.FAILED).toBe('FAILED');
        expect(ProcessingPhase.PAUSED).toBe('PAUSED');
        expect(ProcessingPhase.TRANSCRIBED_PARTIAL).toBe('TRANSCRIBED_PARTIAL');
        expect(ProcessingPhase.BLOCKED).toBe('BLOCKED');
    });
});

describe('ProjectState Interface', () => {
    it('should create valid project state with all required fields', () => {
        const state: ProjectState = {
            id: 'project-123',
            phase: ProcessingPhase.TRANSCRIBING,
            lastCheckpoint: ProcessingPhase.CHUNKED,
            canResume: true,
            mode: 'solo',
            progress: []
        };

        expect(state.phase).toBe(ProcessingPhase.TRANSCRIBING);
        expect(state.lastCheckpoint).toBe(ProcessingPhase.CHUNKED);
        expect(state.canResume).toBe(true);
        expect(state.mode).toBe('solo');
    });

    it('should support manual mode', () => {
        const state: ProjectState = {
            id: 'project-456',
            phase: ProcessingPhase.POLISHING,
            lastCheckpoint: ProcessingPhase.TRANSCRIBED,
            canResume: false,
            mode: 'manual',
            progress: []
        };

        expect(state.mode).toBe('manual');
    });

    it('should include optional pause reason', () => {
        const state: ProjectState = {
            id: 'project-789',
            phase: ProcessingPhase.PAUSED,
            lastCheckpoint: ProcessingPhase.TRANSCRIBED,
            canResume: true,
            mode: 'solo',
            pauseReason: 'Hallucinations detected. Manual review required.',
            progress: []
        };

        expect(state.pauseReason).toBe('Hallucinations detected. Manual review required.');
    });

    it('should track metadata', () => {
        const state: ProjectState = {
            id: 'project-abc',
            phase: ProcessingPhase.COMPLETE,
            lastCheckpoint: ProcessingPhase.MERGED,
            canResume: false,
            mode: 'solo',
            progress: [],
            metadata: {
                originalSize: 120_000_000,
                compressedSize: 30_000_000,
                duration: 6300,
                chunkCount: 11,
                wordCount: 15234,
                processingTime: 720000
            }
        };

        expect(state.metadata?.chunkCount).toBe(11);
        expect(state.metadata?.wordCount).toBe(15234);
    });
});

describe('PhaseProgress Interface', () => {
    it('should track phase progress', () => {
        const progress: PhaseProgress = {
            phase: ProcessingPhase.TRANSCRIBING,
            status: 'running',
            startedAt: new Date('2025-12-28T00:00:00Z'),
            chunksComplete: 7,
            chunksTotal: 10
        };

        expect(progress.phase).toBe(ProcessingPhase.TRANSCRIBING);
        expect(progress.status).toBe('running');
        expect(progress.chunksComplete).toBe(7);
        expect(progress.chunksTotal).toBe(10);
    });

    it('should support completed phase', () => {
        const progress: PhaseProgress = {
            phase: ProcessingPhase.POLISHED,
            status: 'complete',
            startedAt: new Date('2025-12-28T00:00:00Z'),
            completedAt: new Date('2025-12-28T00:10:00Z'),
            chunksComplete: 10,
            chunksTotal: 10
        };

        expect(progress.status).toBe('complete');
        expect(progress.completedAt).toBeDefined();
    });
});
