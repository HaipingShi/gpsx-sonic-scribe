import React from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

export interface ChunkCardProps {
    chunk: {
        id: string;
        index: number;
        status: 'PENDING' | 'TRANSCRIBING' | 'TRANSCRIBED' | 'VALIDATED' | 'FAILED';
        hasHallucination?: boolean;
        startTime: number;
        endTime: number;
        retryCount?: number;
    };
    isActive?: boolean;
    onClick?: () => void;
    onRetry?: () => void;
    mode?: 'SOLO' | 'MANUAL';
    onTranscribe?: () => void;
    onPolish?: () => void;
    isProcessing?: boolean;
}

interface StatusItem {
    icon: string;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    animate?: boolean;
}

const STATUS_CONFIG: Record<string, StatusItem> = {
    PENDING: {
        icon: '○',
        color: 'text-slate-600',
        bgColor: 'bg-black',
        borderColor: 'border-white/5',
        label: 'PENDING',
    },
    TRANSCRIBING: {
        icon: '>',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/5',
        borderColor: 'border-blue-500/20',
        label: 'IN_TRANSIT',
        animate: true,
    },
    TRANSCRIBED: {
        icon: '○',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/5',
        borderColor: 'border-amber-500/20',
        label: 'RAWDATA',
    },
    VALIDATED: {
        icon: '●',
        color: 'text-[#00ff88]',
        bgColor: 'bg-[#00ff88]/5',
        borderColor: 'border-[#00ff88]/20',
        label: 'CLEAN_ASSET',
    },
    FAILED: {
        icon: '!',
        color: 'text-red-500',
        bgColor: 'bg-red-500/5',
        borderColor: 'border-red-500/30',
        label: 'ERR_DUMP',
    },
};

const ChunkCard: React.FC<ChunkCardProps> = ({
    chunk,
    isActive = false,
    onClick,
    onRetry,
    mode = 'SOLO',
    onTranscribe,
    onPolish,
    isProcessing = false,
}) => {
    const status = STATUS_CONFIG[chunk.status];
    const duration = chunk.endTime - chunk.startTime;
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);

    const handleClick = (e: React.MouseEvent) => {
        if (onClick && !isProcessing) {
            const target = e.target as HTMLElement;
            if (!target.closest('button')) {
                onClick();
            }
        }
    };

    return (
        <div
            onClick={handleClick}
            className={cn(
                'group relative p-5 border transition-all duration-300 cursor-pointer overflow-hidden font-mono',
                'bg-black',
                status.borderColor,

                isActive
                    ? 'border-[#00ff88]/60 shadow-[0_0_20px_rgba(0,255,136,0.1)] scale-[1.02] z-10 after:absolute after:top-0 after:left-0 after:w-1 after:h-full after:bg-[#00ff88]'
                    : 'hover:border-white/20 hover:bg-white/[0.02]',
            )}
        >
            {/* Background scanline effect for active card */}
            {isActive && <div className="gpsx-scanline opacity-20"></div>}

            <div className="flex items-center justify-between mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className={cn(
                        'flex items-center justify-center w-8 h-8 border font-black text-[10px] tracking-tighter transition-all',
                        isActive ? 'border-[#00ff88]/50 text-[#00ff88] bg-[#00ff88]/10' : 'border-white/10 text-slate-500 bg-white/[0.02]'
                    )}>
                        {chunk.index.toString().padStart(2, '0')}
                    </div>

                    <div className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.1em]">
                        {formatTime(chunk.startTime)} {' > '} {formatTime(chunk.endTime)}
                    </div>
                </div>

                <div className={cn(
                    'flex items-center gap-2',
                    status.animate && 'animate-pulse'
                )}>
                    <span className={cn('text-[9px] font-black uppercase tracking-widest', status.color)}>
                        {status.label}
                    </span>
                    <span className={cn('text-xs font-bold leading-none', status.color)}>
                        {status.icon}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4 relative z-10">
                <div className="text-[9px] text-slate-700 font-bold uppercase tracking-widest flex items-center gap-2">
                    <span className="opacity-20">//</span>
                    <span>LEN_{minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}</span>
                </div>

                {chunk.retryCount && chunk.retryCount > 0 && (
                    <div className="text-[9px] text-amber-500/60 font-black uppercase tracking-widest flex items-center gap-1">
                        <span className="animate-spin-slow">◌</span>
                        RETRY_{chunk.retryCount}/3
                    </div>
                )}
            </div>

            {chunk.hasHallucination && (
                <div className="mt-4 p-3 border border-amber-500/30 bg-amber-500/5 relative overflow-hidden group/warn">
                    <div className="flex items-start gap-3 relative z-10">
                        <span className="text-amber-500 text-xs font-black">!</span>
                        <div className="flex-1">
                            <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em]">
                                Semantic_Anomaly_Detected
                            </p>
                        </div>
                    </div>
                    <div className="absolute inset-0 bg-amber-500/10 translate-x-[-100%] group-hover/warn:translate-x-[0%] transition-transform duration-700"></div>
                </div>
            )}

            {mode === 'MANUAL' && !isProcessing && (
                <div className="mt-5 flex gap-2 relative z-10">
                    {chunk.status === 'PENDING' && onTranscribe && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onTranscribe();
                            }}
                            className="gpsx-button flex-1 py-1.5"
                        >
                            Run_ASR
                        </button>
                    )}

                    {(chunk.status === 'TRANSCRIBED' || chunk.status === 'VALIDATED') && onPolish && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onPolish();
                            }}
                            className="gpsx-button flex-1 py-1.5"
                        >
                            {chunk.status === 'VALIDATED' ? 'Re_Clean' : 'CLEAN'}
                        </button>
                    )}

                    {chunk.status === 'FAILED' && onRetry && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRetry();
                            }}
                            className="gpsx-button flex-1 py-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                        >
                            RETRY
                        </button>
                    )}
                </div>
            )}

            {isProcessing && (
                <div className="mt-5 flex items-center justify-center gap-3 py-2 border border-[#00ff88]/20 bg-[#00ff88]/5 relative z-10 overflow-hidden">
                    <RefreshCw size={12} className="animate-spin text-[#00ff88]" />
                    <span className="text-[9px] text-[#00ff88] font-black uppercase tracking-widest">Processing_Core...</span>
                    <div className="absolute bottom-0 left-0 h-[1px] bg-[#00ff88] animate-progress-indefinite w-1/2"></div>
                </div>
            )}

            {mode === 'SOLO' && chunk.status === 'FAILED' && onRetry && !isProcessing && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRetry();
                    }}
                    className="mt-5 w-full gpsx-button py-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                >
                    [ RESTART_SEQUENCE ]
                </button>
            )}
        </div>
    );
};

function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default ChunkCard;
