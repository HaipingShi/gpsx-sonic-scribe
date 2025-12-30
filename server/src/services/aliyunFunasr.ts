import fs from 'fs';
import path from 'path';
import { uploadAndGetSignedUrl, isOSSConfigured } from './ossService';

const ALIYUN_API_KEY = process.env.ALIYUN_API_KEY;
const DASHSCOPE_BASE_URL = 'https://dashscope.aliyuncs.com/api/v1';

// File transcription API endpoint
const TRANSCRIPTION_SUBMIT_URL = `${DASHSCOPE_BASE_URL}/services/audio/asr/transcription`;
const TRANSCRIPTION_QUERY_URL = `${DASHSCOPE_BASE_URL}/tasks`;

// Upload local file to get a URL for transcription (using base64 conversion)
async function uploadFileForTranscription(filePath: string): Promise<string> {
    // For local files, we'll convert to base64 and use inline data
    // Alternatively, upload to OSS first - but for simplicity we'll use file_urls with local server
    const absolutePath = path.resolve(filePath);
    if (!fs.existsSync(absolutePath)) {
        throw new Error(`File not found: ${absolutePath}`);
    }

    // Return the local path - we'll need to make it accessible via HTTP
    // For now, we'll use the public URL approach with OSS or create a temp server
    return absolutePath;
}

/**
 * Submit a transcription task to Aliyun Dashscope
 */
