import OpenAI from 'openai';

// Multi-API Key Support: Use comma-separated keys in DEEPSEEK_API_KEYS for load balancing
const DEEPSEEK_API_KEYS = (process.env.DEEPSEEK_API_KEYS || process.env.DEEPSEEK_API_KEY || '').split(',').filter(Boolean);
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1';

if (DEEPSEEK_API_KEYS.length === 0) {
    console.warn('[DeepSeek] No API keys configured. Set DEEPSEEK_API_KEY or DEEPSEEK_API_KEYS in .env');
}

// Round-robin key selection for load balancing
let currentKeyIndex = 0;

function getNextClient(): OpenAI {
    if (DEEPSEEK_API_KEYS.length === 0) {
        throw new Error('DEEPSEEK_API_KEY or DEEPSEEK_API_KEYS not configured');
    }
    const key = DEEPSEEK_API_KEYS[currentKeyIndex % DEEPSEEK_API_KEYS.length];
    currentKeyIndex++;
    console.log(`[DeepSeek] Using API key index ${(currentKeyIndex - 1) % DEEPSEEK_API_KEYS.length + 1}/${DEEPSEEK_API_KEYS.length}`);
    return new OpenAI({
        apiKey: key.trim(),
        baseURL: DEEPSEEK_BASE_URL,
    });
}

export interface PolishingConfig {
    mode?: 'Clean Only' | 'Rewrite & Polish' | 'Summarize' | 'Structure/Format';
    tone?: string;
    cleaningRules?: string[];
    customInstructions?: string;
}

interface PolishingContext {
    previousContext: string;
    currentRawText: string;
    config?: PolishingConfig;
}

export interface PolishResult {
    polishedText: string;
    hasRepetition: boolean;
    repetitionWarnings?: string[];
}

/**
 * Polish chunk with integrated repetition detection
 * Replaces separate hallucination validation step
 */
