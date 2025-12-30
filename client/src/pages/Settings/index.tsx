import React, { useState, useEffect } from 'react';
import {
    Settings, Key, Cpu, Trash2, Save, Hash,
    MessageSquare, Plus, Edit3, X, Check,
    AlertCircle, Loader2
} from 'lucide-react';
import { getSettings, updateSettings, updateTemplate, deleteTemplate, AppSettings, PromptTemplate } from '@/services/api';

import { cn } from '@/lib/utils';

const SettingsPage: React.FC = () => {
    const [settings, setSettings] = useState<AppSettings>({
        aliyunApiKey: '',
        deepseekApiKeys: [],
        defaultMode: 'solo',
        defaultLanguage: 'auto',
        autoPolish: true,
        chunkStrategy: 'paragraph',
        hotwords: [],
        promptTemplates: [],
    });

    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
    const [editingPrompt, setEditingPrompt] = useState('');
    const [editingName, setEditingName] = useState('');
    const [newHotword, setNewHotword] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await getSettings();
            setSettings(data);
        } catch (error) {
            console.error('Failed to load settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaveStatus('saving');
            await updateSettings(settings);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleSaveTemplate = async () => {
        if (!editingTemplate) return;

        try {
            setSaveStatus('saving');
            await updateTemplate(editingTemplate.id, {
                ...editingTemplate,
                name: editingName,
                prompt: editingPrompt,
            });

            setSettings(prev => ({
                ...prev,
                promptTemplates: prev.promptTemplates?.map(t =>
                    t.id === editingTemplate.id
                        ? { ...t, name: editingName, prompt: editingPrompt }
                        : t
                ),
            }));

            setEditingTemplate(null);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error) {
            console.error('Failed to save template:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm('确定要删除这个精炼方案吗？此操作无法撤销。')) return;

        try {
            setSaveStatus('saving');
            await deleteTemplate(id);

            setSettings(prev => ({
                ...prev,
                promptTemplates: prev.promptTemplates?.filter(t => t.id !== id),
                defaultTemplateId: prev.defaultTemplateId === id ? 'professional' : prev.defaultTemplateId
            }));

            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (error: any) {
            console.error('Failed to delete template:', error);
            alert(`删除模板失败: ${error.response?.data?.error || error.message}`);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    };

    const addHotword = () => {
        if (newHotword.trim() && !settings.hotwords?.includes(newHotword.trim())) {
            setSettings(s => ({ ...s, hotwords: [...(s.hotwords || []), newHotword.trim()] }));
            setNewHotword('');
        }
    };

    const removeHotword = (word: string) => {
        setSettings(s => ({ ...s, hotwords: s.hotwords?.filter(w => w !== word) }));
    };

    const addKey = () => {
        setSettings(s => ({ ...s, deepseekApiKeys: [...(s.deepseekApiKeys || []), ''] }));
    };

    const updateKey = (index: number, value: string) => {
        const newKeys = [...(settings.deepseekApiKeys || [])];
        newKeys[index] = value;
        setSettings(s => ({ ...s, deepseekApiKeys: newKeys }));
    };

    const removeKey = (index: number) => {
        setSettings(s => ({ ...s, deepseekApiKeys: s.deepseekApiKeys?.filter((_, i) => i !== index) }));
    };

    const createNewTemplate = () => {
        const newTemplate: PromptTemplate = {
            id: 'custom-' + Date.now(),
            name: '新精炼方案_ALPHA',
            description: '用户自定义的AI精炼逻辑方案',
            prompt: '在此处输入系统提示词(System Prompt)...',
            isSystem: false
        };
        openTemplateEditor(newTemplate);
    };

    const openTemplateEditor = (tpl: PromptTemplate) => {
        setEditingTemplate(tpl);
        setEditingName(tpl.name);
        setEditingPrompt(tpl.prompt);
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center min-h-[400px] font-mono">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-10 h-10 text-[#00ff88] animate-spin" />
                    <p className="text-[#00ff88] text-[12px] font-black uppercase tracking-widest">正在查询系统状态...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-12 max-w-7xl mx-auto font-mono bg-black min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white flex items-center gap-4 uppercase tracking-widest">
                        <Settings className="text-[#00ff88] gpsx-glow" size={32} />
                        系统控制中心
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 text-sm font-bold uppercase tracking-widest">
                        <span className="text-[#00ff88]/40">//</span>
                        协议管理: [ 核心配置 / 密钥库 / AI模板 ]
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving'}
                    className={cn(
                        "gpsx-button px-10 py-3",
                        saveStatus === 'saved' && "bg-[#00ff88] text-black border-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)]",
                        saveStatus === 'error' && "bg-red-500 text-white border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]"
                    )}
                >
                    {saveStatus === 'saving' ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : saveStatus === 'saved' ? (
                        <Check size={18} />
                    ) : saveStatus === 'error' ? (
                        <AlertCircle size={18} />
                    ) : (
                        <Save size={18} />
                    )}
                    {saveStatus === 'saving' ? '正在同步...' : saveStatus === 'saved' ? '同步成功' : saveStatus === 'error' ? '保存失败' : '保存系统设置'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Column 1 */}
                <div className="space-y-10">
                    {/* API Configuration */}
                    <div className="bg-[#050505] border border-white/5 p-8 space-y-8 relative overflow-hidden group">
                        <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Key size={18} className="text-[#00ff88] group-hover:gpsx-glow transition-all" />
                                接口授权管理
                            </h2>
                            <span className="px-2 py-0.5 border border-[#00ff88]/20 text-[#00ff88] text-[11px] font-black uppercase tracking-widest">加密库</span>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-slate-400 text-[12px] font-black mb-3 uppercase tracking-widest">[01] 阿里云语音识别 (FunASR) 密钥</label>
                                <div className="relative group/input">
                                    <input
                                        type="password"
                                        value={settings.aliyunApiKey || ''}
                                        onChange={(e) => setSettings(s => ({ ...s, aliyunApiKey: e.target.value }))}
                                        className="w-full p-4 bg-black border border-white/5 text-white focus:border-[#00ff88]/40 outline-none transition-all font-mono text-xs uppercase"
                                        placeholder="sk-****************"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div className="flex items-center justify-between">
                                    <label className="block text-slate-400 text-[12px] font-black mb-1 uppercase tracking-widest">[02] DeepSeek 文本精炼负载均衡密钥池</label>
                                    <button onClick={addKey} className="text-[12px] text-[#00ff88] hover:text-white font-black flex items-center gap-1 transition-colors uppercase tracking-widest">
                                        <Plus size={12} /> 添加节点
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(settings.deepseekApiKeys || []).map((key, i) => (
                                        <div key={i} className="flex gap-2 animate-in slide-in-from-left-2 duration-300">
                                            <input
                                                type="password"
                                                value={key}
                                                onChange={(e) => updateKey(i, e.target.value)}
                                                className="flex-1 p-4 bg-black border border-white/5 text-white focus:border-blue-500/40 outline-none transition-all font-mono text-sm"
                                                placeholder={`节点_${String(i + 1).padStart(2, '0')}`}
                                            />
                                            <button
                                                onClick={() => removeKey(i)}
                                                className="p-4 text-slate-700 hover:text-red-500 bg-white/5 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-slate-500 italic font-bold uppercase tracking-wider">自动执行负载均衡轮询，确保API响应稳定性。</p>
                            </div>
                        </div>
                    </div>

                    {/* Hotwords Manager */}
                    <div className="bg-[#050505] border border-white/5 p-8 space-y-6 relative overflow-hidden group">
                        <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Hash size={18} className="text-amber-500 group-hover:gpsx-glow" />
                            专用术语加固库
                        </h2>
                        <p className="text-slate-400 text-[12px] font-bold uppercase tracking-widest leading-loose">受保护的专有名词数据库，确保在AI自动化清洗过程中保持专业准确性。</p>

                        <div className="bg-black border border-white/5 p-6 min-h-[140px] flex flex-wrap gap-3 content-start">
                            {(settings.hotwords || []).map((word, i) => (
                                <span key={i} className="px-3 py-1.5 bg-amber-500/5 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-3 group/tag hover:border-amber-400 transition-all">
                                    {word}
                                    <button onClick={() => removeHotword(word)} className="text-amber-500/30 hover:text-red-500 transition-colors">
                                        <X size={12} />
                                    </button>
                                </span>
                            ))}
                            {(settings.hotwords || []).length === 0 && <span className="text-slate-700 italic text-[12px] font-black uppercase tracking-widest mx-auto my-auto">// 暂无术语</span>}
                        </div>

                        <div className="flex gap-[1px] bg-white/5">
                            <input
                                type="text"
                                value={newHotword}
                                onChange={(e) => setNewHotword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addHotword()}
                                placeholder="输入术语标识符..."
                                className="flex-1 p-4 bg-black border-none text-white outline-none focus:ring-0 text-sm uppercase tracking-widest"
                            />
                            <button
                                onClick={addHotword}
                                className="px-8 bg-[#00ff88] text-black font-black text-[12px] uppercase tracking-widest hover:bg-white transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.1)]"
                            >
                                注入资产
                            </button>
                        </div>
                    </div>
                </div>

                {/* Column 2 */}
                <div className="space-y-10">
                    {/* Processing Defaults */}
                    <div className="bg-[#050505] border border-white/5 p-8 space-y-10 relative overflow-hidden group">
                        <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Cpu size={18} className="text-blue-500 group-hover:gpsx-glow" />
                            自动化执行协议
                        </h2>

                        <div className="space-y-4">
                            <label className="block text-slate-400 text-[12px] font-black uppercase tracking-widest">默认目标语种识别</label>
                            <select
                                value={settings.defaultLanguage || 'auto'}
                                onChange={(e) => setSettings(s => ({ ...s, defaultLanguage: e.target.value }))}
                                className="w-full p-4 bg-black border border-white/5 text-white outline-none cursor-pointer text-sm font-black uppercase tracking-widest focus:border-blue-500/40"
                            >
                                <option value="auto">智能探测分析</option>
                                <option value="zh">简体中文</option>
                                <option value="en">标准英语</option>
                            </select>
                        </div>

                        <div className="space-y-6 pt-2">
                            <div
                                onClick={() => setSettings(s => ({ ...s, autoPolish: !s.autoPolish }))}
                                className={cn(
                                    "p-6 border flex items-center justify-between cursor-pointer transition-all uppercase tracking-widest",
                                    settings.autoPolish ? 'bg-[#00ff88]/5 border-[#00ff88]/20' : 'bg-black border-white/5'
                                )}
                            >
                                <div>
                                    <p className={cn("text-[12px] font-black transition-colors", settings.autoPolish ? "text-[#00ff88]" : "text-white")}>
                                        即时开启 AI 文本精炼工作流
                                    </p>
                                    <p className="text-slate-500 text-[11px] mt-1 font-bold">在语音转写完成后自动触发 AI 精炼引擎</p>
                                </div>
                                <div className={cn("w-10 h-5 border transition-all relative", settings.autoPolish ? 'border-[#00ff88]' : 'border-slate-700')}>
                                    <div className={cn("absolute top-0.5 h-3.5 w-3.5 transition-all", settings.autoPolish ? 'left-5.5 bg-[#00ff88]' : 'left-0.5 bg-slate-700')} />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-slate-400 text-[12px] font-black uppercase tracking-widest">当前激活的 AI 精炼模板</label>
                                <select
                                    value={settings.defaultTemplateId || 'professional'}
                                    onChange={(e) => setSettings(s => ({ ...s, defaultTemplateId: e.target.value }))}
                                    className="w-full p-4 bg-black border border-white/5 text-white outline-none cursor-pointer text-sm font-black uppercase tracking-widest focus:border-[#00ff88]/40"
                                >
                                    {(settings.promptTemplates || []).map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {tpl.name}_方案
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-slate-400 text-[12px] font-black uppercase tracking-widest">AI 逻辑底座引擎选择</label>
                                <select
                                    value={settings.defaultPolishModel || 'gemini'}
                                    onChange={(e) => setSettings(s => ({ ...s, defaultPolishModel: e.target.value as 'deepseek' | 'gemini' }))}
                                    className="w-full p-4 bg-black border border-white/5 text-white outline-none cursor-pointer text-sm font-black uppercase tracking-widest focus:border-blue-500/40"
                                >
                                    <option value="gemini">Google Gemini 3 Flash (核心方案)</option>
                                    <option value="deepseek">DeepSeek V3 高速集群 (备选方案)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Prompt Template Customizer */}
                    <div className="bg-[#050505] border border-white/5 p-8 space-y-8 relative overflow-hidden group">
                        <div className="gpsx-scanline opacity-5 pointer-events-none"></div>
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <MessageSquare size={18} className="text-[#00ff88] group-hover:gpsx-glow" />
                                AI 精炼模板预设
                            </h2>
                            <button
                                onClick={createNewTemplate}
                                className="text-[12px] text-[#00ff88] hover:text-white font-black flex items-center gap-1 transition-colors uppercase tracking-widest"
                            >
                                <Plus size={12} /> 创建新方案
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            {(settings.promptTemplates || []).map((tpl) => (
                                <div key={tpl.id} className="p-6 bg-black border border-white/5 group/tpl hover:border-[#00ff88]/30 transition-all flex items-center justify-between">
                                    <div className="flex-1 min-w-0 pr-4">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-white text-[12px] font-black uppercase tracking-widest">{tpl.name}</span>
                                            {tpl.isSystem && <span className="text-[11px] border border-[#00ff88]/20 text-[#00ff88] px-1 font-black">系统核心</span>}
                                        </div>
                                        <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest truncate">{tpl.description}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => openTemplateEditor(tpl)}
                                            className="px-4 py-2 border border-white/5 text-slate-400 hover:text-[#00ff88] hover:border-[#00ff88]/30 text-[12px] font-black uppercase tracking-widest transition-all"
                                        >
                                            调整方案
                                        </button>
                                        {!tpl.isSystem && (
                                            <button
                                                onClick={() => handleDeleteTemplate(tpl.id)}
                                                className="p-2 border border-white/5 text-slate-700 hover:text-red-500 hover:border-red-500/30 transition-all"
                                                title="DELETE_TEMPLATE"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Template Editor Modal Overlay */}
            {editingTemplate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-black/95 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-[#050505] border border-white/10 w-full max-w-4xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300">
                        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-black">
                            <div>
                                <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-widest">
                                    <Edit3 size={20} className="text-[#00ff88]" />
                                    配置 AI 精炼方案: {editingTemplate.name}
                                </h3>
                                <p className="text-slate-500 text-[11px] mt-2 font-bold uppercase tracking-widest">覆盖当前的神经网络处理逻辑参数</p>
                            </div>
                            <button onClick={() => setEditingTemplate(null)} className="p-3 text-slate-500 hover:text-white border border-transparent hover:border-white/5 transition-all">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-10 space-y-8">
                            <div>
                                <label className="block text-slate-400 text-[12px] font-black mb-3 uppercase tracking-widest">方案识别名称标识</label>
                                <input
                                    type="text"
                                    value={editingName}
                                    onChange={(e) => setEditingName(e.target.value)}
                                    className="w-full p-4 bg-black border border-white/5 text-white text-sm font-black uppercase tracking-widest outline-none focus:border-[#00ff88]/40"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-[12px] font-black mb-3 uppercase tracking-widest flex items-center justify-between">
                                    AI 精炼系统提示词 (System Prompt)
                                    <span className="text-slate-600 font-black text-[11px]">可用占位符: [PREVIOUS_CONTEXT], [RAW_TEXT]</span>
                                </label>
                                <textarea
                                    value={editingPrompt}
                                    onChange={(e) => setEditingPrompt(e.target.value)}
                                    className="w-full h-96 p-6 bg-black border border-white/5 text-white font-mono text-sm leading-relaxed resize-none focus:border-[#00ff88]/40 outline-none scrollbar-thin scrollbar-thumb-white/5"
                                />
                            </div>
                        </div>
                        <div className="p-8 bg-black border-t border-white/5 flex justify-end gap-6">
                            <button
                                onClick={() => setEditingTemplate(null)}
                                className="px-8 py-3 text-slate-500 hover:text-white text-[12px] font-black uppercase tracking-widest transition-all"
                            >
                                放弃修改
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={saveStatus === 'saving'}
                                className="gpsx-button px-10 py-3"
                            >
                                {saveStatus === 'saving' && <Loader2 size={16} className="animate-spin" />}
                                同步方案数据
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Version Info Footer */}
            <div className="flex items-center justify-center gap-6 text-[11px] text-slate-700 font-black uppercase tracking-widest pt-12 border-t border-white/5">
                <span>[ 声纹转换中心 V2.5.0 ]</span>
                <span className="text-[#00ff88]/20">/</span>
                <span>[ 运行状态: 最佳 ]</span>
                <span className="text-[#00ff88]/20">/</span>
                <span className="flex items-center gap-2 text-[#00ff88]/40">
                    <div className="w-1 h-1 bg-[#00ff88] rounded-full animate-pulse shadow-[0_0_5px_#00ff88]" />
                    系统安全节点已激活
                </span>
            </div>
        </div>
    );
};

export default SettingsPage;
