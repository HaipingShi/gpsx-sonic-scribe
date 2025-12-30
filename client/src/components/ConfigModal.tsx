import React, { useState, useEffect } from 'react';
import { X, Settings, RefreshCw } from 'lucide-react';
import { getSettings, AppSettings } from '@/services/api';

interface ConfigModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSettings();
            setSettings(data);
        } catch (error) {
            console.error('[Config] Failed to load sync settings:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const handleDontShowAgain = () => {
        localStorage.setItem('hideConfigModal', 'true');
        onClose();
    };

    // Helper to clean up model names for display
    const formatModelName = (name: string | undefined) => {
        if (!name) return 'Gemini 3 Flash'; // Default fallback
        if (name.includes('gemini-3-flash')) return 'Gemini 3 Flash';
        if (name.includes('gemini-1.5-flash')) return 'Gemini 1.5 Flash';
        if (name.includes('gemini-1.5-pro')) return 'Gemini 1.5 Pro';
        return name.split('/').pop() || name;
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[var(--gpsx-bg-card)] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[var(--gpsx-accent-primary)] to-transparent opacity-50"></div>

                {/* Header */}
                <div className="flex items-center justify-between p-8 border-b border-white/5 bg-[var(--gpsx-bg-main)]/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border border-[var(--gpsx-accent-primary)]/30 flex items-center justify-center bg-[var(--gpsx-accent-primary)]/5 relative group">
                            <div className="absolute inset-0 bg-[var(--gpsx-accent-primary)]/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Settings className="text-[var(--gpsx-accent-primary)] gpsx-glow" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-[0.2em] uppercase">当前环境同步协议</h2>
                            <p className="text-[10px] text-[var(--gpsx-accent-primary)]/40 font-black uppercase tracking-[0.4em] mt-1">System_Config_Matrix_v2.5</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 border border-white/5 flex items-center justify-center text-slate-500 hover:text-white hover:border-[var(--gpsx-accent-primary)]/40 transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
                    {loading ? (
                        <div className="py-24 flex flex-col items-center justify-center gap-6">
                            <div className="relative">
                                <RefreshCw className="animate-spin text-[var(--gpsx-accent-primary)]" size={40} />
                                <div className="absolute inset-0 blur-xl bg-[var(--gpsx-accent-primary)]/20 animate-pulse"></div>
                            </div>
                            <p className="text-[11px] font-black text-slate-500 tracking-[0.3em] uppercase animate-pulse">正在同步全球节点配置数据流...</p>
                        </div>
                    ) : (
                        <>
                            {/* Transcription Settings */}
                            <div className="bg-[var(--gpsx-bg-main)] p-6 border border-white/5 group hover:border-[var(--gpsx-accent-primary)]/20 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white"># 转写配置_INGESTION</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center group/row">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">// 默认处理模式</span>
                                        <span className="px-3 py-1 bg-[var(--gpsx-accent-primary)]/5 text-[var(--gpsx-accent-primary)] border border-[var(--gpsx-accent-primary)]/20 font-black text-[10px] uppercase tracking-widest">
                                            {settings?.runtime?.mode || 'SOLO Mode'} (全自动)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center group/row">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">// 活跃转写引擎</span>
                                        <span className="text-white font-mono text-xs font-bold tracking-widest group-hover/row:gpsx-glow transition-all">
                                            FunASR (SenseVoice-v1)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center group/row">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">// 自动标点解析</span>
                                        <span className="text-emerald-500 text-[10px] font-black tracking-widest border border-emerald-500/20 px-2 py-0.5 bg-emerald-500/5">ACTIVE_OK</span>
                                    </div>
                                </div>
                            </div>

                            {/* Polish Settings */}
                            <div className="bg-[var(--gpsx-bg-main)] p-6 border border-white/5 group hover:border-[var(--gpsx-accent-primary)]/20 transition-all relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-[var(--gpsx-accent-secondary)]/5 blur-3xl rounded-full pointer-events-none"></div>
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--gpsx-accent-secondary)] animate-pulse"></div>
                                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white"># 润色配置_NEURAL</h3>
                                </div>
                                <div className="space-y-5">
                                    <div className="flex justify-between items-center group/row">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">// 活跃智能模型</span>
                                        <span className="px-3 py-1 bg-[var(--gpsx-accent-secondary)]/5 text-[var(--gpsx-accent-secondary)] border border-[var(--gpsx-accent-secondary)]/20 font-black text-[10px] uppercase tracking-widest">
                                            {formatModelName(settings?.runtime?.geminiModel)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center group/row">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">// 默认清洗策略</span>
                                        <span className="text-white font-mono text-xs font-bold tracking-widest group-hover/row:gpsx-glow transition-all">
                                            {settings?.promptTemplates?.find(t => t.id === settings.defaultTemplateId)?.name || '专业正式'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center group/row">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest group-hover/row:text-slate-400 transition-colors">// 处理故障容灾</span>
                                        <span className="text-blue-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border border-blue-400/20 bg-blue-400/5">LOAD_BALANCED</span>
                                    </div>
                                </div>
                            </div>

                            {/* Status List */}
                            <div className="space-y-4">
                                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] mb-4">// 环境检查报告_STATUS</h3>
                                {[
                                    "检测到用户自定义模型配置：系统已切换至最新的 Gemini 运行时。",
                                    "Solo Mode 流水线已就绪，所有新音频上传将触发全自动流程。",
                                    "智能断点续传已开启，手动恢复流水线将自动跳过已处理节点。"
                                ].map((txt, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 border border-white/5 bg-black/20 hover:bg-[var(--gpsx-accent-primary)]/[0.02] transition-colors group/item">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--gpsx-accent-primary)] mt-1.5 shadow-[0_0_8px_var(--gpsx-accent-primary)] group-hover/item:scale-125 transition-transform"></div>
                                        <span className="text-[11px] font-bold text-slate-400 tracking-wide uppercase leading-relaxed group-hover/item:text-slate-300 transition-colors">{txt}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 flex items-center justify-between bg-[var(--gpsx-bg-main)]/80">
                    <button
                        onClick={handleDontShowAgain}
                        className="text-[10px] font-black text-slate-600 hover:text-white transition-colors uppercase tracking-[0.3em] underline decoration-slate-800 underline-offset-8"
                    >
                        不再显示
                    </button>
                    <button
                        onClick={onClose}
                        className="gpsx-button px-12 py-3"
                    >
                        确认并进入系统
                    </button>
                </div>
            </div>
        </div >
    );
};

export default ConfigModal;
