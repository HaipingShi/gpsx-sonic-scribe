import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    getProject,
    getSoloModeStatus,
    Project,
    SoloModeStatus,
    retryChunk,
    transcribeSingleChunk,
    polishSingleChunk,
    resumeSoloMode,
} from '@/services/api';
import ChunkCard from '@/components/Transcribe/ChunkCard';
import SoloPipelineIndicator from '@/components/SoloPipelineIndicator';
import CheckpointProgressBar from '@/components/CheckpointProgressBar';
import { Loader2, FileText, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const TranscribeWorkspace: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [soloStatus, setSoloStatus] = useState<SoloModeStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeChunkId, setActiveChunkId] = useState<string | null>(null);
    const [processingChunks, setProcessingChunks] = useState<Set<string>>(new Set());
    const [isInitialized, setIsInitialized] = useState(false);

    const chunks = useMemo(() => project?.chunks || [], [project]);
    const isSoloMode = project?.mode === 'SOLO' || soloStatus?.mode === 'SOLO';

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 3000);
        return () => clearInterval(interval);
    }, [id]);

    const loadData = async () => {
        if (!id) return;
        try {
            const [projData, solo] = await Promise.all([
                getProject(id).catch(() => null),
                getSoloModeStatus(id).catch(() => null),
            ]);

            if (projData) {
                setProject(projData);
                if (!isInitialized && projData.chunks && projData.chunks.length > 0) {
                    setActiveChunkId(projData.chunks[0].id);
                    setIsInitialized(true);
                }
            }
            if (solo) setSoloStatus(solo);
        } catch (error) {
            console.error('Failed to load transcription data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResume = async () => {
        if (!id) return;
        setLoading(true);
        try {
            await resumeSoloMode(id);
            setSoloStatus(null);
            await loadData();
        } catch (err) {
            console.error('Failed to resume pipeline:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRetry = async (chunkId: string) => {
        if (!id) return;
        try {
            await retryChunk(id, chunkId);
            loadData();
        } catch (err) {
            console.error('Failed to retry chunk:', err);
        }
    };

    const handleTranscribe = async (chunkId: string) => {
        if (!id) return;
        setProcessingChunks(prev => new Set(prev).add(chunkId));
        try {
            await transcribeSingleChunk(id, chunkId);
            await loadData();
        } catch (error) {
            console.error('Failed to transcribe chunk:', error);
        } finally {
            setProcessingChunks(prev => {
                const next = new Set(prev);
                next.delete(chunkId);
                return next;
            });
        }
    };

    const handlePolish = async (chunkId: string) => {
        if (!id) return;
        setProcessingChunks(prev => new Set(prev).add(chunkId));
        try {
            await polishSingleChunk(id, chunkId);
            await loadData();
        } catch (error) {
            console.error('Failed to polish chunk:', error);
        } finally {
            setProcessingChunks(prev => {
                const next = new Set(prev);
                next.delete(chunkId);
                return next;
            });
        }
    };



    const completedChunks = chunks.filter(c => c.status === 'TRANSCRIBED' || c.status === 'POLISHED').length;
    const totalChunks = chunks.length;
    const progressPercent = totalChunks > 0 ? Math.round((completedChunks / totalChunks) * 100) : 0;

    const activeChunk = chunks.find(c => c.id === activeChunkId);

    if (loading && !project) {
        return (
            <div className="flex h-screen items-center justify-center bg-black">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin mx-auto mb-6" />
                    <p className="text-[#00ff88]/40 font-black tracking-widest uppercase text-[12px]">正在建立神经网络链路连接...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-slate-400 font-mono">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-[1600px] mx-auto px-10 py-6">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <div className="flex items-center gap-4">
                                <h1 className="text-2xl font-black text-white tracking-widest gpsx-glow uppercase">
                                    处理工作中心
                                </h1>
                                <div className={cn(
                                    "flex items-center gap-2 px-2.5 py-1 border rounded-sm",
                                    project?.status === 'COMPLETED' ? "bg-[#00ff88]/5 border-[#00ff88]/20" : "bg-amber-500/5 border-amber-500/20"
                                )}>
                                    <div className={cn(
                                        "w-1.5 h-1.5 rounded-full animate-pulse",
                                        project?.status === 'COMPLETED' ? "bg-[#00ff88]" : "bg-amber-500"
                                    )}></div>
                                    <span className={cn(
                                        "text-[11px] font-black uppercase tracking-widest whitespace-nowrap",
                                        project?.status === 'COMPLETED' ? "text-[#00ff88]" : "text-amber-500"
                                    )}>
                                        {project?.status === 'COMPLETED' ? '节点已完成' : '节点运行中'}
                                    </span>
                                </div>

                                {(project?.status === 'POLISHING' || project?.status === 'ERROR' || project?.status === 'DRAFTING') &&
                                    (soloStatus?.polishActive ?? 0) === 0 &&
                                    (soloStatus?.polishPending ?? 0) === 0 &&
                                    (soloStatus?.transcribeActive ?? 0) === 0 &&
                                    (soloStatus?.transcribePending ?? 0) === 0 && (
                                        <button
                                            onClick={handleResume}
                                            disabled={loading}
                                            className="px-3 py-1 border border-[#00ff88]/30 bg-[#00ff88]/5 text-[#00ff88] text-[11px] font-black uppercase tracking-widest hover:bg-[#00ff88]/10 disabled:opacity-50 transition-all flex items-center gap-2"
                                        >
                                            {loading ? <Loader2 size={10} className="animate-spin" /> : <Play size={10} fill="currentColor" />}
                                            手动恢复流水线
                                        </button>
                                    )}
                            </div>
                            <div className="flex items-center gap-3 text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>资产位址: {id?.slice(0, 8)}...</span>
                                <span>||</span>
                                <span className="text-slate-400">{project?.originalFilename}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => navigate(`/transcribe/${id}/merge`)}
                                className="group flex items-center gap-3 px-6 py-2 border border-[#00ff88]/20 hover:border-[#00ff88]/40 bg-[#00ff88]/5 hover:bg-[#00ff88]/10 text-[#00ff88] transition-all"
                            >
                                <FileText size={16} className="group-hover:scale-110 transition-transform" />
                                <span className="text-xs font-black uppercase tracking-widest">查看合并结果</span>
                            </button>
                            <div className="px-4 py-2 border border-white/10 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                节点状态: <span className="text-white">
                                    {(() => {
                                        const statusMap: Record<string, string> = {
                                            'UPLOADED': '已上传',
                                            'TRANSCRIBING': '转写中',
                                            'TRANSCRIBED': '转写完成',
                                            'POLISHING': '智能精炼中',
                                            'POLISHED': '精炼完成',
                                            'COMPLETED': '已归档',
                                            'ERROR': '处理异常',
                                            'FAILED': '执行失败'
                                        };
                                        return statusMap[project?.status || ''] || project?.status;
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {isSoloMode && soloStatus?.checkpoint && (
                        <div className="mt-8">
                            <CheckpointProgressBar currentCheckpoint={soloStatus.checkpoint} />
                        </div>
                    )}
                </div>
            </header>

            <div className="max-w-[1700px] mx-auto px-10 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left: Chunk Sidebar */}
                    <div className="lg:col-span-3">
                        <div className="bg-[#050505] border border-white/5 p-6 h-[calc(100vh-18rem)] flex flex-col">
                            <h2 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-8 flex items-center gap-3">
                                <div className="w-2 h-2 border border-[#00ff88]/40 flex items-center justify-center">
                                    <div className="w-1 h-1 bg-[#00ff88]"></div>
                                </div>
                                切片数据流
                            </h2>

                            <div className="flex-1 overflow-y-auto pr-3 custom-scrollbar space-y-3">
                                {chunks.map((chunk, idx) => (
                                    <ChunkCard
                                        key={chunk.id}
                                        chunk={{
                                            ...chunk,
                                            index: idx + 1,
                                            status: chunk.status === 'POLISHED' ? 'VALIDATED' : chunk.status as any
                                        }}
                                        isActive={activeChunkId === chunk.id}
                                        onClick={() => setActiveChunkId(chunk.id)}
                                        onRetry={() => handleRetry(chunk.id)}
                                        mode={isSoloMode ? 'SOLO' : 'MANUAL'}
                                        onTranscribe={() => handleTranscribe(chunk.id)}
                                        onPolish={() => handlePolish(chunk.id)}
                                        isProcessing={processingChunks.has(chunk.id)}
                                    />
                                ))}
                                {chunks.length === 0 && (
                                    <div className="text-center py-20 border border-dashed border-white/5">
                                        <AlertCircle className="w-6 h-6 text-slate-800 mx-auto mb-4" />
                                        <p className="text-[11px] font-black text-slate-700 tracking-widest uppercase italic">暂无切片数据流</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right: Content Area */}
                    <div className="lg:col-span-9 space-y-8">
                        {isSoloMode && soloStatus && (
                            <SoloPipelineIndicator status={soloStatus} />
                        )}

                        {/* Chunk Content View */}
                        <div className="bg-[#050505] border border-white/5 min-h-[500px] relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00ff88]/20 to-transparent"></div>

                            {activeChunk ? (
                                <div className="p-10">
                                    <div className="flex items-center justify-between mb-12">
                                        <div className="flex items-center gap-6">
                                            <div className="w-12 h-12 border border-[#00ff88]/20 flex items-center justify-center bg-[#00ff88]/5 group-hover:border-[#00ff88]/40 transition-all">
                                                <span className="text-lg font-black text-[#00ff88] gpsx-glow">
                                                    {(chunks.indexOf(activeChunk) + 1).toString().padStart(2, '0')}
                                                </span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white tracking-widest uppercase">神经网络处理输出</h3>
                                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1">处理状态: {activeChunk.status}</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 border border-white/10 text-[11px] font-black text-slate-500 uppercase tracking-widest bg-black">
                                            十六进制标识: {activeChunk.id.slice(0, 12)}
                                        </div>
                                    </div>

                                    <div className="space-y-12">
                                        <div className="space-y-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${activeChunk.polishedSegments?.[0]?.text ? 'bg-[#00ff88] shadow-[0_0_5px_#00ff88]' : 'bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]'}`} />
                                                <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">
                                                    {activeChunk.polishedSegments?.[0]?.text ? '智能精炼资产' : '待处理转写队列'}
                                                </h4>
                                            </div>
                                            <div className={`p-8 border min-h-[160px] text-lg leading-[1.8] font-bold tracking-tight transition-all ${activeChunk.polishedSegments?.[0]?.text
                                                ? 'bg-[#00ff88]/[0.02] border-[#00ff88]/20 text-white'
                                                : 'bg-white/[0.02] border-white/10 text-slate-500'
                                                }`}>
                                                {activeChunk.polishedSegments?.[0]?.text || activeChunk.draftSegments?.[0]?.text || (
                                                    <div className="flex items-center gap-3">
                                                        <Loader2 className="w-4 h-4 animate-spin text-[#00ff88]/40" />
                                                        <span className="text-slate-600 text-base uppercase italic tracking-widest">正在等待数据流输入...</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 bg-slate-800 rounded-full" />
                                                <h4 className="text-[12px] font-black text-slate-500 uppercase tracking-widest">
                                                    原始 ASR 系统识别源码
                                                </h4>
                                            </div>
                                            <div className="p-8 bg-black/50 border border-white/5 text-slate-500 leading-relaxed font-mono text-sm uppercase tracking-wide">
                                                {activeChunk.draftSegments?.[0]?.text || "[ 暂无有效数据源 ]"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center py-40 text-center">
                                    <div className="w-20 h-20 border border-white/5 flex items-center justify-center mb-10 group-hover:border-[#00ff88]/10 transition-all bg-white/[0.01]">
                                        <AlertCircle size={32} className="text-slate-800" />
                                    </div>
                                    <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest">未发现选定的处理切片</h3>
                                    <p className="text-[11px] text-slate-700 font-bold uppercase tracking-widest mt-3">请在左侧列表中选择一个切片以查看详情</p>
                                </div>
                            )}
                        </div>

                        {/* Overall Progress */}
                        <div className="bg-[#050505] border border-white/5 p-8 relative overflow-hidden">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest">系统总处理吞吐量</h3>
                                <span className="text-[#00ff88] font-black gpsx-glow text-base">{progressPercent}%</span>
                            </div>
                            <div className="w-full bg-black border border-white/5 h-1.5 overflow-hidden">
                                <div
                                    className="h-full bg-[#00ff88] transition-all duration-1000 ease-out shadow-[0_0_15px_#00ff88]"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                            <div className="flex justify-between mt-4 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                                <span>{completedChunks} / {totalChunks} 切片已同步</span>
                                <span>剩余待处理: {totalChunks - completedChunks}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TranscribeWorkspace;
