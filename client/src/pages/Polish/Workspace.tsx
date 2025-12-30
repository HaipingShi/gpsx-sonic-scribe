import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Sparkles, Play, Download, Copy, Check,
    RefreshCw, Loader2, AlertCircle, Wand2, ChevronDown, ChevronUp
} from 'lucide-react';
import { getProject, polishSingleChunk, getTemplates, getSettings, Project, PolishConfig, PromptTemplate } from '@/services/api';

interface ChunkData {
    id: string;
    index: number;
    rawText: string;
    polishedText: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
}

const PolishWorkspace: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [chunks, setChunks] = useState<ChunkData[]>([]);
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedChunk, setSelectedChunk] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [customFilename, setCustomFilename] = useState('');
    const [showPromptPanel, setShowPromptPanel] = useState(false);

    // Prompt configuration
    const [promptConfig, setPromptConfig] = useState<PolishConfig>({
        mode: 'professional',
        tone: '专业',
        cleaningRules: ['去除口头禅', '规范标点', '修正语病'],
        customInstructions: '',
    });

    // Model selection: 'deepseek' or 'gemini'
    const [selectedModel, setSelectedModel] = useState<'deepseek' | 'gemini'>('deepseek');

    // Template management
    const [templates, setTemplates] = useState<PromptTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>(() => {
        // Load last selected template from localStorage
        return localStorage.getItem('polishWorkspace_selectedTemplate') || 'professional';
    });
    const [showTemplatePreview, setShowTemplatePreview] = useState(false);

    // Load real project data and templates
    useEffect(() => {
        loadTemplates();
        loadSystemSettings();
        if (id) {
            loadProject();
        }
    }, [id]);

    // Save selected template to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('polishWorkspace_selectedTemplate', selectedTemplateId);
    }, [selectedTemplateId]);

    const loadTemplates = async () => {
        try {
            const data = await getTemplates();
            setTemplates(data);
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    };

    const loadSystemSettings = async () => {
        try {
            const settings = await getSettings();
            // Set default model from system settings (default to gemini)
            if (settings.defaultPolishModel) {
                setSelectedModel(settings.defaultPolishModel);
            } else {
                setSelectedModel('gemini'); // Default to gemini
            }
            // Set default template from system settings if not already in localStorage
            if (settings.defaultTemplateId && !localStorage.getItem('polishWorkspace_selectedTemplate')) {
                setSelectedTemplateId(settings.defaultTemplateId);
            }
        } catch (error) {
            console.error('Failed to load system settings:', error);
        }
    };

    // Get the currently selected template
    const selectedTemplate = templates.find(t => t.id === selectedTemplateId) || templates[0];

    // Build the effective prompt config with template + user instructions
    const getEffectiveConfig = (): PolishConfig => {
        const basePrompt = selectedTemplate?.prompt || '';
        const userInstructions = promptConfig.customInstructions?.trim();

        // Combine template prompt with user's additional instructions
        const combinedInstructions = userInstructions
            ? `${basePrompt}\n\n## 用户补充指令:\n${userInstructions}`
            : basePrompt;

        return {
            ...promptConfig,
            customInstructions: combinedInstructions,
        };
    };

    const loadProject = async () => {
        if (!id) return;

        try {
            setLoading(true);
            setError(null);
            const projectData = await getProject(id);
            setProject(projectData);

            // Transform project chunks to ChunkData format
            if (projectData.chunks && projectData.chunks.length > 0) {
                const transformedChunks: ChunkData[] = projectData.chunks
                    .filter(chunk => chunk.draftSegments && chunk.draftSegments.length > 0)
                    .map((chunk, index) => {
                        const rawText = chunk.draftSegments?.[0]?.text || '';
                        const polishedText = chunk.polishedSegments?.[0]?.text || '';

                        let status: ChunkData['status'] = 'pending';
                        if (polishedText) {
                            status = 'completed';
                        } else if (chunk.status === 'PROCESSING' || chunk.status === 'POLISHING') {
                            status = 'processing';
                        } else if (chunk.status === 'ERROR' || chunk.status === 'FAILED') {
                            status = 'error';
                        }

                        return {
                            id: chunk.id,
                            index: index + 1,
                            rawText,
                            polishedText,
                            status,
                        };
                    });

                setChunks(transformedChunks);
                if (transformedChunks.length > 0) {
                    setSelectedChunk(transformedChunks[0].id);
                }
            }
        } catch (err: any) {
            console.error('Failed to load project:', err);
            setError(err.message || '加载项目失败');
        } finally {
            setLoading(false);
        }
    };

    const completedCount = chunks.filter(c => c.status === 'completed').length;
    const progress = chunks.length > 0 ? (completedCount / chunks.length) * 100 : 0;

    const handleCopy = async (text: string, chunkId: string) => {
        await navigator.clipboard.writeText(text);
        setCopiedId(chunkId);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleExport = () => {
        const content = chunks.map(c => c.polishedText || c.rawText).join('\n\n');
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = customFilename || project?.originalFilename?.replace(/\.[^/.]+$/, '') || id;
        a.download = `${filename}_polished.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Polish a single chunk using selected model and effective config
    const handlePolishChunk = async (chunkId: string) => {
        if (!id) return;

        setChunks(prev => prev.map(c =>
            c.id === chunkId ? { ...c, status: 'processing' as const } : c
        ));

        try {
            // Use effective config that combines template + user instructions
            const effectiveConfig = getEffectiveConfig();
            const result = await polishSingleChunk(id, chunkId, effectiveConfig, selectedModel);

            if (result.success) {
                setChunks(prev => prev.map(c =>
                    c.id === chunkId
                        ? { ...c, status: 'completed' as const, polishedText: result.polishedText }
                        : c
                ));
            } else {
                throw new Error('润色失败');
            }
        } catch (error: any) {
            console.error('Polish error:', error);
            setChunks(prev => prev.map(c =>
                c.id === chunkId ? { ...c, status: 'error' as const } : c
            ));
        }
    };

    // Re-polish a chunk (clear old result and polish again)
    const handleRepolishChunk = async (chunkId: string) => {
        // Reset to pending state first
        setChunks(prev => prev.map(c =>
            c.id === chunkId ? { ...c, status: 'pending' as const, polishedText: '' } : c
        ));

        // Then polish again
        await handlePolishChunk(chunkId);
    };

    // Concurrent processing helper - process chunks with limited concurrency
    const processConcurrent = async (chunkIds: string[], concurrencyLimit: number = 5) => {
        const results: Promise<void>[] = [];
        const executing: Promise<void>[] = [];

        for (const chunkId of chunkIds) {
            const promise = handlePolishChunk(chunkId).then(() => {
                executing.splice(executing.indexOf(promise), 1);
            });

            results.push(promise);
            executing.push(promise);

            // When we hit the concurrency limit, wait for one to finish
            if (executing.length >= concurrencyLimit) {
                await Promise.race(executing);
            }
        }

        // Wait for all remaining to complete
        await Promise.all(results);
    };

    // Start polishing all pending chunks using concurrent API calls
    const handleStartPolish = async () => {
        if (!id) return;

        const pendingChunks = chunks.filter(c => c.status === 'pending');
        if (pendingChunks.length === 0) {
            alert('没有待处理的分块');
            return;
        }

        setIsProcessing(true);
        console.log(`[Polish] Starting concurrent polish of ${pendingChunks.length} chunks with 5 parallel workers`);

        // Use concurrent processing with 5 parallel workers (matching 5 API keys)
        await processConcurrent(pendingChunks.map(c => c.id), 5);

        setIsProcessing(false);
    };

    // Re-polish all chunks with concurrent processing
    const handleRepolishAll = async () => {
        if (!id) return;

        const confirmed = window.confirm('确定要重新润色所有分块吗？这将使用当前的 Prompt 设置覆盖现有结果。');
        if (!confirmed) return;

        setIsProcessing(true);
        console.log(`[Polish] Starting concurrent re-polish of ${chunks.length} chunks with 5 parallel workers`);

        // Reset all chunks
        setChunks(prev => prev.map(c => ({ ...c, status: 'pending' as const, polishedText: '' })));

        // Use concurrent processing
        await processConcurrent(chunks.map(c => c.id), 5);

        setIsProcessing(false);
    };

    if (loading) {
        return (
            <div className="h-[calc(100vh-64px)] flex items-center justify-center bg-[var(--gpsx-bg-main)]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-[var(--gpsx-accent-primary)] animate-spin mx-auto mb-4" />
                    <p className="text-slate-400">加载项目数据...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-[calc(100vh-64px)] flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/polish')}
                        className="text-amber-400 hover:text-amber-300"
                    >
                        ← 返回清洗任务列表
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] flex flex-col bg-[var(--gpsx-bg-main)]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/polish')}
                        className="text-slate-400 hover:text-white"
                    >
                        ← 返回
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-white flex items-center gap-2">
                            <Sparkles className="text-[var(--gpsx-accent-primary)]" size={20} />
                            清洗工作台
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {project?.originalFilename || `任务 ID: ${id}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Progress */}
                    <div className="flex items-center gap-3">
                        <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-[var(--gpsx-accent-primary)] to-[var(--gpsx-accent-secondary)] transition-all duration-500"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <span className="text-slate-400 text-sm">
                            {completedCount}/{chunks.length}
                        </span>
                    </div>

                    {/* Filename Input */}
                    <input
                        type="text"
                        value={customFilename}
                        onChange={(e) => setCustomFilename(e.target.value)}
                        placeholder={project?.originalFilename?.replace(/\.[^/.]+$/, '') || '输出文件名'}
                        className="px-3 py-2 bg-[var(--gpsx-bg-card)] border border-white/5 rounded-lg text-white text-sm w-32 focus:outline-none focus:ring-1 focus:ring-[var(--gpsx-accent-primary)]"
                    />

                    {/* Prompt Config Toggle */}
                    <button
                        onClick={() => setShowPromptPanel(!showPromptPanel)}
                        className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${showPromptPanel ? 'bg-[var(--gpsx-accent-secondary)]/20 text-[var(--gpsx-accent-secondary)]' : 'bg-white/5 text-slate-400 hover:text-white'
                            }`}
                        title="Prompt 设置"
                    >
                        <Wand2 size={18} />
                        {showPromptPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {/* Start/Re-polish Buttons */}
                    {completedCount < chunks.length ? (
                        <button
                            onClick={handleStartPolish}
                            disabled={isProcessing}
                            className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all ${isProcessing
                                ? 'bg-white/5 text-slate-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-[var(--gpsx-accent-secondary)] to-[var(--gpsx-accent-primary)] text-black hover:shadow-lg hover:shadow-[var(--gpsx-accent-primary)]/20'
                                }`}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    润色中...
                                </>
                            ) : (
                                <>
                                    <Play size={18} />
                                    开始润色
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleRepolishAll}
                            disabled={isProcessing}
                            className="px-4 py-2 bg-white/5 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-white/10 transition-colors"
                        >
                            <RefreshCw size={18} />
                            全部重新润色
                        </button>
                    )}

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="px-4 py-2 bg-[var(--gpsx-accent-primary)] text-black rounded-lg font-medium hover:bg-white transition-colors flex items-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.2)]"
                    >
                        <Download size={18} />
                        导出
                    </button>
                </div>
            </div>

            {/* Prompt Config Panel */}
            {showPromptPanel && (
                <div className="px-6 py-4 border-b border-white/5 bg-[var(--gpsx-bg-card)]/50 space-y-4">
                    {/* Row 1: Template Selector (Full Width) */}
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2">
                                🎯 Prompt 模板预设
                                {selectedTemplate && (
                                    <span className="text-xs px-2 py-0.5 bg-[var(--gpsx-accent-secondary)]/20 text-[var(--gpsx-accent-secondary)] rounded-full">
                                        当前: {selectedTemplate.name}
                                    </span>
                                )}
                            </label>
                            <select
                                value={selectedTemplateId}
                                onChange={(e) => setSelectedTemplateId(e.target.value)}
                                className="w-full px-4 py-3 bg-[var(--gpsx-bg-main)] border border-white/5 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[var(--gpsx-accent-secondary)]"
                            >
                                {templates.length === 0 ? (
                                    <option value="">加载中...</option>
                                ) : (
                                    templates.map(tpl => (
                                        <option key={tpl.id} value={tpl.id}>
                                            {tpl.name} — {tpl.description}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>

                        {/* Template Preview Toggle */}
                        <button
                            onClick={() => setShowTemplatePreview(!showTemplatePreview)}
                            className={`px-3 py-3 rounded-lg text-sm font-medium transition-colors ${showTemplatePreview
                                ? 'bg-[var(--gpsx-accent-secondary)]/20 text-[var(--gpsx-accent-secondary)] border border-[var(--gpsx-accent-secondary)]'
                                : 'bg-[var(--gpsx-bg-main)] text-slate-400 border border-white/5 hover:text-white'
                                }`}
                        >
                            {showTemplatePreview ? '隐藏 Prompt' : '预览 Prompt'}
                        </button>
                    </div>

                    {/* Template Prompt Preview */}
                    {showTemplatePreview && selectedTemplate && (
                        <div className="p-4 bg-[var(--gpsx-bg-main)] border border-white/5 rounded-xl">
                            <p className="text-xs text-slate-500 mb-2 uppercase tracking-wide">模板核心 Prompt</p>
                            <pre className="text-slate-300 text-sm whitespace-pre-wrap font-mono leading-relaxed max-h-40 overflow-y-auto">
                                {selectedTemplate.prompt}
                            </pre>
                        </div>
                    )}

                    {/* Row 2: Model & Tone */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Model Selection */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">AI 模型</label>
                            <select
                                value={selectedModel}
                                onChange={(e) => setSelectedModel(e.target.value as 'deepseek' | 'gemini')}
                                className="w-full px-3 py-2 bg-[var(--gpsx-bg-main)] border border-white/5 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gpsx-accent-secondary)]"
                            >
                                <option value="deepseek">DeepSeek (5 Keys)</option>
                                <option value="gemini">Gemini Flash</option>
                            </select>
                        </div>

                        {/* Tone Selection */}
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">润色风格</label>
                            <select
                                value={promptConfig.tone}
                                onChange={(e) => setPromptConfig(prev => ({ ...prev, tone: e.target.value }))}
                                className="w-full px-3 py-2 bg-[var(--gpsx-bg-main)] border border-white/5 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--gpsx-accent-secondary)]"
                            >
                                <option value="专业">专业正式</option>
                                <option value="口语">口语化</option>
                                <option value="学术">学术严谨</option>
                                <option value="新闻">新闻报道</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Cleaning Rules */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">清洗规则</label>
                        <div className="flex flex-wrap gap-2">
                            {['去除口头禅', '规范标点', '修正语病', '分段整理'].map(rule => (
                                <button
                                    key={rule}
                                    onClick={() => {
                                        setPromptConfig(prev => ({
                                            ...prev,
                                            cleaningRules: prev.cleaningRules.includes(rule)
                                                ? prev.cleaningRules.filter(r => r !== rule)
                                                : [...prev.cleaningRules, rule]
                                        }));
                                    }}
                                    className={`px-3 py-1.5 text-xs rounded-full transition-colors ${promptConfig.cleaningRules.includes(rule)
                                        ? 'bg-[var(--gpsx-accent-secondary)]/30 text-[var(--gpsx-accent-secondary)] border border-[var(--gpsx-accent-secondary)]'
                                        : 'bg-[var(--gpsx-bg-main)] text-slate-400 border border-white/5'
                                        }`}
                                >
                                    {rule}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Row 4: User Additional Instructions */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">
                            ✏️ 额外指令 <span className="text-xs text-slate-600">(会附加到模板 Prompt 末尾)</span>
                        </label>
                        <textarea
                            value={promptConfig.customInstructions}
                            onChange={(e) => setPromptConfig(prev => ({ ...prev, customInstructions: e.target.value }))}
                            placeholder="例如：保留所有数字、保留「胖猫」这个专有名词、这是一段讲述心理学的内容..."
                            className="w-full px-4 py-3 bg-[var(--gpsx-bg-main)] border border-white/5 rounded-lg text-white text-sm h-20 resize-none focus:outline-none focus:ring-1 focus:ring-[var(--gpsx-accent-secondary)] placeholder-slate-600"
                        />
                    </div>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chunk List - Raw Text */}
                <div className="w-1/2 border-r border-white/5 flex flex-col">
                    <div className="px-4 py-3 border-b border-white/5 bg-[var(--gpsx-bg-card)]/30">
                        <h2 className="text-sm font-bold text-slate-300">原始文本</h2>
                        <p className="text-xs text-slate-500">点击分块查看详情</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chunks.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">暂无转写内容</div>
                        ) : (
                            chunks.map((chunk) => (
                                <div
                                    key={chunk.id}
                                    onClick={() => setSelectedChunk(chunk.id)}
                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedChunk === chunk.id
                                        ? 'border-[var(--gpsx-accent-primary)] bg-[var(--gpsx-accent-primary)]/10'
                                        : 'border-white/5 bg-white/[0.02] hover:border-white/20'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-[var(--gpsx-accent-primary)]">#{chunk.index}</span>
                                        <span className="text-xs text-slate-500">{chunk.rawText.length} 字</span>
                                    </div>
                                    <p className="text-sm text-slate-300 line-clamp-3">{chunk.rawText}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Polished Result */}
                <div className="w-1/2 flex flex-col">
                    <div className="px-4 py-3 border-b border-white/5 bg-[var(--gpsx-bg-card)]/30">
                        <h2 className="text-sm font-bold text-slate-300">润色结果</h2>
                        <p className="text-xs text-slate-500">DeepSeek 润色后</p>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {chunks.length === 0 ? (
                            <div className="text-center py-12 text-slate-500">暂无润色结果</div>
                        ) : (
                            chunks.map((chunk) => (
                                <div
                                    key={chunk.id}
                                    className={`p-4 rounded-xl border transition-all ${selectedChunk === chunk.id
                                        ? 'border-[var(--gpsx-accent-secondary)] bg-[var(--gpsx-accent-secondary)]/10'
                                        : 'border-white/5 bg-white/[0.02]'
                                        }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-[var(--gpsx-accent-secondary)]">#{chunk.index}</span>
                                        <div className="flex items-center gap-2">
                                            {chunk.status === 'processing' && (
                                                <span className="flex items-center gap-1 text-xs text-[var(--gpsx-accent-secondary)]">
                                                    <Loader2 size={12} className="animate-spin" />
                                                    处理中
                                                </span>
                                            )}
                                            {chunk.status === 'completed' && (
                                                <>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleRepolishChunk(chunk.id); }}
                                                        className="text-slate-400 hover:text-[var(--gpsx-accent-secondary)] transition-colors"
                                                        title="重新润色"
                                                    >
                                                        <RefreshCw size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleCopy(chunk.polishedText, chunk.id); }}
                                                        className="text-slate-400 hover:text-white transition-colors"
                                                    >
                                                        {copiedId === chunk.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                                    </button>
                                                </>
                                            )}
                                            {chunk.status === 'pending' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePolishChunk(chunk.id); }}
                                                    className="text-xs px-2 py-1 bg-[var(--gpsx-accent-secondary)]/20 text-[var(--gpsx-accent-secondary)] rounded hover:bg-[var(--gpsx-accent-secondary)]/30 transition-colors"
                                                >
                                                    润色
                                                </button>
                                            )}
                                            {chunk.status === 'error' && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handlePolishChunk(chunk.id); }}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <RefreshCw size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <p className={`text-sm line-clamp-3 ${chunk.polishedText ? 'text-slate-300' : 'text-slate-500 italic'
                                        }`}>
                                        {chunk.polishedText || (chunk.status === 'processing' ? '正在润色...' : '等待润色')}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PolishWorkspace;
