import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(__dirname, '..', '..', 'storage', 'settings.json');

interface AppSettings {
    aliyunApiKey?: string;
    deepseekApiKeys?: string[];
    defaultMode?: string;
    defaultLanguage?: string;
    autoPolish?: boolean;
    chunkStrategy?: string;
    hotwords?: string[];
    defaultTemplateId?: string;
    defaultPolishModel?: 'deepseek' | 'gemini';
    promptTemplates?: PromptTemplate[];
    runtime?: {
        geminiModel: string;
        asrProvider: string;
        mode: string;
    };
}

interface PromptTemplate {
    id: string;
    name: string;
    description: string;
    prompt: string;
    isSystem?: boolean;
}

// Default templates
const defaultTemplates: PromptTemplate[] = [
    {
        id: 'professional',
        name: '专业正式',
        description: '适用于会议、报告和专业文档',
        prompt: `你是一位专业的文本编辑和转写质量分析师。

## 任务: 润色文本
将录音转写的口语化文本整理成流畅、专业的书面表达。

## 规则:
1. 删除口头禅、重复词和无意义的语气词
2. 规范标点符号，确保句子结构清晰
3. 修正语法错误和用词不当
4. 保持原意不变，不要过度改写
5. 保留专业术语和专有名词

## 输出要求:
仅输出润色后的文本，不要添加任何解释。`,
        isSystem: true
    },
    {
        id: 'casual',
        name: '轻松口语',
        description: '保留口语特色，仅修复低级错误',
        prompt: `你是一位文本编辑。

## 任务:
轻微润色口语文本，保留自然的对话语气。

## 规则:
1. 只删除明显的语病和错别字
2. 保留自然的口语表达和语气词
3. 不要将口语改成书面语
4. 保持说话人的个人风格

## 输出要求:
仅输出润色后的文本。`,
        isSystem: true
    },
    {
        id: 'academic',
        name: '学术论文',
        description: '将口语描述提升为严谨的学术表达',
        prompt: `你是一位资深学术编辑。

## 任务:
将口述内容转化为严谨的学术表达。

## 规则:
1. 使用学术语言规范表述
2. 添加适当的逻辑连接词
3. 确保论述的严谨性和连贯性
4. 避免口语化表达
5. 保持学术客观性

## 输出要求:
仅输出学术化处理后的文本。`,
        isSystem: true
    }
];

// Ensure storage directory exists
function ensureStorageDir() {
    const dir = path.dirname(SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Load settings from file
function loadSettings(): AppSettings {
    ensureStorageDir();
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('[Settings] Failed to load settings:', error);
    }
    // Return defaults
    return {
        defaultMode: 'solo',
        defaultLanguage: 'auto',
        autoPolish: true,
        chunkStrategy: 'paragraph',
        hotwords: [],
        defaultTemplateId: 'professional',
        defaultPolishModel: 'gemini',
        promptTemplates: defaultTemplates,
    };
}

// Save settings to file
function saveSettings(settings: AppSettings): void {
    ensureStorageDir();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
    console.log('[Settings] Settings saved');
}

// GET /api/settings - Get all settings
export const getSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = loadSettings();
        // Ensure default templates exist
        if (!settings.promptTemplates || settings.promptTemplates.length === 0) {
            settings.promptTemplates = defaultTemplates;
        }

        // Add runtime info
        settings.runtime = {
            geminiModel: process.env.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash',
            asrProvider: process.env.ASR_PROVIDER || 'aliyun',
            mode: 'SOLO'
        };

        res.json(settings);
    } catch (error: any) {
        console.error('[Settings] Get settings failed:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/settings - Update all settings
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
        const newSettings = req.body;
        const currentSettings = loadSettings();
        const merged = { ...currentSettings, ...newSettings };
        saveSettings(merged);
        res.json({ success: true, settings: merged });
    } catch (error: any) {
        console.error('[Settings] Update settings failed:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// PUT /api/settings/templates/:id - Update a specific template
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const updatedTemplate = req.body;
        const settings = loadSettings();

        const templates = settings.promptTemplates || defaultTemplates;
        const index = templates.findIndex(t => t.id === id);

        if (index === -1) {
            // Add new template
            templates.push({ ...updatedTemplate, id });
        } else {
            // Update existing
            templates[index] = { ...templates[index], ...updatedTemplate };
        }

        settings.promptTemplates = templates;
        saveSettings(settings);

        res.json({ success: true, template: templates.find(t => t.id === id) });
    } catch (error: any) {
        console.error('[Settings] Update template failed:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/settings/templates - Get all templates
export const getTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
        const settings = loadSettings();
        const templates = settings.promptTemplates || defaultTemplates;
        res.json(templates);
    } catch (error: any) {
        console.error('[Settings] Get templates failed:', error.message);
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/settings/templates/:id - Delete a specific template
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const settings = loadSettings();

        const templates = settings.promptTemplates || defaultTemplates;
        const templateToDelete = templates.find(t => t.id === id);

        if (!templateToDelete) {
            res.status(404).json({ error: 'Template not found' });
            return;
        }

        if (templateToDelete.isSystem) {
            res.status(400).json({ error: 'Cannot delete system core templates' });
            return;
        }

        settings.promptTemplates = templates.filter(t => t.id !== id);

        // If the deleted template was the default, reset it to the core system default
        if (settings.defaultTemplateId === id) {
            settings.defaultTemplateId = 'professional';
        }

        saveSettings(settings);

        res.json({ success: true, message: 'Template deleted' });
    } catch (error: any) {
        console.error('[Settings] Delete template failed:', error.message);
        res.status(500).json({ error: error.message });
    }
};
