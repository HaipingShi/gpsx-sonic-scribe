import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Upload, FileAudio, X, Zap, Settings, Play, Loader2, CheckCircle, RefreshCw, Hash, ArrowLeft, Check, ChevronRight, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { uploadProject, startSoloMode, getProjects, retranscribeProject, Project } from '@/services/api';
import { cn } from '@/lib/utils';

interface UploadFile {
    id: string;
    file: File;
    status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
    progress: number;
    error?: string;
    projectId?: string;
}

const TranscribeUpload: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isBatchMode = searchParams.get('batch') === 'true';

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<UploadFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [loadingProjects, setLoadingProjects] = useState(false);
    const [config, setConfig] = useState({
        mode: 'solo' as 'solo' | 'manual',
        language: 'auto',
        enablePolish: true,
    });

    // Load recent projects on mount
    useEffect(() => {
        loadRecentProjects();
    }, []);

    const loadRecentProjects = async () => {
        try {
            setLoadingProjects(true);
            const projects = await getProjects();
            // Show only the 5 most recent projects
            const recent = projects
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 5);
            setRecentProjects(recent);
        } catch (error) {
            console.error('Failed to load recent projects:', error);
        } finally {
            setLoadingProjects(false);
        }
    };

    const handleRetranscribe = async (projectId: string) => {
        const confirmed = window.confirm(
            '重新转写将清空该文件的当前已处理数据。是否继续？'
        );

        if (!confirmed) return;

        try {
            await retranscribeProject(projectId, 'SOLO');
            navigate(`/transcribe/${projectId}`);
        } catch (error) {
            console.error('Retranscribe failed:', error);
            alert('错误：重新转写请求失败');
        }
    };

    const timeAgo = (dateString: string) => {
        const now = new Date().getTime();
        const past = new Date(dateString).getTime();
        const diff = now - past;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 60) return `${minutes}M_AGO`;
        if (hours < 24) return `${hours}H_AGO`;
        return `${days}D_AGO`;
    };

    const handleFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;

        const uploadFiles: UploadFile[] = Array.from(newFiles).map((file, index) => ({
            id: `${Date.now()}-${index}`,
            file,
            status: 'pending' as const,
            progress: 0,
        }));

        setFiles(prev => [...prev, ...uploadFiles]);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = () => {
        setIsDragOver(false);
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const startProcessing = async () => {
        if (files.length === 0 || isProcessing) return;

        setIsProcessing(true);

        for (const uploadFile of files) {
            try {
                // Update status to uploading
                setFiles(prev => prev.map(f =>
                    f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f
                ));

                // Upload the file
                const project = await uploadProject(uploadFile.file);

                // Update status to processing
                setFiles(prev => prev.map(f =>
                    f.id === uploadFile.id ? { ...f, status: 'processing' as const, projectId: project.id } : f
                ));

                // Start Solo mode if configured
                if (config.mode === 'solo') {
                    await startSoloMode(project.id);
                }

                // Update status to completed
                setFiles(prev => prev.map(f =>
                    f.id === uploadFile.id ? { ...f, status: 'completed' as const } : f
                ));

            } catch (error: any) {
                console.error('Upload failed:', error);
                setFiles(prev => prev.map(f =>
                    f.id === uploadFile.id ? { ...f, status: 'error' as const, error: error.message } : f
                ));
            }
        }

        setIsProcessing(false);

        // Navigate to the first completed project, or stay if batch mode
        const completedFile = files.find(f => f.projectId);
        if (completedFile?.projectId && !isBatchMode) {
            navigate(`/transcribe/${completedFile.projectId}`);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };



    return (
        <div className="p-10 space-y-10 font-mono bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-white uppercase tracking-widest">
                        {isBatchMode ? '批量音频录入' : '单音频录入节点'}
                    </h1>
                    <p className="text-slate-400 mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="text-[#00ff88]/40">//</span>
                        {isBatchMode ? '正在初始化多路数据流队列...' : '正在建立数据资产持久化连接...'}
                    </p>
                </div>
                <button
                    onClick={() => navigate('/transcribe')}
                    className="text-slate-500 hover:text-white uppercase text-xs font-black flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> 返回系统主页
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Upload Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Dropzone */}
                    <div
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "relative border border-dashed rounded-none p-16 text-center cursor-pointer transition-all overflow-hidden group",
                            isDragOver
                                ? 'border-[#00ff88] bg-[#00ff88]/5'
                                : 'border-white/10 hover:border-[#00ff88]/30 hover:bg-white/[0.02]'
                        )}
                    >
                        <div className="gpsx-scanline opacity-5 group-hover:opacity-10"></div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            multiple={isBatchMode}
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                        />
                        <div className="w-20 h-20 mx-auto mb-6 border border-[#00ff88]/30 bg-black flex items-center justify-center group-hover:bg-[#00ff88] group-hover:text-black transition-all">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-widest">
                            {isDragOver ? '已检测到数据流' : '注入音频资产'}
                        </h3>
                        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">点击选择文件 或 将文件拖拽至此处</p>
                        <p className="text-slate-500 text-[11px] mt-6 font-bold uppercase tracking-wider">支持格式: MP3 / WAV / M4A | 最大限制: 500MB</p>

                        {/* Decorative corners */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-[#00ff88]/50"></div>
                        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-[#00ff88]/50"></div>
                        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-[#00ff88]/50"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-[#00ff88]/50"></div>
                    </div>

                    {/* File List */}
                    {files.length > 0 && (
                        <div className="bg-[#050505] border border-white/5 p-6 space-y-6 relative overflow-hidden">
                            <div className="gpsx-scanline opacity-5"></div>
                            <div className="flex items-center justify-between border-b border-white/5 pb-4">
                                <h3 className="text-sm font-black text-[#00ff88] uppercase tracking-widest">
                                    待处理缓冲区: [ {files.length} ]
                                </h3>
                                <button
                                    onClick={() => setFiles([])}
                                    className="text-slate-500 hover:text-red-500 text-[11px] font-black uppercase tracking-widest"
                                >
                                    清空缓冲区
                                </button>
                            </div>
                            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
                                {files.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center gap-4 p-4 bg-black border border-white/5 group hover:border-white/10 transition-all"
                                    >
                                        <div className="w-10 h-10 border border-white/5 flex items-center justify-center text-slate-600 group-hover:text-[#00ff88] transition-all">
                                            <FileAudio size={18} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-black truncate uppercase tracking-wider">{file.file.name}</p>
                                            <p className="text-slate-500 text-[11px] font-bold mt-1 uppercase">文件大小: {formatFileSize(file.file.size)}</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {file.status === 'pending' && (
                                                <button
                                                    onClick={() => removeFile(file.id)}
                                                    className="p-1.5 border border-white/5 text-slate-700 hover:text-red-500 hover:border-red-500/30 transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                            {file.status === 'uploading' && (
                                                <div className="flex items-center gap-2 border border-blue-500/20 px-2 py-1 bg-blue-500/5">
                                                    <Loader2 size={12} className="text-blue-400 animate-spin" />
                                                    <span className="text-blue-400 text-[11px] font-black uppercase">上传中...</span>
                                                </div>
                                            )}
                                            {file.status === 'processing' && (
                                                <div className="flex items-center gap-2 border border-amber-500/20 px-2 py-1 bg-amber-500/5">
                                                    <Loader2 size={12} className="text-amber-400 animate-spin" />
                                                    <span className="text-amber-400 text-[11px] font-black uppercase">处理中...</span>
                                                </div>
                                            )}
                                            {file.status === 'completed' && (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-2 border border-[#00ff88]/20 px-2 py-1 bg-[#00ff88]/5">
                                                        <CheckCircle size={12} className="text-[#00ff88]" />
                                                        <span className="text-[#00ff88] text-[11px] font-black uppercase tracking-widest">录入成功</span>
                                                    </div>
                                                    {file.projectId && (
                                                        <button
                                                            onClick={() => navigate(`/transcribe/${file.projectId}`)}
                                                            className="text-white bg-white/5 hover:bg-white text-[11px] font-black uppercase px-3 py-1 hover:text-black transition-all"
                                                        >
                                                            进入节点
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {file.status === 'error' && (
                                                <div className="flex items-center gap-2 border border-red-500/20 px-2 py-1 bg-red-500/5">
                                                    <X size={12} className="text-red-400" />
                                                    <span className="text-red-400 text-[11px] font-black uppercase tracking-widest">执行错误</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Config Panel */}
                <div className="space-y-6">
                    <div className="bg-[#050505] border border-white/5 p-6 space-y-8 relative overflow-hidden">
                        <div className="gpsx-scanline opacity-5"></div>
                        <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-widest">
                            <Settings size={16} className="text-[#00ff88]" />
                            配置方案中心
                        </h3>

                        {/* Mode */}
                        <div className="space-y-3">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pl-1">处理引擎核心</label>
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => setConfig(c => ({ ...c, mode: 'solo' }))}
                                    className={cn(
                                        "p-4 border transition-all text-left relative overflow-hidden group",
                                        config.mode === 'solo'
                                            ? "border-[#00ff88] bg-[#00ff88]/5"
                                            : "border-white/5 hover:border-white/20"
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <Zap size={14} className={config.mode === 'solo' ? 'text-[#00ff88]' : 'text-slate-600'} />
                                        {config.mode === 'solo' && <span className="text-[10px] font-black bg-[#00ff88] text-black px-1.5 uppercase tracking-tighter">推荐</span>}
                                    </div>
                                    <p className={cn("text-base font-black uppercase tracking-widest", config.mode === 'solo' ? 'text-white' : 'text-slate-500')}>全自动流水线</p>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase mt-1">自动执行转写+清洗</p>
                                </button>
                                <button
                                    onClick={() => setConfig(c => ({ ...c, mode: 'manual' }))}
                                    className={cn(
                                        "p-4 border transition-all text-left",
                                        config.mode === 'manual'
                                            ? "border-[#00ff88] bg-[#00ff88]/5 text-white"
                                            : "border-white/5 hover:border-white/20 text-slate-500"
                                    )}
                                >
                                    <Settings size={14} className={config.mode === 'manual' ? 'text-[#00ff88]' : 'text-slate-600'} />
                                    <p className="text-base font-black uppercase tracking-widest mt-2">手动分步模式</p>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase mt-1">分步校验和精炼</p>
                                </button>
                            </div>
                        </div>

                        {/* Language */}
                        <div className="space-y-3">
                            <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest pl-1">语种识别方案</label>
                            <div className="relative">
                                <select
                                    value={config.language}
                                    onChange={(e) => setConfig(c => ({ ...c, language: e.target.value }))}
                                    className="w-full p-4 bg-black border border-white/5 text-white focus:outline-none focus:border-[#00ff88]/40 appearance-none font-mono text-sm uppercase font-black tracking-widest"
                                >
                                    <option value="auto">自动智能识别</option>
                                    <option value="zh">简体中文</option>
                                    <option value="en">标准英语</option>
                                    <option value="mixed">中英混排 / 方言</option>
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-700">
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                        </div>

                        {/* Auto Polish */}
                        <div className="pt-4 border-t border-white/5">
                            <label className="flex items-center gap-4 cursor-pointer group">
                                <div className={cn(
                                    "w-5 h-5 border flex items-center justify-center transition-all",
                                    config.enablePolish ? "bg-[#00ff88] border-[#00ff88] text-black" : "border-white/20 group-hover:border-white/40"
                                )}>
                                    {config.enablePolish && <Check size={14} />}
                                </div>
                                <input
                                    type="checkbox"
                                    checked={config.enablePolish}
                                    onChange={(e) => setConfig(c => ({ ...c, enablePolish: e.target.checked }))}
                                    className="hidden"
                                />
                                <span className={cn(
                                    "text-[12px] font-black uppercase tracking-widest transition-colors",
                                    config.enablePolish ? "text-white" : "text-slate-500 group-hover:text-slate-400"
                                )}>激活AI智能文本精炼</span>
                            </label>
                        </div>
                    </div>

                    {/* Start Button */}
                    <button
                        onClick={startProcessing}
                        disabled={files.length === 0 || isProcessing}
                        className={cn(
                            "w-full py-6 transition-all relative overflow-hidden group",
                            files.length > 0 && !isProcessing
                                ? 'bg-[#00ff88] text-black hover:bg-white shadow-[0_0_20px_rgba(0,255,136,0.3)]'
                                : 'bg-white/5 text-slate-700 cursor-not-allowed border border-white/5'
                        )}
                    >
                        <div className="flex items-center justify-center gap-3 relative z-10">
                            {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Play size={24} />}
                            <span className="text-xl font-black uppercase tracking-widest">
                                {isProcessing ? '正在处理中...' : `开始建立上传连接 ${files.length > 0 ? `[${files.length}]` : ''}`}
                            </span>
                        </div>
                    </button>

                    {/* Recent Transcriptions Section */}
                    <div className="bg-black border border-white/5 p-6 mt-4 relative overflow-hidden group">
                        <div className="gpsx-scanline opacity-5"></div>
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                            <h3 className="text-[12px] font-black text-[#00ff88] flex items-center gap-3 uppercase tracking-widest">
                                <RefreshCw size={14} />
                                最近处理记录
                            </h3>
                            <button
                                onClick={() => navigate('/files')}
                                className="text-[11px] text-slate-400 hover:text-white transition-colors font-black uppercase tracking-widest"
                            >
                                浏览档案库 →
                            </button>
                        </div>

                        {loadingProjects ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="w-8 h-8 text-[#00ff88] animate-spin" />
                            </div>
                        ) : recentProjects.length === 0 ? (
                            <div className="text-center py-10 text-slate-700 text-[12px] font-black uppercase tracking-widest">
                                // 暂无记录
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {recentProjects.map((project) => {
                                    const isCompleted = project.status === 'COMPLETED' || project.status === 'POLISHED';
                                    const isFailed = project.status === 'FAILED';
                                    const isProc = ['TRANSCRIBING', 'POLISHING', 'UPLOADED'].includes(project.status);

                                    return (
                                        <div
                                            key={project.id}
                                            className="flex flex-col p-4 bg-[#050505] border border-white/5 hover:border-white/10 transition-all cursor-pointer group/card"
                                            onClick={() => navigate(isCompleted ? `/transcribe/${project.id}/merge` : `/transcribe/${project.id}`)}
                                        >
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Hash size={10} className="text-slate-700" />
                                                    <span className="text-[9px] font-black text-slate-600 uppercase">{project.id.slice(0, 8)}</span>
                                                </div>
                                                <span className="text-[9px] text-slate-700 font-bold uppercase tracking-tighter">{timeAgo(project.createdAt)}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-[11px] font-black uppercase tracking-wider truncate group-hover/card:text-[#00ff88] transition-colors">
                                                        {project.originalFilename}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3 ml-4">
                                                    {isCompleted && <div className="w-1.5 h-1.5 bg-[#00ff88] rounded-full shadow-[0_0_8px_rgba(0,255,136,0.8)]"></div>}
                                                    {isFailed && <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>}
                                                    {isProc && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRetranscribe(project.id);
                                                        }}
                                                        className="p-1.5 border border-white/5 hover:border-[#00ff88]/50 hover:bg-[#00ff88]/10 text-[#00ff88] transition-all"
                                                        title="RE_TRANSCRIPTION"
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                    <ChevronRight size={14} className="text-slate-800 group-hover/card:text-[#00ff88] group-hover/card:translate-x-1 transition-all" />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ChevronDown = ({ size }: { size: number }) => (
    <ChevronDownIcon size={size} />
);

export default TranscribeUpload;
