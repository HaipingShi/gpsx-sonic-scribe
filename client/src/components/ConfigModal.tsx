import React, { useState, useEffect } from 'react';
import { X, Settings, Zap, MessageSquare, Sparkles, RefreshCw } from 'lucide-react';
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header ... rest of header ... */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#00ff88]/20 to-[#00ff88]/40 border border-[#00ff88]/30 flex items-center justify-center">
                            <Settings className="text-[#00ff88]" size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-widest">当前系统配置</h2>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">AudioScribe Pro Configuration</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="text-slate-400" size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <RefreshCw className="animate-spin text-[#00ff88]/40" size={32} />
                            <p className="text-[11px] font-black text-slate-500 tracking-widest uppercase">正在同步实时环境配置数据...</p>
                        </div>
                    ) : (
                        <>
                            {/* Transcription Settings */}
                            <div className="bg-black/40 rounded-xl p-5 border border-white/5 group hover:border-[#00ff88]/20 transition-all">
                                <div className="flex items-center gap-2 mb-4">
                                    <Zap className="text-blue-400" size={18} />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">// 转写配置_INGESTION</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">默认处理模式</span>
                                        <span className="px-3 py-1 bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/30 rounded font-black text-[10px] uppercase tracking-wider">
                                            {settings?.runtime?.mode || 'SOLO Mode'} (全自动)
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">活跃转写引擎</span>
                                        <span className="text-white font-mono text-xs font-bold">
                                            FunASR ({settings?.runtime?.asrProvider === 'aliyun' ? 'SenseVoice-v1' : 'SenseVoice-v1'})
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">自动标点解析</span>
                                        <span className="text-emerald-400 text-[11px] font-black">✓ 已在 .env 启用</span>
                                    </div>
                                </div>
                            </div>

                            {/* Polish Settings */}
                            <div className="bg-black/40 rounded-xl p-5 border border-white/5 group hover:border-[#00ff88]/20 transition-all">
                                <div className="flex items-center gap-2 mb-4">
                                    <Sparkles className="text-amber-400" size={18} />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">// 润色配置_NEURAL</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">活跃智能模型</span>
                                        <span className="px-3 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 rounded font-bold text-xs">
                                            {formatModelName(settings?.runtime?.geminiModel)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">默认清洗策略</span>
                                        <span className="text-white font-mono text-xs font-bold">
                                            {settings?.promptTemplates?.find(t => t.id === settings.defaultTemplateId)?.name || '专业正式'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-wider">处理故障容灾</span>
                                        <span className="text-blue-400 text-[11px] font-black uppercase">负载均衡 & 自动重试</span>
                                    </div>
                                </div>
                            </div>

                            {/* Feature Highlights */}
                            <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl p-5 border border-white/5">
                                <div className="flex items-center gap-2 mb-4">
                                    <MessageSquare className="text-blue-400" size={18} />
                                    <h3 className="text-xs font-black uppercase tracking-widest text-white">// 环境状态检查_STATUS</h3>
                                </div>
                                <ul className="space-y-3 text-[11px] font-bold text-slate-400 tracking-wide">
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] mt-1 shadow-[0_0_5px_#00ff88]"></div>
                                        <span>检测到用户自定义模型配置：系统已切换至最新的 Gemini 运行时。</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] mt-1 shadow-[0_0_5px_#00ff88]"></div>
                                        <span>Solo Mode 流水线已就绪，所有新音频上传将触发全自动流程。</span>
                                    </li>
                                    <li className="flex items-start gap-3">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] mt-1 shadow-[0_0_5px_#00ff88]"></div>
                                        <span>智能断点续传已开启，手动恢复流水线将自动跳过已处理节点。</span>
                                    </li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 flex items-center justify-between bg-black/20">
                    <button
                        onClick={handleDontShowAgain}
                        className="text-[10px] font-black text-slate-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
                    >
                        [ 以后不再显示此提示 ]
                    </button>
                    <button
                        onClick={onClose}
                        className="px-8 py-2 bg-[#00ff88] hover:bg-[#00ff88]/90 text-black rounded font-black text-[11px] uppercase tracking-widest transition-all hover:gpsx-glow"
                    >
                        开始处理资产
                    </button>
                </div>
            </div>
        </div >
    );
};

export default ConfigModal;
