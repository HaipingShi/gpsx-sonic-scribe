import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileAudio, ArrowRight, Loader2, RefreshCw, Eye } from 'lucide-react';
import { getProjects, retranscribeProject, Project } from '@/services/api';

const TranscribeIndex: React.FC = () => {
    const navigate = useNavigate();
    const [recentProjects, setRecentProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecentProjects();
    }, []);

    const loadRecentProjects = async () => {
        try {
            setLoading(true);
            const projects = await getProjects();
            const recent = projects
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 6);
            setRecentProjects(recent);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const timeAgo = (dateString: string) => {
        const now = new Date().getTime();
        const past = new Date(dateString).getTime();
        const diff = now - past;
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (hours < 1) return '刚刚';
        if (hours < 24) return `${hours}小时前`;
        return `${days}天前`;
    };

    const handleRetranscribe = async (projectId: string) => {
        const confirmed = window.confirm('重新转写将清除当前所有转写和润色结果。确定要继续吗？');
        if (!confirmed) return;

        try {
            await retranscribeProject(projectId, 'SOLO');
            navigate(`/transcribe/${projectId}`);
        } catch (error) {
            console.error('Retranscribe failed:', error);
            alert('重新转写失败，请重试');
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'COMPLETED': 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/5',
            'FAILED': 'text-red-400 border-red-500/30 bg-red-400/5',
            'PROCESSING': 'text-blue-400 border-blue-500/30 bg-blue-400/5 animate-pulse',
            'DEFAULT': 'text-slate-500 border-white/10 bg-white/5',
        };
        const labels: Record<string, string> = {
            'COMPLETED': '已完成',
            'FAILED': '失败',
            'PROCESSING': '处理中',
            'DEFAULT': '待处理',
        };
        const s = status as keyof typeof styles;
        return (
            <span className={`px-2 py-0.5 text-[11px] font-black uppercase tracking-widest border ${styles[s] || styles.DEFAULT}`}>
                {labels[s] || labels.DEFAULT}
            </span>
        );
    };

    return (
        <div className="p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-4">
                        语音转写集线器
                        <span className="text-[11px] bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 px-2 py-0.5 font-black">在线</span>
                    </h1>
                    <p className="text-[12px] text-slate-500 mt-1 font-bold uppercase tracking-widest">
                        上传音频数据流，将其转录并精炼为数字化资产
                    </p>
                </div>
            </div>

            {/* Upload Section */}
            <div
                onClick={() => navigate('/transcribe/upload')}
                className="gpsx-card border-dashed py-16 text-center hover:border-[#00ff88]/40 transition-all cursor-pointer group relative overflow-hidden"
            >
                <div className="gpsx-scanline opacity-5"></div>
                <div className="w-16 h-16 mx-auto mb-6 border border-white/10 group-hover:border-[#00ff88]/40 flex items-center justify-center text-slate-800 group-hover:text-[#00ff88] transition-all bg-white/[0.02]">
                    <Upload size={32} />
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">上传音频文件</h3>
                <p className="text-[12px] text-slate-500 font-bold uppercase tracking-widest mb-4">支持 MP3、WAV、M4A 格式，单文件上限 500MB</p>
                <p className="text-[#00ff88]/60 text-[11px] font-black uppercase tracking-widest">支持拖拽多个资产批量注入</p>
            </div>

            {/* Recent Transcriptions */}
            <div>
                <div className="flex items-center gap-4 flex-1">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest whitespace-nowrap">最近活动节点</h2>
                    <div className="h-[1px] w-full bg-white/5"></div>
                    <button
                        onClick={() => navigate('/files')}
                        className="ml-6 text-[12px] font-black text-[#00ff88]/60 hover:text-[#00ff88] transition-colors uppercase tracking-widest flex items-center gap-2 whitespace-nowrap"
                    >
                        查看全部历史资产 <ArrowRight size={14} />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    </div>
                ) : recentProjects.length === 0 ? (
                    <div className="gpsx-card border-dashed border-white/10 text-center py-16">
                        <FileAudio size={48} className="mx-auto mb-6 text-slate-800 opacity-30" />
                        <p className="text-[12px] font-black text-slate-500 tracking-widest uppercase">暂无活跃资产记录</p>
                        <p className="text-[11px] text-slate-700 font-bold uppercase tracking-widest mt-2">请点击上方区域上传音频文件开始数字化处理</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {recentProjects.map((project) => (
                            <div
                                key={project.id}
                                className="bg-black border border-white/5 p-5 group hover:border-[#00ff88]/40 transition-all relative overflow-hidden"
                            >
                                <div className="flex items-center gap-4 mb-5">
                                    <div className="w-10 h-10 border border-white/10 group-hover:border-[#00ff88]/40 flex items-center justify-center text-slate-600 group-hover:text-[#00ff88] transition-all bg-white/[0.02]">
                                        <FileAudio size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold text-sm tracking-widest truncate">{project.originalFilename}</p>
                                        <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest">{timeAgo(project.createdAt)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    {getStatusBadge(project.status)}
                                    <div className="flex items-center gap-3">
                                        {project.status === 'COMPLETED' && (
                                            <>
                                                <button
                                                    onClick={() => navigate(`/merge/${project.id}`)}
                                                    className="p-1.5 border border-white/10 hover:border-[#00ff88]/40 text-slate-500 hover:text-[#00ff88] transition-all bg-white/[0.02]"
                                                    title="查看结果"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleRetranscribe(project.id)}
                                                    className="p-1.5 border border-white/10 hover:border-[#00ff88]/40 text-slate-500 hover:text-[#00ff88] transition-all bg-white/[0.02]"
                                                    title="重新转写"
                                                >
                                                    <RefreshCw size={16} />
                                                </button>
                                            </>
                                        )}
                                        {project.status === 'FAILED' && (
                                            <button
                                                onClick={() => handleRetranscribe(project.id)}
                                                className="p-1.5 border border-white/10 hover:border-red-500/40 text-slate-500 hover:text-red-400 transition-all bg-white/[0.02]"
                                                title="重试"
                                            >
                                                <RefreshCw size={16} />
                                            </button>
                                        )}
                                        {project.status === 'PROCESSING' && (
                                            <button
                                                onClick={() => navigate(`/transcribe/${project.id}`)}
                                                className="text-[#00ff88]/60 text-[11px] font-black uppercase tracking-widest hover:text-[#00ff88]"
                                            >
                                                进入控制台 &gt;
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TranscribeIndex;
