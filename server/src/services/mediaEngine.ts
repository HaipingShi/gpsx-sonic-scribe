import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';

/**
 * Compresses an audio file to approximately 1/4 of its original size logic.
 * We achieve this by converting to efficient formats (Opus/MP3) and reducing channels/bitrate.
 * 
 * Strategy:
 * - Convert to MP3 (widely compatible) or Opus (better quality at low bitrate).
 * - Downmix to Mono (50% reduction).
 * - Target bitrate: 64kbps (good for speech). 
 *   Original CD quality is ~1411kbps, standard MP3 is 128-320kbps. 64k mono is very compact.
 */
export const compressAudio = (inputPath: string, outputDir: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Ensure output filename has .mp3 extension
        const originalName = path.basename(inputPath, path.extname(inputPath));
        const outputPath = path.join(outputDir, `${originalName}_compressed.mp3`);

        ffmpeg(inputPath)
            .toFormat('mp3')
            .audioChannels(1) // Mono
            .audioBitrate('64k') // Low bitrate for speech
            .on('end', () => {
                // Validation: Check if output exists
                if (fs.existsSync(outputPath)) {
                    resolve(outputPath);
                } else {
                    reject(new Error('Compression finished but output file not found'));
                }
            })
            .on('error', (err) => {
                console.error('FFmpeg compression error:', err);
                reject(err);
            })
            .save(outputPath);
    });
};

/**
 * Gets duration of audio file in milliseconds
 */
export const getAudioDuration = (filePath: string): Promise<number> => {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            // duration is in seconds
            const duration = metadata.format.duration;
            resolve(duration ? Math.floor(duration * 1000) : 0);
        });
    });
};