async function submitTranscriptionTask(fileUrl: string): Promise<string> {
    if (!ALIYUN_API_KEY) {
        throw new Error('ALIYUN_API_KEY is missing in .env');
    }

    const response = await fetch(TRANSCRIPTION_SUBMIT_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${ALIYUN_API_KEY}`,
            'Content-Type': 'application/json',
            'X-DashScope-Async': 'enable',
        },
        body: JSON.stringify({
            model: 'fun-asr-2025-11-07',  // 使用最新模型
            input: {
                file_urls: [fileUrl],
            },
            parameters: {
                language_hints: ['zh', 'en'],
                // 标点符号相关参数
                enable_punctuation_prediction: true,      // 启用标点预测
                enable_inverse_text_normalization: true,  // 启用逆文本规范化
                punctuation_enabled: true,                // 显式启用标点
                // 其他优化参数
                disfluency_removal_enabled: true,         // 移除口语填充词(嗯、啊、那个)
                // 输出格式优化
                format: 'text',                           // 文本格式输出
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to submit transcription task: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('[Aliyun] Transcription task submitted:', result);

    // Return task_id for polling
    return result.output?.task_id || result.request_id;
}

/**
 * Query transcription task status
 */
async function queryTranscriptionTask(taskId: string): Promise<{
    status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
    transcription?: string;
    output?: any;
}> {
    if (!ALIYUN_API_KEY) {
        throw new Error('ALIYUN_API_KEY is missing in .env');
    }

    const response = await fetch(`${TRANSCRIPTION_QUERY_URL}/${taskId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${ALIYUN_API_KEY}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to query transcription task: ${response.status} - ${error}`);
    }

    const result = await response.json();
    const status = result.output?.task_status;

    if (status === 'SUCCEEDED') {
        // Get transcription result
        const results = result.output?.results;
        if (results && results.length > 0) {
            const transcriptionUrl = results[0].transcription_url;
            if (transcriptionUrl) {
                // Fetch the transcription content
                const transcriptionResponse = await fetch(transcriptionUrl);
                const transcriptionData = await transcriptionResponse.json();

                // Extract text from all sentences
                const sentences = transcriptionData.transcripts?.[0]?.sentences || [];
                const fullText = sentences.map((s: any) => s.text).join('');

                return {
                    status: 'SUCCEEDED',
                    transcription: fullText,
                    output: result.output,
                };
            }
        }
    }

    return {
        status: status || 'PENDING',
        output: result.output,
    };
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Transcribe an audio file using Aliyun Dashscope Paraformer
 * This is an async operation that polls for completion
 * @param filePath Local path to the audio file OR HTTP/OSS URL
 * @param timeoutMs Maximum time to wait for transcription (default: 5 minutes)
 */
export async function transcribeWithAliyun(
    filePath: string,
    timeoutMs: number = 300000
): Promise<string> {
    if (!ALIYUN_API_KEY) {
        throw new Error('ALIYUN_API_KEY is missing in .env');
    }

    console.log(`[Aliyun] Starting transcription for: ${filePath}`);

    // Check if it's already a URL or a local file
    let fileUrl = filePath;
    if (!filePath.startsWith('http://') && !filePath.startsWith('https://') && !filePath.startsWith('oss://')) {
        // Local file - we need to make it accessible
        // For Dashscope, we need to upload to OSS or use a public URL
        // As a workaround, let's try using file:// URL (may not work)
        // Better approach: upload to OSS first
        console.log('[Aliyun] Note: Local files need to be uploaded to OSS or be HTTP accessible');
        console.log('[Aliyun] Falling back to Groq/OpenAI transcription for local files');
        throw new Error('Local files not directly supported - please use HTTP/OSS URLs or configure OSS upload');
    }

    try {
        // Submit task
        const taskId = await submitTranscriptionTask(fileUrl);
        console.log(`[Aliyun] Task submitted: ${taskId}`);

        // Poll for completion
        const startTime = Date.now();
        let pollInterval = 2000; // Start with 2 seconds

        while (Date.now() - startTime < timeoutMs) {
            await sleep(pollInterval);

            const result = await queryTranscriptionTask(taskId);
            console.log(`[Aliyun] Task ${taskId} status: ${result.status}`);

            if (result.status === 'SUCCEEDED') {
                console.log('[Aliyun] Transcription completed successfully');
                return result.transcription || '';
            }

            if (result.status === 'FAILED') {
                throw new Error(`Transcription failed: ${JSON.stringify(result.output)}`);
            }

            // Increase poll interval gradually (max 10 seconds)
            pollInterval = Math.min(pollInterval * 1.5, 10000);
        }

        throw new Error('Transcription timeout');
    } catch (error: any) {
        console.error('[Aliyun] Transcription error:', error.message);
        throw error;
    }
}

/**
 * Alternative: Use Aliyun's realtime/streaming API for local files
 * This uses the SenseVoice model with direct file upload
 */
export async function transcribeWithSenseVoice(filePath: string): Promise<string> {
    if (!ALIYUN_API_KEY) {
        throw new Error('ALIYUN_API_KEY is missing in .env');
    }

    console.log(`[Aliyun-SenseVoice] Starting transcription for: ${filePath}`);

    // Read file as base64
    const audioBuffer = fs.readFileSync(filePath);
    const audioBase64 = audioBuffer.toString('base64');

    // SenseVoice supports direct audio input
    // Add 60s timeout for recognition
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('SenseVoice API request timed out after 60s')), 60000)
    );

    const response = await Promise.race([
        fetch('https://dashscope.aliyuncs.com/api/v1/services/audio/asr/recognition', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ALIYUN_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'sensevoice-v1',
                input: {
                    audio: audioBase64,
                    format: path.extname(filePath).slice(1) || 'mp3',
                    sample_rate: 16000,
                },
                parameters: {
                    language_hints: ['zh', 'en'],
                },
            }),
        }),
        timeout
    ]) as Response;

    if (!response.ok) {
        const error = await response.text();
        console.error('[Aliyun-SenseVoice] Error:', error);
        throw new Error(`SenseVoice transcription failed: ${response.status} - ${error}`);
    }

    const result = await response.json();
    console.log('[Aliyun-SenseVoice] Success');

    // Extract text from result
    const text = result.output?.text || result.output?.sentence?.text || '';
    return text;
}

// Helper to convert local path to HTTP URL
// Uses PUBLIC_URL env var if set (for Cloudflare tunnel), otherwise localhost
function localPathToUrl(filePath: string): string {
    const PORT = process.env.PORT || 3001;
    const PUBLIC_URL = process.env.PUBLIC_URL; // e.g., https://audioscribe.yourdomain.com

    // Assuming storage is at /server/storage and served at /storage
    const storageRoot = path.resolve(process.cwd(), 'storage');
    const relativePath = path.relative(storageRoot, filePath);

    if (relativePath.startsWith('..')) {
        throw new Error(`File ${filePath} is not in storage directory`);
    }

    const storagePath = `/storage/${relativePath.replace(/\\/g, '/')}`;

    // Use public URL if available (for Aliyun API access)
    if (PUBLIC_URL) {
        return `${PUBLIC_URL.replace(/\/$/, '')}${storagePath}`;
    }

    // Fallback to localhost (won't work for Aliyun API)
    console.warn('[Aliyun] PUBLIC_URL not set - Aliyun API cannot access localhost URLs');
    return `http://localhost:${PORT}${storagePath}`;
}

// Export a unified transcription function
// Priority: 1. If URL provided, use directly  2. If OSS configured, upload to OSS  3. If PUBLIC_URL set, use tunnel
export async function transcribeChunkAliyun(filePath: string): Promise<string> {
    console.log(`[Aliyun] Transcribing file: ${filePath}`);

    // If already a URL, use directly
    if (filePath.startsWith('http://') || filePath.startsWith('https://') || filePath.startsWith('oss://')) {
        console.log(`[Aliyun] Using provided URL directly`);
        return await transcribeWithAliyun(filePath);
    }

    // Local file - need to make it accessible to Aliyun
    // Priority 1: Upload to OSS (most reliable)
    if (isOSSConfigured()) {
        console.log(`[Aliyun] OSS configured, uploading file...`);
        try {
            // Upload with 1-hour signed URL
            const ossUrl = await uploadAndGetSignedUrl(filePath, 3600);
            console.log(`[Aliyun] Uploaded to OSS: ${ossUrl.substring(0, 100)}...`);
            return await transcribeWithAliyun(ossUrl);
        } catch (ossError: any) {
            console.warn(`[Aliyun] OSS upload failed: ${ossError.message}, trying fallback...`);
        }
    }

    // Priority 2: Use PUBLIC_URL (Cloudflare tunnel)
    const PUBLIC_URL = process.env.PUBLIC_URL;
    if (PUBLIC_URL) {
        console.log(`[Aliyun] Using PUBLIC_URL: ${PUBLIC_URL}`);
        try {
            const fileUrl = localPathToUrl(filePath);
            console.log(`[Aliyun] Using URL: ${fileUrl}`);
            return await transcribeWithAliyun(fileUrl);
        } catch (tunnelError: any) {
            console.warn(`[Aliyun] PUBLIC_URL failed: ${tunnelError.message}`);
        }
    }

    // Priority 3: Fallback to SenseVoice (Base64 upload, no URL needed)
    console.log(`[Aliyun] No public URL or OSS found, using SenseVoice Base64 upload...`);
    try {
        return await transcribeWithSenseVoice(filePath);
    } catch (senseVoiceError: any) {
        console.error(`[Aliyun] SenseVoice fallback failed: ${senseVoiceError.message}`);
        throw senseVoiceError;
    }
}

