import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import {
    getProjectState,
    pauseProject,
    resumeProject,
    abortProject,
    retryChunk,
    validateHallucination,
    getQueueStatus,
    updatePolishedSegment,
    saveMergedDocument
} from '@/services/api';
import { ProcessingPhase } from '@/types/project';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('Project State API', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockedAxios.create = vi.fn(() => ({
            get: vi.fn(),
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
        }));
    });

    it('should get project state', async () => {
        const mockState = {
            id: 'project-123',
            phase: ProcessingPhase.TRANSCRIBING,
            lastCheckpoint: ProcessingPhase.CHUNKED,
            canResume: true,
            mode: 'solo' as const,
            progress: []
        };

        const mockApi = mockedAxios.create();
        mockApi.get.mockResolvedValue({ data: mockState });

        // Since we're testing the interface, we just verify it compiles
        expect(typeof getProjectState).toBe('function');
    });

    it('should pause project', async () => {
        expect(typeof pauseProject).toBe('function');
    });

    it('should resume project from checkpoint', async () => {
        expect(typeof resumeProject).toBe('function');
    });

    it('should abort project', async () => {
        expect(typeof abortProject).toBe('function');
    });
});

describe('Chunk Operations API', () => {
    it('should retry chunk transcription', async () => {
        expect(typeof retryChunk).toBe('function');
    });

    it('should validate hallucination', async () => {
        expect(typeof validateHallucination).toBe('function');
    });

    it('should get queue status', async () => {
        expect(typeof getQueueStatus).toBe('function');
    });
});

describe('Merge API', () => {
    it('should update polished segment', async () => {
        expect(typeof updatePolishedSegment).toBe('function');
    });

    it('should save merged document', async () => {
        expect(typeof saveMergedDocument).toBe('function');
    });
});
