import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || '';

if (!GEMINI_API_KEY) {
    console.warn('[Gemini] No API key configured. Set API_KEY or GEMINI_API_KEY in .env');
}

export interface GeminiPolishingConfig {
    mode?: string;
    tone?: string;
    cleaningRules?: string[];
    customInstructions?: string;
}

interface GeminiPolishContext {
    previousContext: string;
    currentRawText: string;
    config?: GeminiPolishingConfig;
}

export interface GeminiPolishResult {
    polishedText: string;
    hasRepetition: boolean;
    repetitionWarnings?: string[];
}

/**
 * Polish text using Gemini 3 Flash
 */
export const polishChunkWithGemini = async ({
    previousContext,
    currentRawText,
    config
}: GeminiPolishContext): Promise<GeminiPolishResult> => {
    if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured');
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const modelName = process.env.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    console.log(`[Gemini] Using model: ${modelName}`);
    const model = genAI.getGenerativeModel({ model: modelName });

    const mode = config?.mode || 'Rewrite & Polish';
    const tone = config?.tone || '专业';
    const rules = config?.cleaningRules || [];
    let custom = config?.customInstructions || '';

    // Advanced Placeholder Handling: Replace user template tags with actual data
    if (custom.includes('[RAW_TEXT]')) {
        custom = custom.replace(/\[RAW_TEXT\]/g, currentRawText);
    }
    if (custom.includes('[PREVIOUS_CONTEXT]')) {
        custom = custom.replace(/\[PREVIOUS_CONTEXT\]/g, previousContext || '(无上文信息)');
    }

    let taskDescription = "润色以下文本，使其流畅、专业。";
    if (mode === 'Clean Only') taskDescription = "仅修正语法和标点，不改写句子。";
    if (mode === 'Summarize') taskDescription = "提供一个简洁的摘要。";
    if (mode === 'Structure/Format') taskDescription = "将文本整理为清晰的段落结构。";

    const cleaningInstructions = rules.length > 0 ? `清洗规则: ${rules.join(', ')}` : "";

    // If user provided a complex custom prompt (with headers), we should be less intrusive
    const isComplexTemplate = custom.includes('#');

    // Aggressive Isolation for complex user templates
    const basePersona = isComplexTemplate
        ? `你是一位专业的文本主编。`
        : `你是一位专业的文本编辑和转写质量分析师。`;

    const instructionsSection = isComplexTemplate
        ? `请严格执行以下用户自定义的润色协议，不要被默认规则干扰:`
        : `${taskDescription}\n${tone ? `目标语气: ${tone}` : ''}\n${cleaningInstructions}`;

    const prompt = `${basePersona}

## 任务: 润色文本
${instructionsSection}

${!isComplexTemplate ? `## 基础规则 (通用)
1. 修正语音识别错误（同音字、口吃）
2. 完美保留原意，严禁捏造事实
3. 如果输入文本缺少标点，请补齐。` : ''}

${custom ? `## 用户自定义精炼协议 (核心执行)
${custom}` : ''}

---
${!custom.includes(previousContext) && previousContext ? `[上文记录]
${previousContext.slice(-1500)}` : ''}

${!custom.includes(currentRawText) ? `[待处理原始文本]
${currentRawText}` : ''}
---

润色结果:`;

    try {
        console.log('[Gemini] Starting polish request...');

        // Add 30s timeout
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gemini API request timed out after 30s')), 30000)
        );

        const result = await Promise.race([
            model.generateContent(prompt),
            timeout
        ]) as any;

        const response = await result.response;
        const polishedText = response.text().trim();

        console.log('[Gemini] Polish completed successfully');

        return {
            polishedText: polishedText || currentRawText,
            hasRepetition: false,
            repetitionWarnings: [],
        };
    } catch (error: any) {
        console.error('[Gemini] Polish error:', error.message);
        throw error;
    }
};

/**
 * Simple polish function for backward compatibility
 */
export const polishChunkGemini = async (context: GeminiPolishContext): Promise<string> => {
    const result = await polishChunkWithGemini(context);
    return result.polishedText;
};
