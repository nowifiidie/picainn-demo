import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { listRoomImages, uploadImageToBlob, deleteImageFromBlob } from '@/lib/blob-storage';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { roomId, filename } = await request.json();

    if (!roomId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Room ID and filename are required' },
        { status: 400 }
      );
    }

    // Clean filename - remove _hidden_ prefix if present
    const cleanFilename = filename.startsWith('_hidden_') 
      ? filename.replace('_hidden_', '') 
      : filename;

    // Check if the selected image is already main.jpg
    if (cleanFilename === 'main.jpg') {
      return NextResponse.json({
        success: true,
        message: 'This image is already the main image',
      });
    }

    // Get all room images from Blob Storage
    const roomImages = await listRoomImages(roomId);
    
    // Find source image - check both with and without _hidden_ prefix
    const sourceImage = roomImages.find(img => 
      img.filename === filename || 
      img.filename === cleanFilename ||
      img.filename === `_hidden_${cleanFilename}` ||
      (img.filename.startsWith('_hidden_') && img.filename.replace('_hidden_', '') === cleanFilename)
    );
    
    // Find main image - check both visible and hidden
    const mainImage = roomImages.find(img => 
      (img.isMain && img.filename === 'main.jpg') ||
      img.filename === '_hidden_main.jpg'
    );

    if (!sourceImage) {
      console.error('Source image not found. Available images:', roomImages.map(img => img.filename));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Source image not found',
          details: `Looking for: ${filename}, Available: ${roomImages.map(img => img.filename).join(', ')}`
        },
        { status: 404 }
      );
    }

    if (!mainImage) {
      console.error('Main image not found. Available images:', roomImages.map(img => img.filename));
      return NextResponse.json(
        { 
          success: false, 
          error: 'Main image not found',
          details: `Available images: ${roomImages.map(img => img.filename).join(', ')}`
        },
        { status: 404 }
      );
    }

    // Download both images
    let sourceResponse, mainResponse;
    try {
      [sourceResponse, mainResponse] = await Promise.all([
        fetch(sourceImage.url),
        fetch(mainImage.url),
      ]);
    } catch (fetchError) {
      console.error('Error fetching images:', fetchError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to download images',
          details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    if (!sourceResponse.ok || !mainResponse.ok) {
      console.error('Image fetch failed:', {
        sourceStatus: sourceResponse.status,
        sourceUrl: sourceImage.url,
        mainStatus: mainResponse.status,
        mainUrl: mainImage.url
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to download images',
          details: `Source: ${sourceResponse.status}, Main: ${mainResponse.status}`
        },
        { status: 500 }
      );
    }

    const [sourceBlob, mainBlob] = await Promise.all([
      sourceResponse.blob(),
      mainResponse.blob(),
    ]);

    // Convert to Files for upload
    const sourceFile = new File([sourceBlob], 'main.jpg', { type: sourceBlob.type || 'image/jpeg' });
    const mainFile = new File([mainBlob], cleanFilename, { type: mainBlob.type || 'image/jpeg' });

    // Upload swapped images (allow overwrite since we're swapping existing images)
    // IMPORTANT: Upload new images FIRST, then delete old ones to prevent data loss
    let newMainResult, newSourceResult;
    try {
      [newMainResult, newSourceResult] = await Promise.all([
        uploadImageToBlob(`rooms/${roomId}/main.jpg`, sourceFile, {
          contentType: sourceBlob.type || 'image/jpeg',
          allowOverwrite: true,
        }),
        uploadImageToBlob(`rooms/${roomId}/${cleanFilename}`, mainFile, {
          contentType: mainBlob.type || 'image/jpeg',
          allowOverwrite: true,
        }),
      ]);
      
      console.log('Successfully uploaded swapped images:', {
        newMain: newMainResult.url,
        newSource: newSourceResult.url
      });
    } catch (uploadError) {
      console.error('Error uploading images to Blob Storage:', uploadError);
      // Don't delete old images if upload failed - they're still needed!
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to upload images to Blob Storage',
          details: uploadError instanceof Error ? uploadError.message : 'Unknown error',
          note: 'Original images are preserved. Please try again.'
        },
        { status: 500 }
      );
    }

    // Only delete old blobs AFTER successful upload
    // Only delete if the URLs are different (to avoid deleting the new uploads)
    try {
      if (sourceImage.url !== newMainResult.url) {
        await deleteImageFromBlob(sourceImage.url);
        console.log('Deleted old source image:', sourceImage.url);
      }
      if (mainImage.url !== newSourceResult.url && mainImage.url !== newMainResult.url) {
        await deleteImageFromBlob(mainImage.url);
        console.log('Deleted old main image:', mainImage.url);
      }
    } catch (deleteError) {
      console.error('Error deleting old blobs (non-fatal):', deleteError);
      // Non-fatal - new images are already uploaded, old ones can be cleaned up later
    }

    // Update room metadata in Redis if needed
    const { Redis } = await import('@upstash/redis');
    const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
      ? new Redis({
          url: process.env.KV_REST_API_URL,
          token: process.env.KV_REST_API_TOKEN,
        })
      : null;

    if (redis) {
      try {
        const ROOM_METADATA_KEY = 'room-metadata';
        const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
        if (allRooms[roomId]) {
          allRooms[roomId].mainImageUrl = newMainResult.url;
          allRooms[roomId].lastUpdated = Date.now();
          await redis.set(ROOM_METADATA_KEY, allRooms);
        }
      } catch (error) {
        console.error('Error updating room metadata (non-fatal):', error);
      }
    }

    revalidatePath('/');
    revalidatePath(`/images/rooms/${roomId}/main.jpg`);
    revalidatePath(`/images/rooms/${roomId}/${filename}`);

    return NextResponse.json({
      success: true,
      message: 'Main image swapped successfully',
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Error setting main image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', errorMessage);
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to set main image',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
