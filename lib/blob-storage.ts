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
  options?: { contentType?: string }
): Promise<{ url: string }> {
  const blob = await put(path, file, {
    access: 'public',
    contentType: options?.contentType,
  });
  return { url: blob.url };
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
    const { blobs } = await list({ prefix });
    
    const images: BlobImageInfo[] = blobs
      .filter(blob => {
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
    
    return images;
  } catch (error) {
    console.error('Error listing room images from blob:', error);
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

