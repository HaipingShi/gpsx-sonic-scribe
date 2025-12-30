import OpenAI from 'openai';
import fs from 'fs';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
    console.warn('[Groq] GROQ_API_KEY is not set in .env');
}

const groq = new OpenAI({
    apiKey: GROQ_API_KEY || 'mock-key',
    baseURL: 'https://api.groq.com/openai/v1',
});

/**
 * Transcribe audio using Groq Whisper-1
 */
export async function transcribeWithGroq(filePath: string): Promise<string> {
    if (!GROQ_API_KEY) {
        throw new Error('Groq API key not configured');
    }

    try {
        console.log(`[Groq] Transcribing with Whisper-1: ${filePath}`);

        // Add 30s timeout
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Groq API request timed out after 30s')), 30000)
        );

        const transcription = await Promise.race([
            groq.audio.transcriptions.create({
                file: fs.createReadStream(filePath),
                model: 'whisper-large-v3-turbo',
                response_format: 'text',
            }),
            timeout
        ]) as any;

        return transcription;
    } catch (error: any) {
        console.error('[Groq] Transcription error:', error.message);
        throw error;
    }
}
