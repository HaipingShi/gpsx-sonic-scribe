import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileAudio, CheckCircle, XCircle, RefreshCw, AlertCircle, Loader2, ChevronRight, Hash } from 'lucide-react';
import { getProjects, Project } from '@/services/api';
import { cn } from '@/lib/utils';

const HistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'completed' | 'failed'>('all');

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            setLoading(true);
            const data = await getProjects();
            // Filter to only show completed or failed projects, sorted by newest first
            const historyProjects = (Array.isArray(data) ? data : [])
                .filter(p => ['COMPLETED', 'POLISHED', 'FAILED'].includes(p.status))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setProjects(historyProjects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        if (filter === 'completed') return p.status !== 'FAILED';
        if (filter === 'failed') return p.status === 'FAILED';
        return true;
    });

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 60) return `${diffMins}M_AGO`;
        if (diffHours < 24) return `${diffHours}H_AGO`;
        if (diffDays === 1) return `YESTERDAY`;
        return `${diffDays}D_AGO`;
    };

    return (
        <div className="p-10 space-y-10 font-mono bg-black min-h-screen">
            <div className="flex items-center justify-between border-b border-white/5 pb-8">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-[0.3em]">
                        <Clock className="text-[#00ff88] w-8 h-8" />
                        Archive_Access_Node
                    </h1>
                    <p className="text-slate-500 mt-2 font-bold uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#00ff88] animate-pulse rounded-full" />
                        QUERYING_HISTORICAL_NODES: [ COMPLETED / FAILED ]
                    </p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex gap-2 p-1 border border-white/5 bg-black">
                        {[
                            { id: 'all', label: 'PROTOCOL_ALL' },
                            { id: 'completed', label: 'RESOLVED' },
                            { id: 'failed', label: 'CRITICAL_FAIL' },
                        ].map((f) => (
                            <button
                                key={f.id}
                                onClick={() => setFilter(f.id as any)}
                                className={cn(
                                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all",
                                    filter === f.id
                                        ? "bg-white text-black"
                                        : "text-slate-500 hover:text-white"
                                )}
                            >
                                {f.label}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={loadProjects}
                        disabled={loading}
                        className="group p-2 border border-white/5 hover:border-[#00ff88]/40 transition-all"
                    >
                        <RefreshCw size={18} className={cn("text-slate-500 group-hover:text-[#00ff88]", loading && 'animate-spin')} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20">
                    <Loader2 size={40} className="text-[#00ff88] animate-spin mb-6" />
                    <p className="text-[#00ff88] text-[10px] font-black uppercase tracking-[0.4em]">Synching_Archive_Index...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="border border-dashed border-white/10 bg-[#050505] p-24 text-center">
                    <AlertCircle size={48} className="mx-auto text-slate-800 mb-6" />
                    <p className="text-slate-600 text-xs font-black uppercase tracking-[0.2em]">// NULL_STATE: NO_ARCHIVES_DETECTED</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {filteredProjects.map((project) => (
                        <div
                            key={project.id}
                            onClick={() => navigate(project.status !== 'FAILED' ? `/transcribe/${project.id}/merge` : `/transcribe/${project.id}`)}
                            className="group flex items-center gap-6 p-6 bg-[#050505] border border-white/5 hover:border-[#00ff88]/40 transition-all cursor-pointer relative overflow-hidden"
                        >
                            <div className="gpsx-scanline opacity-0 group-hover:opacity-5"></div>

                            <div className="w-12 h-12 flex items-center justify-center bg-black border border-white/5 group-hover:border-[#00ff88]/20 text-slate-500 group-hover:text-[#00ff88] transition-all">
                                <FileAudio size={20} />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                    <Hash size={12} className="text-slate-700" />
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{project.id.slice(0, 8)}</p>
                                </div>
                                <p className="text-white font-black text-sm uppercase tracking-wider truncate group-hover:text-[#00ff88] transition-colors">
                                    {project.originalFilename}
                                </p>
                                <div className="flex items-center gap-4 mt-2">
                                    <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">DATA_PERSISTENCE: ACTIVE</span>
                                    <span className="w-1 h-1 bg-slate-800 rounded-full" />
                                    <span className="text-[9px] font-bold text-slate-700 uppercase tracking-tighter">NODE_V3</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-8">
                                <div className="flex flex-col items-end">
                                    {project.status === 'FAILED' ? (
                                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center gap-2 border border-red-500/10 px-2 py-1 bg-red-500/5">
                                            <XCircle size={14} />
                                            CRITICAL_FAIL
                                        </span>
                                    ) : (
                                        <span className="text-[10px] font-black text-[#00ff88] uppercase tracking-widest flex items-center gap-2 border border-[#00ff88]/10 px-2 py-1 bg-[#00ff88]/5">
                                            <CheckCircle size={14} />
                                            RESOLVED
                                        </span>
                                    )}
                                    <span className="text-[9px] text-slate-600 font-bold mt-2 uppercase tracking-widest">{formatTime(project.createdAt)}</span>
                                </div>

                                <div className="p-2 border border-white/5 group-hover:bg-[#00ff88] group-hover:text-black transition-all">
                                    <ChevronRight size={16} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="pt-10 border-t border-white/5 flex justify-between items-center text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em]">
                <span>[ TOTAL_ENTRIES: {filteredProjects.length} ]</span>
                <span className="text-[#00ff88]/40 italic">POWERED BY GPSX LAB</span>
            </div>
        </div>
    );
};
export default HistoryPage;
