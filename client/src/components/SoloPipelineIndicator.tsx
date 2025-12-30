import React from 'react';
import { Activity, AlertCircle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SoloModeStatus } from '@/services/api';

interface SoloPipelineIndicatorProps {
    status: SoloModeStatus;
    compact?: boolean;
}

/**
 * Solo Pipeline Indicator component for real-time pipeline status
 * Shows active/pending counts for each stage and failed chunks
 */
export const SoloPipelineIndicator: React.FC<SoloPipelineIndicatorProps> = ({
    status,
    compact = false,
}) => {
    const stages = [
        {
            label: '神经网络 ASR 解析',
            active: status.transcribeActive,
            pending: status.transcribePending,
            color: 'text-blue-400',
            borderColor: 'border-blue-500/20',
        },
        {
            label: '逻辑幻觉校验',
            active: status.validateActive,
            pending: status.validatePending,
            color: 'text-purple-400',
            borderColor: 'border-purple-500/20',
        },
        {
            label: '认知模型精炼',
            active: status.polishActive,
            pending: status.polishPending,
            color: 'text-[#00ff88]',
            borderColor: 'border-[#00ff88]/20',
        },
    ];

    const totalActive = stages.reduce((sum, s) => sum + s.active, 0);
    const totalPending = stages.reduce((sum, s) => sum + s.pending, 0);
    const hasFailedChunks = status.failedChunks.length > 0;

    if (compact) {
        return (
            <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] font-mono">
                <div className="flex items-center gap-2 text-[#00ff88]">
                    <div className="w-1 h-1 bg-[#00ff88] animate-pulse"></div>
                    <span>{totalActive} 路活动</span>
                </div>
                <span className="text-slate-700">|</span>
                <span className="text-slate-500">{totalPending} 挂起</span>
                {hasFailedChunks && (
                    <>
                        <span className="text-slate-700">|</span>
                        <span className="text-red-500 flex items-center gap-2">
                            <AlertCircle size={10} />
                            {status.failedChunks.length} 异常
                        </span>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-[#020202] border border-white/5 p-6 font-mono relative overflow-hidden group">
            <div className="gpsx-scanline opacity-10 pointer-events-none"></div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-3">
                    <Activity size={14} className="text-[#00ff88] gpsx-glow" />
                    神经网络流水线监控
                </h4>
                <div className="flex items-center gap-3 px-3 py-1 border border-white/10 bg-black">
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">系统校验点:</span>
                    <span className="text-[10px] text-white font-black">{status.checkpoint}</span>
                </div>
            </div>

            {/* Stage Progress */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
                {stages.map((stage) => (
                    <div
                        key={stage.label}
                        className={cn(
                            'p-4 border bg-black transition-all hover:border-white/20',
                            stage.borderColor
                        )}
                    >
                        <div className="flex flex-col gap-3">
                            <span className={cn('text-[10px] font-black uppercase tracking-[0.2em]', stage.color)}>
                                {stage.label}
                            </span>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        'w-5 h-5 border flex items-center justify-center text-[10px] font-black',
                                        stage.active > 0 ? 'bg-white text-black border-white' : 'border-white/10 text-slate-700'
                                    )}>
                                        {stage.active}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">活动中</span>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="w-5 h-5 border border-white/5 bg-white/[0.02] flex items-center justify-center text-[10px] font-black text-slate-600">
                                        {stage.pending}
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">排队中</span>
                                </div>
                            </div>

                            {stage.active > 0 && (
                                <div className="mt-2 h-[1px] w-full bg-white/5 relative overflow-hidden">
                                    <div className={cn('absolute inset-0 translate-x-[-100%] animate-scan-fast', stage.color.replace('text-', 'bg-'))}></div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Failed Chunks */}
            {hasFailedChunks && (
                <div className="mt-6 pt-6 border-t border-white/5 relative z-10">
                    <div className="text-[10px] text-red-500 font-black uppercase tracking-[0.2em] flex items-center gap-3 mb-4">
                        <AlertCircle size={12} />
                        核心数据流异常信息反馈 ({status.failedChunks.length})
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {status.failedChunks.slice(0, 4).map((chunk) => (
                            <div
                                key={chunk.chunkId}
                                className="text-[9px] bg-red-500/5 border border-red-500/20 px-4 py-2 flex items-center justify-between group/err hover:bg-red-500/10 transition-all font-mono"
                            >
                                <span className="text-red-400 font-bold truncate pr-4 opacity-70 group-hover/err:opacity-100 italic" title={chunk.error}>
                                    // 异常描述: {chunk.error.slice(0, 40)}...
                                </span>
                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-[8px] text-red-500/40 font-black uppercase tracking-widest">重试序列:</span>
                                    <span className="text-red-500 font-black">{chunk.retryAttempt}/3</span>
                                    <RotateCcw size={10} className="text-red-500/40" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SoloPipelineIndicator;
