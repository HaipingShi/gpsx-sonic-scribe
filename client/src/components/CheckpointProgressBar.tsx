import React from 'react';
import { cn } from '@/lib/utils';

interface CheckpointProgressBarProps {
    currentCheckpoint: string;
    progress?: { completed: number; total: number };
    compact?: boolean;
}

const CHECKPOINTS = [
    { key: 'UPLOADED', label: 'INGEST' },
    { key: 'COMPRESSED', label: 'COMPRESS' },
    { key: 'CHUNKED', label: 'SPLIT' },
    { key: 'TRANSCRIBED', label: 'ASR_SYNC' },
    { key: 'VALIDATED', label: 'LOGIC' },
    { key: 'POLISHED', label: 'REFINE' },
    { key: 'MERGED', label: 'ARCHIVE' },
    { key: 'COMPLETE', label: 'COMPLETE' },
] as const;

export const CheckpointProgressBar: React.FC<CheckpointProgressBarProps> = ({
    currentCheckpoint,
    progress,
    compact = false,
}) => {
    const currentIndex = CHECKPOINTS.findIndex(c => c.key === currentCheckpoint);

    const getCheckpointStatus = (index: number): 'complete' | 'active' | 'pending' => {
        if (index < currentIndex) return 'complete';
        if (index === currentIndex) return 'active';
        return 'pending';
    };

    if (compact) {
        return (
            <div className="flex items-center gap-1.5 font-mono">
                {CHECKPOINTS.map((checkpoint, index) => {
                    const status = getCheckpointStatus(index);
                    return (
                        <div
                            key={checkpoint.key}
                            className={cn(
                                'w-3 h-1',
                                status === 'complete' ? 'bg-[#00ff88]' :
                                    status === 'active' ? 'bg-blue-400 animate-pulse' : 'bg-white/5'
                            )}
                            title={checkpoint.label}
                        />
                    );
                })}
            </div>
        );
    }

    return (
        <div className="w-full font-mono py-4">
            <div className="flex items-center justify-between w-full">
                {CHECKPOINTS.map((checkpoint, index) => {
                    const status = getCheckpointStatus(index);
                    const isLast = index === CHECKPOINTS.length - 1;

                    return (
                        <React.Fragment key={checkpoint.key}>
                            <div className="flex flex-col items-center group">
                                {/* Status Icon */}
                                <div className={cn(
                                    'w-2 h-2 border transform rotate-45 transition-all duration-500',
                                    status === 'complete'
                                        ? 'bg-[#00ff88] border-[#00ff88] shadow-[0_0_10px_#00ff88]'
                                        : status === 'active'
                                            ? 'bg-blue-400 border-blue-400 animate-pulse'
                                            : 'bg-transparent border-white/20'
                                )} />

                                {/* Label */}
                                <div className="mt-4 flex flex-col items-center">
                                    <span className={cn(
                                        'text-[9px] font-black uppercase tracking-[0.2em] transition-colors',
                                        status === 'complete'
                                            ? 'text-[#00ff88]'
                                            : status === 'active'
                                                ? 'text-white'
                                                : 'text-slate-700'
                                    )}>
                                        [{checkpoint.label}]
                                    </span>
                                    {status === 'active' && progress && (
                                        <span className="text-[8px] text-blue-400 font-bold mt-1">
                                            {Math.round((progress.completed / progress.total) * 100)}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Connector */}
                            {!isLast && (
                                <div className="flex-1 px-2 mb-8">
                                    <div className={cn(
                                        'h-[1px] w-full transition-all duration-700',
                                        index < currentIndex
                                            ? 'bg-[#00ff88]/30'
                                            : index === currentIndex
                                                ? 'bg-gradient-to-r from-blue-400/30 to-white/5'
                                                : 'bg-white/5'
                                    )} />
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default CheckpointProgressBar;
