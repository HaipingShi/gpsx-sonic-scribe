import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { getAudioDuration } from './mediaEngine';

interface SilenceInterval {
    start: number;
    end: number;
    duration: number;
}

interface SplitPoint {
    time: number; // Split time in seconds
    type: 'silence' | 'force';
}

const TARGET_CHUNK_DURATION = 600; // 10 minutes in seconds
const MIN_CHUNK_DURATION = 300;   // 5 minutes
const SILENCE_THRESHOLD = '-30dB'; // Silence threshold
const SILENCE_DURATION = 0.5;      // Minimum silence duration in seconds

/**
 * Detects silence intervals in an audio file using FFmpeg's silencedetect filter.
 */
const detectSilence = (filePath: string): Promise<SilenceInterval[]> => {
    return new Promise((resolve, reject) => {
        const silences: SilenceInterval[] = [];
        const silenceRegex = /silence_start: ([\d.]+)[\s\S]+?silence_end: ([\d.]+)/g;
        let logData = '';

        ffmpeg(filePath)
            .audioFilters(`silencedetect=noise=${SILENCE_THRESHOLD}:d=${SILENCE_DURATION}`)
            .format('null')
            .on('stderr', (line) => {
                logData += line + '\n';
            })
            .on('end', () => {
                let match;
                while ((match = silenceRegex.exec(logData)) !== null) {
                    const start = parseFloat(match[1]);
                    const end = parseFloat(match[2]);
                    silences.push({ start, end, duration: end - start });
                }
                resolve(silences);
            })
            .on('error', (err) => {
                reject(err);
            })
            .save('/dev/null'); // Just scanning, not saving
    });
};

/**
 * Calculates optimal split points based on silence intervals and target duration.
 */
const calculateSplitPoints = (duration: number, silences: SilenceInterval[]): number[] => {
    const splits: number[] = [];
    let currentTime = 0;

    while (currentTime < duration) {
        const maxTime = Math.min(currentTime + TARGET_CHUNK_DURATION, duration);
        const minTime = Math.min(currentTime + MIN_CHUNK_DURATION, duration);

        if (maxTime >= duration) {
            splits.push(duration);
            break;
        }

        // Look for best silence between minTime and maxTime
        // Prefer silence closer to maxTime to maximize chunk size
        const validSilences = silences.filter(s => s.start >= minTime && s.start <= maxTime);

        if (validSilences.length > 0) {
            // Pick the silence that is closest to maxTime
            const bestSilence = validSilences.reduce((prev, curr) =>
                Math.abs(curr.start - maxTime) < Math.abs(prev.start - maxTime) ? curr : prev
            );
            // Split in the middle of the silence
            const splitPoint = bestSilence.start + (bestSilence.duration / 2);
            splits.push(splitPoint);
            currentTime = splitPoint;
        } else {
            // Force split if no silence found (fallback)
            // We try to find *any* dip in volume or just hard cut
            console.warn(`No silence found between ${minTime}s and ${maxTime}s, forcing split at ${maxTime}s`);
            splits.push(maxTime);
            currentTime = maxTime;
        }
    }

    return splits;
};

/**
 * Splits the audio file physically into chunks based on calculated points.
 */
export const smartSplitAudio = async (filePath: string, outputDir: string): Promise<{ chunkPath: string; durationMs: number; index: number }[]> => {
    const durationSec = (await getAudioDuration(filePath)) / 1000;
    const silences = await detectSilence(filePath);
    const splitPoints = calculateSplitPoints(durationSec, silences);

    const chunks: { chunkPath: string; durationMs: number; index: number }[] = [];
    let startTime = 0;

    // Ensure chunks dir exists
    const chunksDir = path.join(outputDir, 'chunks');
    if (!fs.existsSync(chunksDir)) {
        fs.mkdirSync(chunksDir, { recursive: true });
    }

    for (let i = 0; i < splitPoints.length; i++) {
        const endTime = splitPoints[i];
        const chunkDuration = endTime - startTime;

        // Skip tiny chunks (e.g. end of file glitch)
        if (chunkDuration < 1) continue;

        const chunkFileName = `chunk_${i.toString().padStart(3, '0')}.mp3`;
        const chunkPath = path.join(chunksDir, chunkFileName);

        await new Promise<void>((resolve, reject) => {
            ffmpeg(filePath)
                .setStartTime(startTime)
                .setDuration(chunkDuration)
                .output(chunkPath)
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .run();
        });

        chunks.push({
            chunkPath,
            durationMs: Math.floor(chunkDuration * 1000),
            index: i
        });

        startTime = endTime;
    }

    return chunks;
};
