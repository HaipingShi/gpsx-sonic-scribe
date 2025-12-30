/**
 * Chunk State Types
 * Defines chunk-level processing states and retry logic
 */

export type ChunkPhase =
    | 'pending'
    | 'transcribing'
    | 'validating'
    | 'polishing'
    | 'complete'
    | 'failed';

export interface Status {
    status: 'pending' | 'running' | 'complete' | 'failed';
}

export interface ChunkState {
    id: string;
    phase: ChunkPhase;
    retryCount: number;
    transcribeStatus: Status;
    validateStatus: Status;
    polishStatus: Status;
    error?: string;
}

export interface ChunkRetryState {
    chunkId: string;
    attempts: number;
    maxAttempts: number;
    status: 'pending' | 'validating' | 'retry' | 'verified' | 'failed';
    lastError?: string;
}

export interface Segment {
    startTime: number;
    endTime: number;
    text: string;
}

export interface Chunk {
    id: string;
    startTime: number;
    endTime: number;
    status: 'PENDING' | 'TRANSCRIBED' | 'POLISHED';
    draftSegments: Segment[];
    polishedSegments: Segment[];
}