export const polishChunkWithValidation = async ({
    previousContext,
    currentRawText,
    config
}: PolishingContext): Promise<PolishResult> => {
    const client = getNextClient();

    const mode = config?.mode || 'Rewrite & Polish';
    const tone = config?.tone || 'Professional';
    const rules = config?.cleaningRules || [];
    let custom = config?.customInstructions || '';

    // Advanced Placeholder Handling
    if (custom.includes('[RAW_TEXT]')) {
        custom = custom.replace(/\[RAW_TEXT\]/g, currentRawText);
    }
    if (custom.includes('[PREVIOUS_CONTEXT]')) {
        custom = custom.replace(/\[PREVIOUS_CONTEXT\]/g, previousContext || '(No previous context)');
    }

    let taskDescription = "Polish the [CURRENT_RAW_TEXT] into fluent, professional text.";
    if (mode === 'Clean Only') taskDescription = "Fix grammar and punctuation only. Do not rewrite sentences.";
    if (mode === 'Summarize') taskDescription = "Provide a concise summary of the [CURRENT_RAW_TEXT].";
    if (mode === 'Structure/Format') taskDescription = "Organize the [CURRENT_RAW_TEXT] into clear markdown sections.";

    const cleaningInstructions = rules.length > 0 ? `Cleaning Rules: ${rules.join(', ')}` : "";

    const isComplexTemplate = custom.includes('#');

    // Aggressive Isolation: If it's a complex template, suppress system defaults
    // Aggressive Isolation: If it's a complex template, suppress system defaults
    const systemPrompt = isComplexTemplate
        ? `You are a professional content editor.
Strict Protocol: Follow the user's custom instructions exactly. Do not add metadata or extra commentary.

## Response Format (JSON):
{
  "polishedText": "string",
  "hasRepetition": boolean,
  "repetitionWarnings": ["string"]
}`
        : `You are a professional content editor.

## Task: Polish
${taskDescription}
Target Tone: ${tone}.
${cleaningInstructions}

## Task 1.5: Punctuation (CRITICAL)
Add appropriate punctuation and paragraph breaks if missing.

## Task 2: Repetition Detection
Analyze for semantic repetition.

## Rules:
1. Fix ASR errors (homophones, stuttering).
2. Maintain the original meaning perfectly.
${custom && !isComplexTemplate ? `\n## Custom instructions:\n${custom}` : ''}

## Response Format (JSON):
{
  "polishedText": "string",
  "hasRepetition": boolean,
  "repetitionWarnings": ["string"]
}`;

    const userPrompt = isComplexTemplate
        ? custom
        : `[PREVIOUS_CONTEXT]\n...${previousContext.slice(-2000)}\n\n[CURRENT_RAW_TEXT]\n${currentRawText}`;

    try {
        // Add 30s timeout
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DeepSeek API request timed out after 30s')), 30000)
        );

        const response = await Promise.race([
            client.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.3,
                response_format: { type: 'json_object' },
            }),
            timeout
        ]) as any;

        const content = response.choices[0].message.content || '{}';
        const result = JSON.parse(content) as PolishResult;

        // Fallback if response doesn't have expected structure
        if (!result.polishedText) {
            result.polishedText = content;
            result.hasRepetition = false;
        }

        if (result.hasRepetition) {
            console.log(`[DeepSeek] Repetition detected: ${result.repetitionWarnings?.join(', ')}`);
        }

        return result;
    } catch (error: any) {
        console.error('[DeepSeek] Polish failed:', error.message);
        // Return original text on error
        return {
            polishedText: currentRawText,
            hasRepetition: false,
            repetitionWarnings: [`Error: ${error.message}`],
        };
    }
};

/**
 * Legacy function for backward compatibility
 */
export const polishChunk = async (context: PolishingContext): Promise<string> => {
    const result = await polishChunkWithValidation(context);
    return result.polishedText;
};

/**
 * Simple polish without validation (faster)
 */
export const polishChunkSimple = async ({
    previousContext,
    currentRawText,
    config
}: PolishingContext): Promise<string> => {
    const client = getNextClient();

    const mode = config?.mode || 'Rewrite & Polish';
    const tone = config?.tone || 'Professional';
    const rules = config?.cleaningRules || [];
    let custom = config?.customInstructions || '';

    // Advanced Placeholder Handling
    if (custom.includes('[RAW_TEXT]')) {
        custom = custom.replace(/\[RAW_TEXT\]/g, currentRawText);
    }
    if (custom.includes('[PREVIOUS_CONTEXT]')) {
        custom = custom.replace(/\[PREVIOUS_CONTEXT\]/g, previousContext || '(No previous context)');
    }

    let taskDescription = "Polish the [CURRENT_RAW_TEXT] into fluent, professional text.";
    if (mode === 'Clean Only') taskDescription = "Fix grammar and punctuation only.";
    if (mode === 'Summarize') taskDescription = "Provide a concise summary.";
    if (mode === 'Structure/Format') taskDescription = "Organize into clear markdown sections.";

    const cleaningInstructions = rules.length > 0 ? `Cleaning Rules: ${rules.join(', ')}` : "";

    const isComplexTemplate = custom.includes('#');

    // Aggressive Isolation for simple polish
    const systemPrompt = isComplexTemplate
        ? `You are a professional content editor. Follow the user's instructions exactly. Output ONLY the result.`
        : `You are a professional content editor.
Task: ${taskDescription}
Tone: ${tone}.
${cleaningInstructions}

Rules:
1. Reference [PREVIOUS_CONTEXT] for consistency, but DO NOT rewrite it.
2. Fix ASR errors (homophones, stuttering).
3. Maintain original meaning.
4. Output ONLY the polished result.
${custom ? `\nCustom instructions: ${custom}` : ''}`;

    const userPrompt = isComplexTemplate
        ? custom
        : `[PREVIOUS_CONTEXT]\n...${previousContext.slice(-2000)}\n\n[CURRENT_RAW_TEXT]\n${currentRawText}`;

    try {
        const response = await client.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.3,
        });

        return response.choices[0].message.content || currentRawText;
    } catch (error: any) {
        console.error('[DeepSeek] Polish failed:', error.message);
        return currentRawText;
    }
};
