import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import AudioPlayer from '@/components/AudioPlayer';
import { countWords } from '@/utils/textStats';
import { ArrowLeft, Copy, Download, FileText, Layout, Columns, AlertCircle, Loader2 } from 'lucide-react';

interface ChunkData {
    index: number;
    chunkId: string;
    audioPath: string;
    durationMs: number;
    rawText: string;
    polishedText: string;
    status: string;
    hasRepetition: boolean;
}

interface MergedDocument {
    projectId: string;
    status: string;
    checkpoint: string;
    chunks: ChunkData[];
    merged: {
        raw: string;
        polished: string;
    };
    finalDocumentPath?: string;
}

const API_BASE = 'http://localhost:3001/api';

const MergePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [document, setDocument] = useState<MergedDocument | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'comparison' | 'merged'>('comparison');
    const [selectedChunk, setSelectedChunk] = useState<number | null>(null);

    useEffect(() => {
        fetchMergedDocument();
    }, [id]);

    const fetchMergedDocument = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_BASE}/projects/${id}/merged`);
            if (!response.ok) throw new Error('ERR: DATA_RETRIEVAL_FAILED');
            const data = await response.json();
            setDocument(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = (format: 'txt' | 'md') => {
        if (!document || !id) return;
        const content = format === 'md'
            ? `# GPSX_REFINEMENT_LOG\n\n${document.merged.polished}`
            : document.merged.polished;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = window.document.createElement('a');
        a.href = url;
        a.download = `GPSX_CLEAN_ASSET_${id.slice(0, 8)}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const copyToClipboard = async () => {
        if (!document) return;
        await navigator.clipboard.writeText(document.merged.polished);
        // Using alert for now, but in a real app would use a toast
        alert('数据已成功复制到剪贴板');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono p-8">
                <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin mb-4" />
                <p className="text-[#00ff88] text-sm font-black uppercase tracking-widest">正在同步合并节点数据流...</p>
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center font-mono p-8">
                <AlertCircle className="w-12 h-12 text-red-500 mb-6" />
                <div className="text-red-500 text-xl font-black uppercase tracking-widest">{error || '错误：资产不存在'}</div>
                <button onClick={() => navigate(-1)} className="mt-8 text-slate-500 hover:text-white uppercase text-sm font-black">&lt; 返回系统主页</button>
            </div>
        );
    }

    const validChunks = document.chunks.filter(c => c.rawText || c.polishedText);
    const totalWords = countWords(document.merged.polished);

    return (
        <div className="min-h-screen bg-black font-mono">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-black border-b border-white/5 backdrop-blur-md bg-black/80">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={() => navigate(-1)}
                                className="text-slate-500 hover:text-[#00ff88] transition-colors"
                            >
                                <ArrowLeft size={24} />
                            </button>
                            <div>
                                <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-4">
                                    数据整合中心
                                    <span className="text-[11px] bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 px-2 py-0.5 font-black">运行中</span>
                                </h1>
                                <p className="text-[12px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                                    [ ID: {id?.slice(0, 12)}... ] | {validChunks.length} 切片已恢复 | ~{totalWords.toLocaleString()} 字符数
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* View Mode Toggle */}
                            <div className="flex border border-white/5 bg-black p-1">
                                <button
                                    onClick={() => setViewMode('comparison')}
                                    className={cn(
                                        'px-4 py-2 text-[12px] font-black uppercase tracking-widest transition-all',
                                        viewMode === 'comparison'
                                            ? 'bg-white text-black'
                                            : 'text-slate-500 hover:text-white'
                                    )}
                                >
                                    <Columns size={14} className="inline mr-2" /> 对比视图
                                </button>
                                <button
                                    onClick={() => setViewMode('merged')}
                                    className={cn(
                                        'px-4 py-2 text-[12px] font-black uppercase tracking-widest transition-all',
                                        viewMode === 'merged'
                                            ? 'bg-white text-black'
                                            : 'text-slate-500 hover:text-white'
                                    )}
                                >
                                    <Layout size={14} className="inline mr-2" /> 合并视图
                                </button>
                            </div>

                            <div className="h-8 w-[1px] bg-white/5" />

                            {/* Export Buttons */}
                            <button
                                onClick={copyToClipboard}
                                className="gpsx-button"
                            >
                                <Copy size={14} className="mr-2" /> 拷贝全文
                            </button>
                            <button
                                onClick={() => handleExport('txt')}
                                className="px-4 py-2 bg-[#00ff88] text-black text-[12px] font-black uppercase tracking-widest hover:bg-white transition-all shadow-[0_0_15px_rgba(0,255,136,0.2)]"
                            >
                                <Download size={14} className="mr-2 inline" /> 导出 TXT
                            </button>
                            <button
                                onClick={() => handleExport('md')}
                                className="px-4 py-2 border border-blue-500 text-blue-500 text-[12px] font-black uppercase tracking-widest hover:bg-blue-500 hover:text-white transition-all"
                            >
                                <Download size={14} className="mr-2 inline" /> 导出 MD
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-8 py-10">
                {viewMode === 'comparison' ? (
                    /* Dual-Window Comparison View */
                    <div className="grid grid-cols-2 gap-8 h-[calc(100vh-250px)]">
                        {/* Left Panel: Raw Text */}
                        <div className="bg-[#050505] border border-white/5 flex flex-col relative overflow-hidden group">
                            <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                            <div className="px-6 py-4 bg-black border-b border-white/5 flex items-center justify-between">
                                <h2 className="text-[12px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-1 bg-blue-400" /> 原始 ASR 输入
                                </h2>
                                <span className="text-[11px] text-slate-700 font-bold uppercase">识别源: WHISPER_V3</span>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                                {validChunks.map((chunk) => (
                                    <div
                                        key={`raw-${chunk.chunkId}`}
                                        className={cn(
                                            'p-6 border-b border-white/5 cursor-pointer transition-all',
                                            selectedChunk === chunk.index
                                                ? 'bg-blue-400/5 border-l-2 border-l-blue-400'
                                                : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                                        )}
                                        onClick={() => setSelectedChunk(chunk.index)}
                                    >
                                        <div className="flex items-center gap-3 mb-4">
                                            <span className="text-[11px] font-black text-slate-500 border border-white/10 px-1.5 py-0.5 uppercase">
                                                数据区块_{String(chunk.index).padStart(3, '0')}
                                            </span>
                                            {chunk.hasRepetition && (
                                                <span className="text-[11px] font-black text-amber-500 px-1.5 py-0.5 border border-amber-500/20 uppercase tracking-tighter animate-pulse">
                                                    [!] 检测到重复内容
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-slate-400 text-sm leading-relaxed uppercase tracking-wide">
                                            {chunk.rawText || '// 暂无内容'}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Panel: Polished Text */}
                        <div className="bg-[#050505] border border-white/5 flex flex-col relative overflow-hidden group">
                            <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                            <div className="px-6 py-4 bg-black border-b border-white/5 flex items-center justify-between">
                                <h2 className="text-[12px] font-black text-[#00ff88] uppercase tracking-widest flex items-center gap-2">
                                    <div className="w-1 h-1 bg-[#00ff88] animate-pulse" /> 精炼输出结果
                                </h2>
                                <span className="text-[11px] text-[#00ff88]/40 font-bold uppercase">处理器: Google Gemini 3 Flash</span>
                            </div>
                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                                {validChunks.map((chunk) => (
                                    <div
                                        key={`polished-${chunk.chunkId}`}
                                        className={cn(
                                            'p-6 border-b border-white/5 transition-all',
                                            selectedChunk === chunk.index
                                                ? 'bg-[#00ff88]/5 border-l-2 border-l-[#00ff88]'
                                                : 'border-l-2 border-l-transparent'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[11px] font-black text-[#00ff88] border border-[#00ff88]/20 px-1.5 py-0.5 uppercase">
                                                精炼索引_{String(chunk.index).padStart(3, '0')}
                                            </span>
                                            <span className={cn(
                                                'text-[11px] font-black uppercase tracking-widest px-2 py-0.5 border',
                                                chunk.status === 'APPROVED' || chunk.status === 'POLISHED'
                                                    ? 'border-[#00ff88]/20 text-[#00ff88]'
                                                    : 'border-amber-500/20 text-amber-500'
                                            )}>
                                                {chunk.status === 'APPROVED' || chunk.status === 'POLISHED' ? '[ 已完成 ]' : '[ 等待中 ]'}
                                            </span>
                                        </div>
                                        <p className="text-white text-base leading-relaxed uppercase tracking-wider">
                                            {chunk.polishedText || chunk.rawText || '// 正在精炼处理中...'}
                                        </p>

                                        {/* Audio Player */}
                                        {chunk.audioPath && (
                                            <div className="mt-6 border border-white/5 bg-black p-4">
                                                <AudioPlayer
                                                    src={`http://localhost:3001${chunk.audioPath}`}
                                                    duration={chunk.durationMs / 1000}
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Merged View */
                    <div className="bg-[#050505] border border-white/5 p-10 relative overflow-hidden group">
                        <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                            <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-4">
                                <FileText size={20} className="text-[#00ff88]" />
                                主精炼存档存档中心
                            </h2>
                            <div className="text-[11px] text-slate-700 font-bold uppercase tracking-widest">
                                序号标识: {id?.toUpperCase()}
                            </div>
                        </div>

                        <div className="max-w-4xl mx-auto py-10">
                            <div className="text-white text-base leading-relaxed uppercase tracking-widest whitespace-pre-wrap font-medium">
                                {document.merged.polished}
                            </div>
                        </div>

                        {/* Stats Panel */}
                        <div className="mt-16 pt-8 border-t border-white/5">
                            <div className="grid grid-cols-4 gap-8">
                                <div className="text-center group/stat">
                                    <div className="text-sm font-black text-slate-600 uppercase tracking-widest mb-2 group-hover/stat:text-[#00ff88] transition-colors">切片总量</div>
                                    <div className="text-3xl font-black text-white">{validChunks.length}</div>
                                </div>
                                <div className="text-center group/stat">
                                    <div className="text-sm font-black text-slate-600 uppercase tracking-widest mb-2 group-hover/stat:text-blue-400 transition-colors">总字符数</div>
                                    <div className="text-3xl font-black text-white">{totalWords.toLocaleString()}</div>
                                </div>
                                <div className="text-center group/stat">
                                    <div className="text-sm font-black text-slate-600 uppercase tracking-widest mb-2 group-hover/stat:text-[#00ff88] transition-colors">校验效率</div>
                                    <div className="text-3xl font-black text-[#00ff88]">100%</div>
                                </div>
                                <div className="text-center group/stat">
                                    <div className="text-sm font-black text-slate-600 uppercase tracking-widest mb-2 group-hover/stat:text-amber-500 transition-colors">异常检测</div>
                                    <div className="text-3xl font-black text-white">
                                        {validChunks.filter(c => c.hasRepetition).length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MergePage;
