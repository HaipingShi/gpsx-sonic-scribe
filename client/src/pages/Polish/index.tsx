import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, FileText, ArrowRight, Loader2 } from 'lucide-react';
import { getProjects, Project } from '@/services/api';

import { cn } from '@/lib/utils';

const PolishIndex: React.FC = () => {
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
            // Show all projects that have been processed (COMPLETED or have chunks)
            const polishableProjects = projects
                .filter(p => p.status === 'COMPLETED' || p.status === 'POLISHED' || p.status === 'TRANSCRIBED')
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 6);
            setRecentProjects(polishableProjects);
        } catch (error) {
            console.error('Failed to load projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffHours < 1) return 'JUST_NOW';
        if (diffHours < 24) return `${diffHours}H_AGO`;
        return `${diffDays}D_AGO`;
    };

    return (
        <div className="p-8 space-y-10 font-mono bg-[var(--gpsx-bg-main)] min-h-screen">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-[0.2em]">
                    <Sparkles className="text-[var(--gpsx-accent-primary)] gpsx-glow" size={32} />
                    Refinement_Core
                </h1>
                <p className="text-slate-500 mt-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <span className="text-[var(--gpsx-accent-primary)]/40">//</span>
                    Neural_Post_Processor: [ AI_DRIVEN_LINGUISTIC_CLEANUP ]
                </p>
            </div>

            {/* Recent Polish Tasks */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                        <div className="w-1 h-1 bg-[var(--gpsx-accent-primary)]"></div>
                        Recent_Refinement_Tasks
                    </h2>
                    <button
                        onClick={() => navigate('/files')}
                        className="text-[var(--gpsx-accent-primary)] hover:text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors group"
                    >
                        BROWSE_ARCHIVE <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>

                {loading ? (
                    <div className="bg-[var(--gpsx-bg-card)] border border-white/5 p-20 text-center flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 text-[var(--gpsx-accent-primary)] animate-spin" />
                        <p className="text-[var(--gpsx-accent-primary)] text-[10px] font-black uppercase tracking-[0.3em]">Synching_Nodes...</p>
                    </div>
                ) : recentProjects.length === 0 ? (
                    <div className="bg-[var(--gpsx-bg-card)] border border-white/5 p-20 text-center flex flex-col items-center gap-6">
                        <div className="text-slate-800 font-black text-6xl">// NULL</div>
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">No processable streams detected</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentProjects.map((project) => (
                            <div
                                key={project.id}
                                onClick={() => navigate(`/polish/${project.id}`)}
                                className="bg-[var(--gpsx-bg-card)] border border-white/5 p-6 hover:border-[var(--gpsx-accent-primary)]/40 transition-all cursor-pointer group relative overflow-hidden"
                            >
                                <div className="gpsx-scanline opacity-5 pointer-events-none"></div>

                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-12 h-12 border border-white/5 flex items-center justify-center text-slate-600 group-hover:border-[var(--gpsx-accent-primary)]/30 group-hover:text-[var(--gpsx-accent-primary)] transition-all">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white text-xs font-black uppercase tracking-widest truncate group-hover:text-[var(--gpsx-accent-primary)] transition-colors">
                                            {project.originalFilename}
                                        </p>
                                        <p className="text-[9px] text-slate-500 font-bold mt-1 tracking-tighter">
                                            ID: {project.id.slice(0, 8)} | {formatTime(project.createdAt)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                    <span className={cn(
                                        "text-[9px] font-black px-2 py-1 border uppercase tracking-widest",
                                        project.status === 'POLISHED' || project.status === 'COMPLETED'
                                            ? "text-[var(--gpsx-accent-primary)] border-[var(--gpsx-accent-primary)]/20"
                                            : "text-[var(--gpsx-accent-secondary)] border-[var(--gpsx-accent-secondary)]/20"
                                    )}>
                                        {project.status === 'POLISHED' || project.status === 'COMPLETED' ? '[_CLEAN_]' : '[_ASR_RAW_]'}
                                    </span>
                                    <span className="text-[9px] text-slate-600 font-black uppercase group-hover:text-[var(--gpsx-accent-primary)] transition-colors tracking-widest flex items-center gap-2">
                                        INITIATE_REFINEMENT &gt;
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PolishIndex;
