import OpenAI from 'openai';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

const openai = new OpenAI({
    apiKey: DEEPSEEK_API_KEY || 'mock-key',
    baseURL: DEEPSEEK_BASE_URL,
});

/**
 * Validation result from hallucination detection
 */
export interface ValidationResult {
    hasHallucination: boolean;
    confidence: number; // 0.0-1.0
    issues: string[];
    recommendation: 'retry' | 'accept' | 'manual_review';
}

/**
 * Configuration for validation behavior
 */
export interface ValidationConfig {
    maxRetries?: number;
    retryDelayMs?: number;
    expectedLanguage?: 'zh' | 'en' | 'mixed';
}

const DEFAULT_CONFIG: ValidationConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    expectedLanguage: 'mixed',
};

/**
 * System prompt for hallucination detection
 */
const VALIDATION_SYSTEM_PROMPT = `You are a transcription quality validator for audio-to-text content.
Your task is to analyze transcripts for quality issues, particularly hallucinations.

Analyze the transcript for:
1. **Invented Content**: Names, places, or phrases that seem fabricated or nonsensical
2. **Language Inconsistency**: Unexpected language switching (e.g., random Chinese in English content or vice versa)
3. **Repetition Loops**: Repeated phrases or sections (a common ASR hallucination pattern)
4. **Non-Speech Content**: Descriptions of music, background noise, or sounds that shouldn't be transcribed
5. **Incoherence**: Text that doesn't make logical sense or lacks context

Respond ONLY with valid JSON in this exact format:
{
  "hasHallucination": boolean,
  "confidence": number between 0.0 and 1.0,
  "issues": ["specific issue 1", "specific issue 2"],
  "recommendation": "retry" | "accept" | "manual_review"
}

Guidelines for recommendation:
- "retry": Clear hallucination detected, re-transcription recommended
- "accept": No significant issues, transcript is acceptable
- "manual_review": Uncertain issues that require human review

Be conservative - only flag clear issues. Minor grammar or punctuation issues are NOT hallucinations.`;

/**
 * Validate a transcription for hallucinations using DeepSeek
 * @param transcriptText The raw transcript text to validate
 * @param config Optional configuration for validation behavior
 * @returns Validation result with issues and recommendation
 */
export async function validateTranscription(
    transcriptText: string,
    config: ValidationConfig = DEFAULT_CONFIG
): Promise<ValidationResult> {
    if (!DEEPSEEK_API_KEY) {
        console.warn('[Hallucination] DEEPSEEK_API_KEY not set, returning default pass');
        return {
            hasHallucination: false,
            confidence: 0.5,
            issues: ['Validation skipped - API key not configured'],
            recommendation: 'accept',
        };
    }

    // Skip validation for very short texts
    if (transcriptText.trim().length < 10) {
        return {
            hasHallucination: false,
            confidence: 1.0,
            issues: [],
            recommendation: 'accept',
        };
    }

    try {
        const response = await openai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: VALIDATION_SYSTEM_PROMPT },
                { role: 'user', content: `Analyze this transcript:\n\n"""${transcriptText}"""` }
            ],
            temperature: 0.1, // Low temperature for consistent analysis
            response_format: { type: 'json_object' },
        });

        const content = response.choices[0].message.content;
        if (!content) {
            throw new Error('Empty response from validation API');
        }

        const result = JSON.parse(content) as ValidationResult;

        // Validate response structure
        if (typeof result.hasHallucination !== 'boolean' ||
            typeof result.confidence !== 'number' ||
            !Array.isArray(result.issues) ||
            !['retry', 'accept', 'manual_review'].includes(result.recommendation)) {
            throw new Error('Invalid validation response structure');
        }

        console.log(`[Hallucination] Validation complete: hasHallucination=${result.hasHallucination}, confidence=${result.confidence}`);
        return result;

    } catch (error: any) {
        console.error('[Hallucination] Validation failed:', error.message);

        // Return safe default on error - don't block pipeline
        return {
            hasHallucination: false,
            confidence: 0.3,
            issues: [`Validation error: ${error.message}`],
            recommendation: 'manual_review',
        };
    }
}

/**
 * Check if a validation result indicates the transcript should be retried
 */
export function shouldRetry(result: ValidationResult, currentAttempt: number, maxAttempts: number = 3): boolean {
    if (currentAttempt >= maxAttempts) {
        return false;
    }
    return result.recommendation === 'retry' && result.hasHallucination;
}

/**
 * Heuristic-based pre-validation (fast, no API call)
 * Useful for quick filtering before expensive API calls
 */
export function heuristicValidation(transcriptText: string): { suspicious: boolean; reason?: string } {
    // Check for repetition loops (common hallucination pattern)
    const words = transcriptText.split(/\s+/);
    const wordCounts = new Map<string, number>();

    for (const word of words) {
        const normalized = word.toLowerCase().replace(/[^\w\u4e00-\u9fff]/g, '');
        if (normalized.length > 2) {
            wordCounts.set(normalized, (wordCounts.get(normalized) || 0) + 1);
        }
    }

    // Check for excessive repetition (same word > 20% of total)
    for (const [word, count] of wordCounts) {
        if (count > words.length * 0.2 && count > 5) {
            return { suspicious: true, reason: `Excessive repetition of "${word}" (${count} times)` };
        }
    }

    // Check for very short transcript relative to expected content
    if (words.length < 5) {
        return { suspicious: true, reason: 'Transcript too short' };
    }

    // Check for music/noise descriptions (common ASR artifact)
    const noisePatterns = /\[(?:music|noise|applause|laughter|silence|inaudible)\]/gi;
    if (noisePatterns.test(transcriptText)) {
        return { suspicious: true, reason: 'Contains non-speech content markers' };
    }

    return { suspicious: false };
}

/**
 * Combined validation: heuristic first, then API if needed
 */
export async function validateWithHeuristics(
    transcriptText: string,
    config: ValidationConfig = DEFAULT_CONFIG
): Promise<ValidationResult> {
    // Quick heuristic check first
    const heuristic = heuristicValidation(transcriptText);

    if (heuristic.suspicious) {
        console.log(`[Hallucination] Heuristic flagged: ${heuristic.reason}`);
        // Still call API for confirmation, but log the suspicion
    }

    // Full API validation
    return validateTranscription(transcriptText, config);
}
