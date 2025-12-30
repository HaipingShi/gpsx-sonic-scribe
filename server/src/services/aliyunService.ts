import { transcribeChunkAliyun } from './aliyunFunasr';
import { transcribeWithGroq } from './groqService';

/**
 * Main transcription service with multi-provider fallback
 * Priority: 
 * 1. Aliyun FunASR (via aliyunFunasr.ts internal logic)
 * 2. Groq Whisper (as secondary global fallback)
 */
export const transcribeChunk = async (filePath: string): Promise<string> => {
    console.log(`[Transcribe] Processing file: ${filePath}`);

    try {
        // Try Aliyun (includes OSS -> PUBLIC_URL -> SenseVoice fallback internal to the call)
        const transcription = await transcribeChunkAliyun(filePath);
        console.log(`[Aliyun] Success - transcription length: ${transcription.length} chars`);
        return transcription;
    } catch (error: any) {
        console.warn(`[Aliyun] All Aliyun methods failed: ${error.message}. Falling back to Groq...`);

        try {
            const transcription = await transcribeWithGroq(filePath);
            console.log(`[Groq] Fallback success`);
            return transcription;
        } catch (groqError: any) {
            console.error(`[Groq] Fallback failed: ${groqError.message}`);
            throw new Error(`All transcription providers failed. Aliyun: ${error.message}. Groq: ${groqError.message}`);
        }
    }
};
