/**
 * Processing Phase State Machine
 * Defines all possible phases in the audio processing pipeline
 */
export enum ProcessingPhase {
    // Upload Phase
    UPLOADED = 'UPLOADED',
    COMPRESSED = 'COMPRESSED',
    CHUNKED = 'CHUNKED',

    // Transcription Phase
    TRANSCRIBING = 'TRANSCRIBING',
    TRANSCRIBED = 'TRANSCRIBED',
    VALIDATED = 'VALIDATED',

    // Polishing Phase
    POLISHING = 'POLISHING',
    POLISHED = 'POLISHED',

    // Finalization
    MERGED = 'MERGED',
    COMPLETE = 'COMPLETE',

    // Error/Control States
    FAILED = 'FAILED',
    PAUSED = 'PAUSED',
    TRANSCRIBED_PARTIAL = 'TRANSCRIBED_PARTIAL',
    BLOCKED = 'BLOCKED',
}

export type ProcessingMode = 'manual' | 'solo';

export interface ProjectMetadata {
    originalSize: number;
    compressedSize: number;
    duration: number;
    chunkCount: number;
    wordCount: number;
    processingTime: number;
}

export interface PhaseProgress {
    phase: ProcessingPhase;
    status: 'pending' | 'running' | 'complete' | 'failed';
    startedAt?: Date;
    completedAt?: Date;
    chunksComplete?: number;
    chunksTotal?: number;
}

export interface ProjectState {
    id: string;
    phase: ProcessingPhase;
    lastCheckpoint: ProcessingPhase;
    canResume: boolean;
    mode: ProcessingMode;
    pauseReason?: string;
    progress: PhaseProgress[];
    metadata?: ProjectMetadata;
}
