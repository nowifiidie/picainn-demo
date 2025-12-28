import { put, del, list, head } from '@vercel/blob';

const BLOB_STORE_NAME = process.env.BLOB_READ_WRITE_TOKEN ? undefined : 'default'; // Use default if token is set via env

export interface BlobImageInfo {
  url: string;
  filename: string;
  isMain: boolean;
  isHidden: boolean;
}

/**
 * Upload an image to Vercel Blob Storage
 */
export async function uploadImageToBlob(
  path: string,
  file: File | Buffer,
  options?: { contentType?: string; allowOverwrite?: boolean }
): Promise<{ url: string }> {
  // If we want to overwrite, delete the existing blob first
  if (options?.allowOverwrite) {
    try {
      const { list, del } = await import('@vercel/blob');
      const prefix = path.substring(0, path.lastIndexOf('/') + 1);
      const { blobs } = await list({ prefix });
      const existingBlob = blobs.find(b => b.pathname === path);
      if (existingBlob) {
        await del(existingBlob.url);
        console.log(`Deleted existing blob: ${path}`);
      }
    } catch (deleteError) {
      console.warn(`Could not delete existing blob ${path} (may not exist):`, deleteError);
      // Continue with upload even if delete fails
    }
  }

  try {
    const blob = await put(path, file, {
      access: 'public',
      contentType: options?.contentType,
    });
    return { url: blob.url };
  } catch (error: any) {
    // If blob still exists (delete might have failed), try with addRandomSuffix
    if (error?.message?.includes('already exists')) {
      console.warn(`Blob ${path} still exists, trying with addRandomSuffix`);
      const blob = await put(path, file, {
        access: 'public',
        contentType: options?.contentType,
        addRandomSuffix: true,
      });
      return { url: blob.url };
    }
    throw error;
  }
}

/**
 * Delete an image from Vercel Blob Storage
 */
export async function deleteImageFromBlob(url: string): Promise<void> {
  try {
    await del(url);
  } catch (error) {
    console.error('Error deleting blob:', error);
    // Don't throw - might already be deleted
  }
}

/**
 * List all images for a room from Blob Storage
 */
export async function listRoomImages(roomId: string): Promise<BlobImageInfo[]> {
  try {
    const prefix = `rooms/${roomId}/`;
    const result = await list({ prefix });
    
    if (!result || !result.blobs) {
      console.warn(`No blobs found for room ${roomId} with prefix ${prefix}`);
      return [];
    }
    
    const images: BlobImageInfo[] = result.blobs
      .filter(blob => {
        if (!blob.pathname) return false;
        const ext = blob.pathname.toLowerCase();
        return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
      })
      .map(blob => {
        const filename = blob.pathname.split('/').pop() || '';
        const isMain = filename === 'main.jpg';
        const isHidden = filename.startsWith('_hidden_');
        return {
          url: blob.url,
          filename,
          isMain,
          isHidden,
        };
      });
    
    console.log(`Found ${images.length} images for room ${roomId}:`, images.map(img => img.filename));
    return images;
  } catch (error) {
    console.error('Error listing room images from blob:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return [];
  }
}

/**
 * Check if a blob exists
 */
export async function blobExists(url: string): Promise<boolean> {
  try {
    await head(url);
    return true;
  } catch {
    return false;
  }
}

