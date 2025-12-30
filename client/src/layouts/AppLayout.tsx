import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { HelpCircle, X, Zap, FileAudio, Sparkles, Download, Settings } from 'lucide-react';

const AppLayout: React.FC = () => {
    const [showHelp, setShowHelp] = useState(false);

    return (
        <div className="min-h-screen bg-black flex overflow-hidden font-mono selection:bg-[#00ff88]/30 selection:text-[#00ff88]">
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative border-l border-white/5">
                <div className="gpsx-scanline"></div>

                {/* Top Header */}
                <header className="h-14 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-10 transition-all duration-300">
                    <div className="flex items-center gap-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></div>
                        <span className="text-[11px] font-black text-[#00ff88]/40 tracking-widest uppercase">
                            // 系统节点已上线
                        </span>
                    </div>

                    {/* Help Button */}
                    <button
                        onClick={() => setShowHelp(true)}
                        className="group flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-[#00ff88] transition-all border border-transparent hover:border-[#00ff88]/20 bg-transparent hover:bg-[#00ff88]/5"
                    >
                        <span className="text-[11px] font-bold tracking-widest uppercase">操作指南</span>
                        <HelpCircle size={16} className="group-hover:rotate-12 transition-transform" />
                    </button>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-[#020202]">
                    <div className="max-w-[1600px] mx-auto min-h-full">
                        <Outlet />
                    </div>
                </main>
            </div>

            {/* Help Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#050505] border border-[#00ff88]/20 w-full max-w-xl shadow-[0_0_50px_rgba(0,0,0,1)] animate-in zoom-in-95 duration-300 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"></div>

                        <div className="p-8 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 border border-[#00ff88]/40 flex items-center justify-center bg-[#00ff88]/10">
                                    <Zap className="w-5 h-5 text-[#00ff88] gpsx-glow" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white tracking-widest gpsx-glow">系统操作指南</h3>
                                    <p className="text-[#00ff88]/40 text-[11px] font-bold tracking-widest uppercase">Sonic Scribe v2.2.0_稳定版</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="w-8 h-8 border border-white/10 flex items-center justify-center text-slate-500 hover:text-white hover:border-[#00ff88]/40 transition-all hover:bg-[#00ff88]/10"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-8 space-y-3">
                            {[
                                { icon: <FileAudio className="text-blue-400" />, title: "语音采集转写", desc: "将音频波形数字化处理并转录为原始文本流", color: "blue" },
                                { icon: <Sparkles className="text-[#00ff88]" />, title: "AI 智能清洗", desc: "通过 GPSX 神经网络核心进行认知级文本润色", color: "green" },
                                { icon: <Download className="text-emerald-400" />, title: "数据资产导出", desc: "提取结构化智能资产，支持多种格式导出", color: "emerald" },
                                { icon: <Settings className="text-purple-400" />, title: "系统配置节点", desc: "自定义语义逻辑模式与全局处理参数", color: "purple" }
                            ].map((step, i) => (
                                <div key={i} className="flex items-start gap-5 p-5 border border-white/5 bg-black hover:border-[#00ff88]/20 transition-all group">
                                    <div className="w-10 h-10 flex items-center justify-center border border-white/10 group-hover:border-[#00ff88]/40 transition-all bg-white/[0.02]">
                                        {React.cloneElement(step.icon as React.ReactElement, { size: 18 })}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[11px] text-slate-600 font-bold">0{i + 1}:</span>
                                            <p className="text-white font-black text-[12px] tracking-widest uppercase">{step.title}</p>
                                        </div>
                                        <p className="text-slate-500 text-[11px] leading-relaxed uppercase tracking-wider">{step.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-black border-t border-white/5 flex items-center justify-between">
                            <span className="text-[11px] text-[#00ff88]/30 font-bold uppercase tracking-widest">
                                // 核心安全加密链路已建立
                            </span>
                            <button
                                onClick={() => setShowHelp(false)}
                                className="gpsx-button"
                            >
                                关闭操作指南
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppLayout;
