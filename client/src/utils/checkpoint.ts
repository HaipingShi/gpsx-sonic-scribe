import { ProcessingPhase } from '@/types/project';

/**
 * Checkpoint System Utilities
 * Manages phase transitions and resumability logic
 */

// Phases that can be resumed from (stable checkpoints)
const RESUMABLE_PHASES: ProcessingPhase[] = [
    ProcessingPhase.CHUNKED,
    ProcessingPhase.TRANSCRIBED,
    ProcessingPhase.VALIDATED,
    ProcessingPhase.POLISHED,
    ProcessingPhase.PAUSED,
];

// All checkpoint phases (where state is saved)
const CHECKPOINT_PHASES: ProcessingPhase[] = [
    ProcessingPhase.COMPRESSED,
    ProcessingPhase.CHUNKED,
    ProcessingPhase.TRANSCRIBED,
    ProcessingPhase.VALIDATED,
    ProcessingPhase.POLISHED,
    ProcessingPhase.MERGED,
];

// Phase transition map (stable phase → next processing phase)
const PHASE_TRANSITIONS: Record<ProcessingPhase, ProcessingPhase | null> = {
    [ProcessingPhase.UPLOADED]: ProcessingPhase.COMPRESSED,
    [ProcessingPhase.COMPRESSED]: ProcessingPhase.CHUNKED,
    [ProcessingPhase.CHUNKED]: ProcessingPhase.TRANSCRIBING,
    [ProcessingPhase.TRANSCRIBING]: ProcessingPhase.TRANSCRIBED,
    [ProcessingPhase.TRANSCRIBED]: ProcessingPhase.VALIDATED,
    [ProcessingPhase.VALIDATED]: ProcessingPhase.POLISHING,
    [ProcessingPhase.POLISHING]: ProcessingPhase.POLISHED,
    [ProcessingPhase.POLISHED]: ProcessingPhase.MERGED,
    [ProcessingPhase.MERGED]: ProcessingPhase.COMPLETE,
    [ProcessingPhase.COMPLETE]: null,
    [ProcessingPhase.FAILED]: null,
    [ProcessingPhase.PAUSED]: null, // Resume logic determines next
    [ProcessingPhase.TRANSCRIBED_PARTIAL]: null,
    [ProcessingPhase.BLOCKED]: null,
};

// Valid transitions (allowing control flow changes)
const VALID_TRANSITIONS: Record<ProcessingPhase, ProcessingPhase[]> = {
    [ProcessingPhase.UPLOADED]: [ProcessingPhase.COMPRESSED, ProcessingPhase.FAILED],
    [ProcessingPhase.COMPRESSED]: [ProcessingPhase.CHUNKED, ProcessingPhase.FAILED],
    [ProcessingPhase.CHUNKED]: [ProcessingPhase.TRANSCRIBING, ProcessingPhase.PAUSED, ProcessingPhase.FAILED],
    [ProcessingPhase.TRANSCRIBING]: [ProcessingPhase.TRANSCRIBED, ProcessingPhase.PAUSED, ProcessingPhase.FAILED],
    [ProcessingPhase.TRANSCRIBED]: [ProcessingPhase.VALIDATED, ProcessingPhase.POLISHING, ProcessingPhase.PAUSED, ProcessingPhase.FAILED],
    [ProcessingPhase.VALIDATED]: [ProcessingPhase.POLISHING, ProcessingPhase.PAUSED, ProcessingPhase.FAILED],
    [ProcessingPhase.POLISHING]: [ProcessingPhase.POLISHED, ProcessingPhase.PAUSED, ProcessingPhase.FAILED],
    [ProcessingPhase.POLISHED]: [ProcessingPhase.MERGED, ProcessingPhase.PAUSED, ProcessingPhase.FAILED],
    [ProcessingPhase.MERGED]: [ProcessingPhase.COMPLETE, ProcessingPhase.FAILED],
    [ProcessingPhase.COMPLETE]: [],
    [ProcessingPhase.FAILED]: [],
    [ProcessingPhase.PAUSED]: [], // Can resume to any valid phase
    [ProcessingPhase.TRANSCRIBED_PARTIAL]: [ProcessingPhase.FAILED, ProcessingPhase.BLOCKED],
    [ProcessingPhase.BLOCKED]: [],
};

/**
 * Check if a phase is resumable (can restart processing from this point)
 */
export function isResumableFrom(phase: ProcessingPhase): boolean {
    return RESUMABLE_PHASES.includes(phase);
}

/**
 * Get the next logical phase after current checkpoint
 */
export function getNextPhase(currentPhase: ProcessingPhase): ProcessingPhase | null {
    return PHASE_TRANSITIONS[currentPhase] ?? null;
}

/**
 * Validate if transition from one phase to another is allowed
 */
export function canTransitionTo(from: ProcessingPhase, to: ProcessingPhase): boolean {
    // Always allow transition to PAUSED or FAILED
    if (to === ProcessingPhase.PAUSED || to === ProcessingPhase.FAILED) {
        return true;
    }

    const validTargets = VALID_TRANSITIONS[from] || [];
    return validTargets.includes(to);
}

/**
 * Get all checkpoint phases
 */
export function getCheckpointPhases(): ProcessingPhase[] {
    return [...CHECKPOINT_PHASES];
}

/**
 * Determine if current phase is a checkpoint (stable state)
 */
export function isCheckpointPhase(phase: ProcessingPhase): boolean {
    return CHECKPOINT_PHASES.includes(phase);
}

/**
 * Get phase order index (for progress calculation)
 */
export function getPhaseIndex(phase: ProcessingPhase): number {
    const orderedPhases = [
        ProcessingPhase.UPLOADED,
        ProcessingPhase.COMPRESSED,
        ProcessingPhase.CHUNKED,
        ProcessingPhase.TRANSCRIBING,
        ProcessingPhase.TRANSCRIBED,
        ProcessingPhase.VALIDATED,
        ProcessingPhase.POLISHING,
        ProcessingPhase.POLISHED,
        ProcessingPhase.MERGED,
        ProcessingPhase.COMPLETE,
    ];

    return orderedPhases.indexOf(phase);
}

/**
 * Calculate progress percentage based on current phase
 */
export function calculateProgress(currentPhase: ProcessingPhase): number {
    const index = getPhaseIndex(currentPhase);
    if (index === -1) return 0; // Unknown phase

    const totalPhases = 10; // Total ordered phases
    return Math.round((index / totalPhases) * 100);
}
