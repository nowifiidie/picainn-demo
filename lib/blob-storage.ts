import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';

// Configure Cloudflare R2 (S3-compatible)
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || '';

export interface BlobImageInfo {
  url: string;
  filename: string;
  isMain: boolean;
  isHidden: boolean;
}

/**
 * Get public URL for an R2 object
 */
function getPublicUrl(key: string): string {
  // If custom domain is set, use it; otherwise use R2 public URL
  if (process.env.R2_PUBLIC_URL) {
    return `${process.env.R2_PUBLIC_URL}/${key}`;
  }
  // R2 public URL format: https://pub-{account-id}.r2.dev/{bucket-name}/{key}
  const accountId = process.env.R2_ACCOUNT_ID || '';
  return `https://pub-${accountId}.r2.dev/${R2_BUCKET_NAME}/${key}`;
}

/**
 * Upload an image to Cloudflare R2
 */
export async function uploadImageToBlob(
  path: string,
  file: File | Buffer,
  options?: { contentType?: string; allowOverwrite?: boolean }
): Promise<{ url: string }> {
  try {
    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Upload to R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: path,
      Body: buffer,
      ContentType: options?.contentType || 'image/jpeg',
    });

    await r2Client.send(command);

    // Return public URL
    const url = getPublicUrl(path);
    return { url };
  } catch (error) {
    console.error('Error uploading to R2:', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudflare R2
 */
export async function deleteImageFromBlob(url: string): Promise<void> {
  try {
    // Extract key from URL
    // URL format: https://pub-{account-id}.r2.dev/{bucket}/{key}
    // or custom domain: https://custom-domain.com/{key}
    let key: string = '';
    if (url.includes('.r2.dev/')) {
      // R2 public URL: https://pub-{account-id}.r2.dev/{bucket-name}/{key}
      const urlParts = url.split('.r2.dev/');
      if (urlParts[1]) {
        const pathAfterDomain = urlParts[1];
        // Remove bucket name (first segment) to get the key
        const pathSegments = pathAfterDomain.split('/');
        if (pathSegments.length > 1) {
          key = pathSegments.slice(1).join('/');
        } else {
          key = pathAfterDomain;
        }
      }
    } else if (process.env.R2_PUBLIC_URL && url.startsWith(process.env.R2_PUBLIC_URL)) {
      // Custom domain URL: https://custom-domain.com/{key}
      key = url.replace(process.env.R2_PUBLIC_URL, '').replace(/^\//, '');
    } else {
      // Try to extract from any URL format
      try {
        const urlObj = new URL(url);
        key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
      } catch {
        // Fallback: extract filename from URL
        const lastSlash = url.lastIndexOf('/');
        key = lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
      }
    }

    if (!key) {
      console.warn(`Could not extract key from URL: ${url}`);
      return;
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    console.error('Error deleting from R2:', error);
    // Don't throw - might already be deleted
  }
}

/**
 * List all images for a room from Cloudflare R2
 */
export async function listRoomImages(roomId: string): Promise<BlobImageInfo[]> {
  try {
    const prefix = `rooms/${roomId}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: 1000,
    });

    const result = await r2Client.send(command);

    if (!result.Contents || result.Contents.length === 0) {
      console.warn(`No images found for room ${roomId} with prefix ${prefix}`);
      return [];
    }

    const images: BlobImageInfo[] = result.Contents
      .filter((object) => {
        if (!object.Key) return false;
        const ext = object.Key.toLowerCase();
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
      })
      .map((object) => {
        const key = object.Key || '';
        const filename = key.split('/').pop() || '';
        const isMain = filename === 'main.jpg' || filename === 'main.jpeg';
        const isHidden = filename.startsWith('_hidden_');
        
        return {
          url: getPublicUrl(key),
          filename,
          isMain,
          isHidden,
        };
      });

    console.log(`Found ${images.length} images for room ${roomId}:`, images.map(img => img.filename));
    return images;
  } catch (error) {
    console.error('Error listing room images from R2:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return [];
  }
}

/**
 * Check if an image exists in Cloudflare R2
 */
export async function blobExists(url: string): Promise<boolean> {
  try {
    // Extract key from URL (same logic as deleteImageFromBlob)
    let key: string = '';
    if (url.includes('.r2.dev/')) {
      const urlParts = url.split('.r2.dev/');
      if (urlParts[1]) {
        const pathAfterDomain = urlParts[1];
        const pathSegments = pathAfterDomain.split('/');
        if (pathSegments.length > 1) {
          key = pathSegments.slice(1).join('/');
        } else {
          key = pathAfterDomain;
        }
      }
    } else if (process.env.R2_PUBLIC_URL && url.startsWith(process.env.R2_PUBLIC_URL)) {
      key = url.replace(process.env.R2_PUBLIC_URL, '').replace(/^\//, '');
    } else {
      try {
        const urlObj = new URL(url);
        key = urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
      } catch {
        const lastSlash = url.lastIndexOf('/');
        key = lastSlash >= 0 ? url.substring(lastSlash + 1) : url;
      }
    }

    if (!key) return false;

    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
    return true;
  } catch {
    return false;
  }
}
