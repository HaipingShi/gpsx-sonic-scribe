import OSS from 'ali-oss';
import fs from 'fs';
import path from 'path';

// OSS Configuration from environment variables
const OSS_REGION = process.env.OSS_REGION || 'oss-cn-beijing';
const OSS_BUCKET = process.env.OSS_BUCKET || 'audioscribe-audio';
const OSS_ACCESS_KEY_ID = process.env.OSS_ACCESS_KEY_ID;
const OSS_ACCESS_KEY_SECRET = process.env.OSS_ACCESS_KEY_SECRET;

// Initialize OSS client
let ossClient: OSS | null = null;

function getOSSClient(): OSS {
    if (!ossClient) {
        if (!OSS_ACCESS_KEY_ID || !OSS_ACCESS_KEY_SECRET) {
            throw new Error('OSS credentials not configured. Set OSS_ACCESS_KEY_ID and OSS_ACCESS_KEY_SECRET in .env');
        }

        ossClient = new OSS({
            region: OSS_REGION,
            accessKeyId: OSS_ACCESS_KEY_ID,
            accessKeySecret: OSS_ACCESS_KEY_SECRET,
            bucket: OSS_BUCKET,
        });
    }
    return ossClient;
}

/**
 * Upload a local file to Aliyun OSS
 * @param localPath Local file path
 * @param ossPath Optional custom path in OSS (defaults to auto-generated)
 * @returns Public URL of the uploaded file
 */
export async function uploadToOSS(localPath: string, ossPath?: string): Promise<string> {
    const client = getOSSClient();

    // Generate OSS path if not provided
    const fileName = path.basename(localPath);
    const timestamp = Date.now();
    const targetPath = ossPath || `audio/${timestamp}/${fileName}`;

    console.log(`[OSS] Uploading ${localPath} to ${targetPath}...`);

    try {
        // Upload file
        const result = await client.put(targetPath, fs.createReadStream(localPath));

        // Generate public URL
        // Format: https://{bucket}.{region}.aliyuncs.com/{path}
        const publicUrl = `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${targetPath}`;

        console.log(`[OSS] Upload complete: ${publicUrl}`);
        return publicUrl;
    } catch (error: any) {
        console.error('[OSS] Upload failed:', error.message);
        throw error;
    }
}

/**
 * Upload a file and get a signed URL (with expiration)
 * @param localPath Local file path
 * @param expiresIn Expiration time in seconds (default: 1 hour)
 */
export async function uploadAndGetSignedUrl(localPath: string, expiresIn: number = 3600): Promise<string> {
    const client = getOSSClient();

    // Generate OSS path
    const fileName = path.basename(localPath);
    const timestamp = Date.now();
    const targetPath = `audio/${timestamp}/${fileName}`;

    console.log(`[OSS] Uploading ${localPath} to ${targetPath}...`);

    try {
        // Upload file
        await client.put(targetPath, fs.createReadStream(localPath));

        // Generate signed URL with expiration
        const signedUrl = client.signatureUrl(targetPath, {
            expires: expiresIn,
        });

        console.log(`[OSS] Upload complete, signed URL expires in ${expiresIn}s`);
        return signedUrl;
    } catch (error: any) {
        console.error('[OSS] Upload failed:', error.message);
        throw error;
    }
}

/**
 * Delete a file from OSS
 * @param ossPath Path of the file in OSS
 */
export async function deleteFromOSS(ossPath: string): Promise<void> {
    const client = getOSSClient();

    try {
        await client.delete(ossPath);
        console.log(`[OSS] Deleted: ${ossPath}`);
    } catch (error: any) {
        console.error('[OSS] Delete failed:', error.message);
        throw error;
    }
}

/**
 * Check if OSS is properly configured
 */
export function isOSSConfigured(): boolean {
    return !!(OSS_ACCESS_KEY_ID && OSS_ACCESS_KEY_SECRET);
}

/**
 * Get public URL from OSS path
 */
export function getPublicUrl(ossPath: string): string {
    return `https://${OSS_BUCKET}.${OSS_REGION}.aliyuncs.com/${ossPath}`;
}
