import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Mic, Sparkles, Upload, CheckCircle2,
    TrendingUp, FileAudio,
    ArrowRight, Zap, RefreshCw
} from 'lucide-react';
import { getProjects, Project } from '@/services/api';
import ConfigModal from '@/components/ConfigModal';

interface QuickStat {
    label: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: string;
    color: string;
}

const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConfigModal, setShowConfigModal] = useState(false);

    useEffect(() => {
        loadProjects();
        const hideConfigModal = localStorage.getItem('hideConfigModal');
        if (!hideConfigModal) {
            setShowConfigModal(true);
        }
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await getProjects();
            setProjects(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const today = new Date().toDateString();
    const todayProjects = projects.filter(p =>
        new Date(p.createdAt).toDateString() === today
    );
    const completedProjects = projects.filter(p =>
        p.status === 'COMPLETED' || p.status === 'POLISHED'
    );
    const successRate = projects.length > 0
        ? Math.round((completedProjects.length / projects.length) * 100)
        : 0;

    const stats: QuickStat[] = [
        { label: '今日录入', value: todayProjects.length, icon: <TrendingUp size={18} />, color: 'bg-emerald-500/10' },
        { label: '历史总量', value: projects.length, icon: <Mic size={18} />, color: 'bg-blue-500/10' },
        { label: '已完成资产', value: completedProjects.length, icon: <Sparkles size={18} />, color: 'bg-amber-500/10' },
        { label: '处理成功率', value: `${successRate}%`, icon: <CheckCircle2 size={18} />, color: 'bg-purple-500/10' },
    ];

    const recentProjects = [...projects]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            'UPLOADED': 'text-slate-500 border-slate-500/30',
            'TRANSCRIBING': 'text-blue-400 border-blue-500/30 shadow-[0_0_10px_rgba(59,130,246,0.1)]',
            'TRANSCRIBED': 'text-purple-400 border-purple-500/30',
            'POLISHING': 'text-amber-400 border-amber-500/30 animate-pulse',
            'POLISHED': 'text-[#00ff88] border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.1)]',
            'COMPLETED': 'text-[#00ff88] border-[#00ff88]/30',
            'FAILED': 'text-red-400 border-red-500/30',
        };
        const names: Record<string, string> = {
            'UPLOADED': '已上传',
            'TRANSCRIBING': '正在转写',
            'TRANSCRIBED': '转写完成',
            'POLISHING': '正在精炼',
            'POLISHED': '精炼完成',
            'COMPLETED': '处理成功',
            'FAILED': '处理失败',
        };
        return (
            <span className={`px-2 py-0.5 text-[12px] font-black uppercase tracking-widest border bg-black ${styles[status] || styles['UPLOADED']}`}>
                {names[status] || status}
            </span>
        );
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);

        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins} 分钟前`;
        if (diffHours < 24) return `${diffHours} 小时前`;
        return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, ' . ');
    };

    const QuickActionCard: React.FC<{
        icon: React.ReactNode;
        title: string;
        description: string;
        onClick: () => void;
    }> = ({ icon, title, description, onClick }) => (
        <button
            onClick={onClick}
            className="group relative p-6 border border-white/5 bg-black hover:border-[#00ff88]/40 transition-all duration-300 text-left overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-2 text-white/5 group-hover:text-[#00ff88]/10 transition-colors">
                <Zap size={48} strokeWidth={1} />
            </div>
            <div className="relative z-10">
                <div className="w-10 h-10 border border-white/10 flex items-center justify-center mb-4 group-hover:border-[#00ff88]/40 transition-all bg-white/[0.02] group-hover:bg-[#00ff88]/5">
                    {React.cloneElement(icon as React.ReactElement, { size: 20, className: 'text-slate-400 group-hover:text-[#00ff88] transition-colors' })}
                </div>
                <h3 className="text-sm font-black tracking-widest mb-2 text-white">{title}</h3>
                <p className="text-slate-400 text-[12px] tracking-wide leading-relaxed">{description}</p>
                <div className="mt-6 flex items-center gap-2 text-[12px] font-bold text-slate-400 group-hover:text-[#00ff88] transition-colors">
                    <span>执行模块</span>
                    <ArrowRight size={14} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
            </div>
        </button>
    );

    return (
        <div className="p-10 space-y-12">
            {/* Page Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-widest gpsx-glow">控制台</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <span className="text-[12px] text-[#00ff88]/60 font-bold uppercase tracking-wider">系统状态: 节点运行正常</span>
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] shadow-[0_0_5px_#00ff88] animate-pulse"></div>
                    </div>
                </div>
                <button
                    onClick={loadProjects}
                    disabled={loading}
                    className="gpsx-button flex items-center gap-2"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    手动同步
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-black border border-white/5 p-6 relative group hover:border-[#00ff88]/20 transition-all overflow-hidden"
                    >
                        <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-[#00ff88]/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                // {stat.label}
                            </span>
                            <div className="text-[#00ff88]/40">
                                {React.cloneElement(stat.icon as React.ReactElement, { size: 16 })}
                            </div>
                        </div>
                        <div className="text-3xl font-black text-white tracking-widest">{stat.value}</div>
                        <div className="mt-2 text-[12px] font-bold text-slate-400 uppercase tracking-wider">记录指标</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] whitespace-nowrap">Core_Modules</h2>
                    <div className="h-[1px] w-full bg-white/5"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <QuickActionCard
                        icon={<Upload />}
                        title="上传音频"
                        description="将录音注入处理中心进行分析"
                        onClick={() => navigate('/transcribe/upload')}
                    />
                    <QuickActionCard
                        icon={<Sparkles />}
                        title="智能清洗"
                        description="通过AI引擎优化和精炼文本内容"
                        onClick={() => navigate('/polish/new')}
                    />
                    <QuickActionCard
                        icon={<Zap />}
                        title="批量处理"
                        description="对多项资产进行同步自动化执行"
                        onClick={() => navigate('/transcribe/upload?batch=true')}
                    />
                </div>
            </div>

            {/* Recent Projects */}
            <div className="space-y-6 pb-12">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                        <h2 className="text-sm font-black text-white uppercase tracking-widest whitespace-nowrap">最近活动</h2>
                        <div className="h-[1px] w-full bg-white/5"></div>
                    </div>
                    <button
                        onClick={() => navigate('/history')}
                        className="ml-6 text-[12px] font-black text-[#00ff88]/60 hover:text-[#00ff88] transition-colors uppercase tracking-wider flex items-center gap-2"
                    >
                        查看全部历史记录 <ArrowRight size={14} />
                    </button>
                </div>

                {loading ? (
                    <div className="gpsx-card text-center py-12">
                        <RefreshCw size={24} className="mx-auto text-[#00ff88]/40 animate-spin mb-4" />
                        <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase">正在同步云端处理节点数据流...</p>
                    </div>
                ) : recentProjects.length === 0 ? (
                    <div className="gpsx-card border-dashed border-white/10 text-center py-12">
                        <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase">未检测到近期活动记录</p>
                    </div>
                ) : (
                    <div className="bg-black border border-white/5 overflow-hidden">
                        <table className="w-full text-left font-mono">
                            <thead>
                                <tr className="bg-white/[0.02] border-b border-white/5 text-[12px] font-black text-slate-400 uppercase tracking-widest">
                                    <th className="px-8 py-5">资产名称</th>
                                    <th className="px-8 py-5">处理状态</th>
                                    <th className="px-8 py-5">登记时间</th>
                                    <th className="px-8 py-5 text-right">操作模块</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {recentProjects.map((project) => (
                                    <tr key={project.id} className="group hover:bg-[#00ff88]/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-8 h-8 border border-white/10 group-hover:border-[#00ff88]/40 flex items-center justify-center text-slate-600 group-hover:text-[#00ff88] transition-all bg-white/[0.02]">
                                                    <FileAudio size={14} />
                                                </div>
                                                <span className="text-xs font-bold text-white tracking-widest uppercase truncate max-w-sm">
                                                    {project.originalFilename}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            {getStatusBadge(project.status)}
                                        </td>
                                        <td className="px-8 py-6 text-[13px] text-slate-300 font-bold uppercase tracking-wider">
                                            {formatTime(project.createdAt)}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <button
                                                onClick={() => navigate(`/transcribe/${project.id}`)}
                                                className="text-[12px] font-black text-slate-400 hover:text-[#00ff88] hover:gpsx-glow transition-all uppercase tracking-widest"
                                            >
                                                [ 查看详情 ]
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <ConfigModal
                isOpen={showConfigModal}
                onClose={() => setShowConfigModal(false)}
            />
        </div>
    );
};

export default Dashboard;
