import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, FileAudio, FileText, Trash2, Eye, RefreshCw, Sparkles, Download } from 'lucide-react';
import { getProjects, deleteProject, Project, API_URL } from '@/services/api';

import { cn } from '@/lib/utils';

const FilesPage: React.FC = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'audio' | 'text'>('all');
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
    const [downloading, setDownloading] = useState(false);

    useEffect(() => {
        loadProjects();
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

    const handleDelete = async (id: string) => {
        if (!confirm('确定要永久删除这条档案记录吗？[操作无法撤销]')) return;

        setDeletingIds(prev => new Set(prev).add(id));
        try {
            await deleteProject(id);
            setProjects(prev => prev.filter(p => p.id !== id));
            setSelectedFiles(prev => prev.filter(fid => fid !== id));
        } catch (error: any) {
            console.error('Failed to delete project:', error);
            alert(`删除项目失败: ${error.response?.data?.error || error.message}`);
        } finally {
            setDeletingIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(id);
                return newSet;
            });
        }
    };

    const handleBatchDelete = async () => {
        if (selectedFiles.length === 0) return;
        if (!confirm(`确定要永久清空选中的 ${selectedFiles.length} 条档案记录吗？`)) return;

        const idsToDelete = [...selectedFiles];
        setDeletingIds(new Set(idsToDelete));

        try {
            // Sequential deletion to avoid overloading the disk/DB and to track individual failures
            for (const id of idsToDelete) {
                await deleteProject(id);
                setProjects(prev => prev.filter(p => p.id !== id));
            }
            setSelectedFiles([]);
        } catch (error: any) {
            console.error('Failed to batch delete:', error);
            alert(`批量删除时遇到错误: ${error.response?.data?.error || error.message}`);
            // Reload projects to sync state in case of partial success
            loadProjects();
        } finally {
            setDeletingIds(new Set());
        }
    };

    const handleBatchDownload = async () => {
        if (selectedFiles.length === 0) return;

        setDownloading(true);
        try {
            const response = await fetch(`${API_URL}/projects/download-batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ projectIds: selectedFiles }),
            });

            if (!response.ok) {
                throw new Error('Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `GPSX_SONIC_ARCHIVE_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            setSelectedFiles([]);
        } catch (error) {
            console.error('Failed to batch download:', error);
        } finally {
            setDownloading(false);
        }
    };

    const filteredProjects = projects.filter(p => {
        if (filter === 'text') return false;
        if (searchQuery && !p.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    const toggleSelect = (id: string) => {
        setSelectedFiles(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        if (selectedFiles.length === filteredProjects.length) {
            setSelectedFiles([]);
        } else {
            setSelectedFiles(filteredProjects.map(f => f.id));
        }
    };

    const getStatusInfo = (status: string) => {
        const statusMap: Record<string, { label: string; color: string }> = {
            'UPLOADED': { label: '已上传', color: 'text-slate-400 border-white/10' },
            'TRANSCRIBING': { label: '转写中', color: 'text-blue-400 border-blue-500/20 animate-pulse' },
            'TRANSCRIBED': { label: '原始数据', color: 'text-blue-400 border-blue-500/10' },
            'POLISHING': { label: '精炼中', color: 'text-[var(--gpsx-accent-primary)] border-[var(--gpsx-accent-primary)]/20 animate-pulse' },
            'POLISHED': { label: '已精炼资产', color: 'text-[var(--gpsx-accent-primary)] border-[var(--gpsx-accent-primary)]/30' },
            'COMPLETED': { label: '已归档', color: 'text-[var(--gpsx-accent-primary)] border-[var(--gpsx-accent-primary)]/30' },
            'FAILED': { label: '执行失败', color: 'text-red-500 border-red-500/30' },
        };
        return statusMap[status] || { label: status, color: 'text-slate-500 border-white/10' };
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
        <div className="p-8 space-y-8 font-mono bg-[var(--gpsx-bg-main)] min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-widest">
                        <FolderOpen className="text-[var(--gpsx-accent-primary)] gpsx-glow" size={32} />
                        档案库管理系统
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                        <span className="text-[var(--gpsx-accent-primary)]/40">//</span>
                        数据流浏览器就绪: 已检索到 [ {projects.length} ] 条记录
                    </p>
                </div>
                <button
                    onClick={loadProjects}
                    disabled={loading}
                    className="gpsx-button px-6 py-2"
                >
                    <RefreshCw size={14} className={cn(loading && 'animate-spin')} />
                    同步节点
                </button>
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-6 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-64">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <span className="text-[var(--gpsx-accent-primary)] text-xs font-black">&gt;</span>
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="在档案数据流中搜索..."
                        className="w-full pl-10 pr-4 py-3 bg-[var(--gpsx-bg-main)] border border-white/5 text-white placeholder-slate-600 focus:outline-none focus:border-[var(--gpsx-accent-primary)]/40 transition-all font-mono text-base uppercase tracking-widest"
                    />
                </div>

                {/* Filter */}
                <div className="flex gap-[1px] bg-white/5 border border-white/5">
                    {[
                        { id: 'all', label: '全部显示' },
                        { id: 'audio', label: '音频资产' },
                        { id: 'text', label: '文本内容' },
                    ].map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={cn(
                                'px-6 py-3 text-[12px] font-black tracking-widest transition-all',
                                filter === f.id
                                    ? 'bg-[var(--gpsx-accent-primary)] text-black'
                                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Batch Actions */}
                {selectedFiles.length > 0 && (
                    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--gpsx-accent-primary)]/5 border border-[var(--gpsx-accent-primary)]/20 animate-in fade-in slide-in-from-right-4">
                        <span className="text-[var(--gpsx-accent-primary)] text-[12px] font-black uppercase tracking-widest">
                            已选缓冲区: {selectedFiles.length}
                        </span>
                        <div className="h-4 w-[1px] bg-[var(--gpsx-accent-primary)]/20"></div>
                        <button
                            onClick={handleBatchDownload}
                            disabled={downloading}
                            className="text-[var(--gpsx-accent-primary)] hover:text-white text-[12px] font-black uppercase tracking-widest flex items-center gap-2 group transition-colors"
                        >
                            <Download size={14} className="group-hover:translate-y-0.5 transition-transform" />
                            {downloading ? '打包中...' : '打包下载'}
                        </button>
                        <button
                            onClick={handleBatchDelete}
                            disabled={deletingIds.size > 0}
                            className="text-red-500 hover:text-red-400 text-[12px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={14} />
                            永久清除
                        </button>
                    </div>
                )}
            </div>

            {/* File Table */}
            {loading ? (
                <div className="bg-[var(--gpsx-bg-card)] border border-white/5 p-20 text-center flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-t-[var(--gpsx-accent-primary)] border-white/5 rounded-full animate-spin"></div>
                    <p className="text-[var(--gpsx-accent-primary)] text-[12px] font-black uppercase tracking-widest">正在查询数据库...</p>
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="bg-[var(--gpsx-bg-card)] border border-white/5 p-20 text-center flex flex-col items-center gap-6">
                    <div className="text-slate-800 font-black text-6xl">// 空</div>
                    <div className="space-y-2">
                        <p className="text-slate-400 text-[14px] font-black uppercase tracking-widest">未发现有效数据流</p>
                        <p className="text-slate-500 text-[12px] font-bold uppercase tracking-widest">本地档案库中未找到匹配的记录</p>
                    </div>
                </div>
            ) : (
                <div className="bg-[var(--gpsx-bg-main)] border border-white/5 relative overflow-hidden group">
                    <div className="gpsx-scanline opacity-10 pointer-events-none"></div>
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 bg-[var(--gpsx-bg-card)]">
                                <th className="w-16 px-6 py-6 text-center">
                                    <div
                                        onClick={selectAll}
                                        className={cn(
                                            'w-4 h-4 border mx-auto cursor-pointer transition-all flex items-center justify-center',
                                            selectedFiles.length === filteredProjects.length && filteredProjects.length > 0
                                                ? 'bg-[var(--gpsx-accent-primary)] border-[var(--gpsx-accent-primary)]'
                                                : 'border-white/20 hover:border-[var(--gpsx-accent-primary)]/50'
                                        )}
                                    >
                                        {selectedFiles.length === filteredProjects.length && filteredProjects.length > 0 && (
                                            <div className="w-2 h-2 bg-black"></div>
                                        )}
                                    </div>
                                </th>
                                <th className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-6 py-6">资产识别码</th>
                                <th className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-6 py-6">数据类型</th>
                                <th className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-6 py-6">系统状态</th>
                                <th className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-6 py-6">记录时间</th>
                                <th className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-6 py-6 text-right px-8">控制指令</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map((project) => {
                                const statusInfo = getStatusInfo(project.status);
                                const isDeleting = deletingIds.has(project.id);
                                const isSelected = selectedFiles.includes(project.id);

                                return (
                                    <tr
                                        key={project.id}
                                        className={cn(
                                            'border-b border-white/5 transition-colors group/row font-mono',
                                            isSelected ? 'bg-[var(--gpsx-accent-primary)]/5' : 'hover:bg-white/[0.02]',
                                            isDeleting && 'opacity-30'
                                        )}
                                    >
                                        <td className="px-6 py-6 text-center">
                                            <div
                                                onClick={() => toggleSelect(project.id)}
                                                className={cn(
                                                    'w-4 h-4 border mx-auto cursor-pointer transition-all flex items-center justify-center',
                                                    isSelected ? 'bg-[var(--gpsx-accent-primary)] border-[var(--gpsx-accent-primary)]' : 'border-white/10 group-hover/row:border-white/30'
                                                )}
                                            >
                                                {isSelected && <div className="w-2 h-2 bg-black"></div>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 border border-white/5 flex items-center justify-center text-slate-600 group-hover/row:border-[var(--gpsx-accent-primary)]/30 group-hover/row:text-[var(--gpsx-accent-primary)] transition-all">
                                                    <FileAudio size={18} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-white text-sm font-black uppercase tracking-widest">{project.originalFilename}</span>
                                                    <span className="text-[11px] text-slate-400 font-bold tracking-tight">标识符: {project.id.slice(0, 8)}...</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">[SONIC_CORE]</span>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className={cn(
                                                'inline-flex items-center gap-2 px-3 py-1 border text-[11px] font-black uppercase tracking-widest',
                                                statusInfo.color
                                            )}>
                                                <div className={cn('w-1 h-1 rounded-full bg-current', project.status.includes('ING') && 'animate-ping')}></div>
                                                {statusInfo.label}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <span className="text-[12px] text-slate-300 font-bold">{formatTime(project.createdAt)}</span>
                                        </td>
                                        <td className="px-6 py-6 text-right px-8">
                                            <div className="flex items-center justify-end gap-3 opacity-20 group-hover/row:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => navigate(`/transcribe/${project.id}`)}
                                                    className="p-2 border border-white/5 hover:border-[var(--gpsx-accent-primary)]/50 hover:bg-[var(--gpsx-accent-primary)]/10 text-[var(--gpsx-accent-primary)] transition-all"
                                                    title="VIEW_DATA"
                                                >
                                                    <Eye size={16} />
                                                </button>
                                                {(project.status === 'POLISHED' || project.status === 'COMPLETED' || project.status === 'TRANSCRIBED') && (
                                                    <button
                                                        onClick={() => navigate(`/polish/${project.id}`)}
                                                        className="p-2 border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-500 transition-all"
                                                        title="REFINE_DATA"
                                                    >
                                                        <Sparkles size={16} />
                                                    </button>
                                                )}
                                                {(project.status === 'POLISHED' || project.status === 'COMPLETED') && (
                                                    <button
                                                        onClick={() => navigate(`/transcribe/${project.id}/merge`)}
                                                        className="p-2 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/10 text-blue-500 transition-all"
                                                        title="EXPORT_SCHEMA"
                                                    >
                                                        <FileText size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(project.id)}
                                                    disabled={isDeleting}
                                                    className="p-2 border border-white/5 hover:border-red-500/50 hover:bg-red-500/10 text-red-500 transition-all disabled:opacity-0"
                                                    title="PURGE_RECORD"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default FilesPage;
