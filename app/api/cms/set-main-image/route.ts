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

    // Get all room images from Cloudflare R2
    let roomImages = await listRoomImages(roomId);
    
    // If no main image exists, auto-promote one first
    const hasMainImage = roomImages.some(img => img.filename === 'main.jpg' && !img.isHidden);
    if (!hasMainImage) {
      console.log(`No main image found for room ${roomId}, auto-promoting one...`);
      // Find the first available non-hidden image to promote
      const availableImages = roomImages.filter(img => !img.isHidden && img.filename !== 'main.jpg');
      if (availableImages.length > 0) {
        const imageToPromote = availableImages[Math.floor(Math.random() * availableImages.length)];
        console.log(`Auto-promoting ${imageToPromote.filename} to main.jpg`);
        
        // Download and upload as main.jpg
        const imageResponse = await fetch(imageToPromote.url);
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const imageFile = new File([imageBlob], 'main.jpg', { type: imageBlob.type || 'image/jpeg' });
          await uploadImageToBlob(`rooms/${roomId}/main.jpg`, imageFile, {
            contentType: imageBlob.type || 'image/jpeg',
            allowOverwrite: true,
          });
          // Re-fetch images after promotion
          roomImages = await listRoomImages(roomId);
        }
      }
    }
    
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

    // Strategy: True swap - both images remain, just swap their positions
    // Use temporary paths to ensure we don't lose images if something fails
    const tempMainPath = `rooms/${roomId}/_swap_main_${Date.now()}.jpg`;
    const tempSourcePath = `rooms/${roomId}/_swap_source_${Date.now()}.jpg`;
    
    let tempMainResult, tempSourceResult;
    try {
      // Step 1: Upload both images to temporary paths first (safe - no overwrite risk)
      [tempMainResult, tempSourceResult] = await Promise.all([
        uploadImageToBlob(tempMainPath, sourceFile, {
          contentType: sourceBlob.type || 'image/jpeg',
        }),
        uploadImageToBlob(tempSourcePath, mainFile, {
          contentType: mainBlob.type || 'image/jpeg',
        }),
      ]);
      
      console.log('Successfully uploaded to temp paths:', {
        tempMain: tempMainResult.url,
        tempSource: tempSourceResult.url
      });
    } catch (tempUploadError) {
      console.error('Error uploading to temp paths:', tempUploadError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to prepare images for swap',
          details: tempUploadError instanceof Error ? tempUploadError.message : 'Unknown error',
          note: 'Original images are preserved. Please try again.'
        },
        { status: 500 }
      );
    }

    // Step 2: Now that we have safe copies, delete old images at target paths
    // IMPORTANT: Delete the old blobs BEFORE uploading new ones to ensure new URLs are generated
    try {
      console.log('Deleting old images at target paths:', { main: mainImage.url, source: sourceImage.url });
      await Promise.all([
        deleteImageFromBlob(mainImage.url).catch(err => 
          console.warn('Could not delete old main image:', err)
        ),
        deleteImageFromBlob(sourceImage.url).catch(err => 
          console.warn('Could not delete old source image:', err)
        ),
      ]);
      
      // Wait longer for deletions to fully propagate in Blob Storage
      // This ensures new uploads get new URLs instead of reusing old ones
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Deleted old images at target paths, waiting for propagation...');
    } catch (deleteError) {
      console.error('Error deleting old images:', deleteError);
      // Continue anyway - upload might still work
    }

    // Step 3: Download from temp and upload to final paths
    let newMainResult, newSourceResult;
    try {
      const [tempMainResponse, tempSourceResponse] = await Promise.all([
        fetch(tempMainResult.url),
        fetch(tempSourceResult.url),
      ]);
      
      if (!tempMainResponse.ok || !tempSourceResponse.ok) {
        throw new Error('Failed to download from temp paths');
      }
      
      const [tempMainBlob, tempSourceBlob] = await Promise.all([
        tempMainResponse.blob(),
        tempSourceResponse.blob(),
      ]);
      
      console.log('Uploading to final paths (after deletion)...');
      // Upload to final paths with allowOverwrite to ensure proper replacement
      // This ensures the blob is properly overwritten even if deletion didn't fully propagate
      [newMainResult, newSourceResult] = await Promise.all([
        uploadImageToBlob(`rooms/${roomId}/main.jpg`, new File([tempMainBlob], 'main.jpg', { type: tempMainBlob.type }), {
          contentType: tempMainBlob.type || 'image/jpeg',
          allowOverwrite: true, // Force overwrite to ensure new content
        }),
        uploadImageToBlob(`rooms/${roomId}/${cleanFilename}`, new File([tempSourceBlob], cleanFilename, { type: tempSourceBlob.type }), {
          contentType: tempSourceBlob.type || 'image/jpeg',
          allowOverwrite: true, // Force overwrite to ensure new content
        }),
      ]);
      
      console.log('New URLs after upload:', {
        oldMainUrl: mainImage.url,
        newMainUrl: newMainResult.url,
        urlChanged: newMainResult.url !== mainImage.url,
        oldSourceUrl: sourceImage.url,
        newSourceUrl: newSourceResult.url,
        sourceUrlChanged: newSourceResult.url !== sourceImage.url,
      });
      
      console.log('Successfully swapped images:', {
        newMain: newMainResult.url,
        newSource: newSourceResult.url,
        oldMain: mainImage.url,
        oldSource: sourceImage.url,
        note: 'Both images preserved - only positions swapped'
      });
      
      // Verify the swap actually happened by listing images again
      const verifyImages = await listRoomImages(roomId);
      const newMainVerify = verifyImages.find(img => img.filename === 'main.jpg');
      const newSourceVerify = verifyImages.find(img => img.filename === cleanFilename);
      
      console.log('Verification after swap:', {
        mainImageExists: !!newMainVerify,
        sourceImageExists: !!newSourceVerify,
        allImages: verifyImages.map(img => ({ filename: img.filename, isMain: img.isMain }))
      });
      
      if (!newMainVerify) {
        console.error('WARNING: main.jpg not found after swap!');
      }
      if (!newSourceVerify) {
        console.error('WARNING: source image not found after swap!');
      }
    } catch (finalUploadError) {
      console.error('Error uploading to final paths:', finalUploadError);
      
      // Try to restore from temp files
      try {
        const [tempMainResponse, tempSourceResponse] = await Promise.all([
          fetch(tempMainResult.url),
          fetch(tempSourceResult.url),
        ]);
        
        if (tempMainResponse.ok && tempSourceResponse.ok) {
          const [tempMainBlob, tempSourceBlob] = await Promise.all([
            tempMainResponse.blob(),
            tempSourceResponse.blob(),
          ]);
          
          // Try to restore original positions
          await Promise.all([
            uploadImageToBlob(`rooms/${roomId}/main.jpg`, new File([tempSourceBlob], 'main.jpg', { type: tempSourceBlob.type }), {
              contentType: tempSourceBlob.type || 'image/jpeg',
            }).catch(() => {}),
            uploadImageToBlob(`rooms/${roomId}/${cleanFilename}`, new File([tempMainBlob], cleanFilename, { type: tempMainBlob.type }), {
              contentType: tempMainBlob.type || 'image/jpeg',
            }).catch(() => {}),
          ]);
          console.log('Attempted to restore original images from temp');
        }
      } catch (restoreError) {
        console.error('Could not restore from temp:', restoreError);
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to complete image swap',
          details: finalUploadError instanceof Error ? finalUploadError.message : 'Unknown error',
          note: 'Attempted to restore original images. Please check and try again.'
        },
        { status: 500 }
      );
    }

    // Step 4: Clean up temp files
    try {
      await Promise.all([
        deleteImageFromBlob(tempMainResult.url).catch(() => {}),
        deleteImageFromBlob(tempSourceResult.url).catch(() => {}),
      ]);
      console.log('Cleaned up temp swap files');
    } catch (cleanupError) {
      console.warn('Could not clean up temp files (non-fatal):', cleanupError);
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

    // Revalidate paths to clear Next.js cache
    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath(`/api/cms/room-images`);
    revalidatePath(`/api/rooms`);

    // Wait a moment for Blob Storage to propagate the changes
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Final verification - list images one more time to confirm swap
    const finalImages = await listRoomImages(roomId);
    const finalMain = finalImages.find(img => img.filename === 'main.jpg' && !img.isHidden);
    const finalSource = finalImages.find(img => img.filename === cleanFilename && !img.isHidden);
    
    console.log('Final verification:', {
      mainImageFound: !!finalMain,
      sourceImageFound: !!finalSource,
      mainImageUrl: finalMain?.url,
      newMainResultUrl: newMainResult.url,
      oldMainUrl: mainImage.url,
      urlsMatch: finalMain?.url === newMainResult.url,
      // Note: URL may not change with R2 when overwriting same path
      // This is expected - the content changes but URL stays the same
      urlChanged: finalMain?.url !== mainImage.url,
      allImages: finalImages.map(img => ({ filename: img.filename, isMain: img.isMain, isHidden: img.isHidden, url: img.url }))
    });

    // Use the verified main image URL (from Blob Storage listing, not from upload result)
    const verifiedMainUrl = finalMain?.url || newMainResult.url;
    
    // Note: With R2, the URL may not change when overwriting the same path
    // This is normal behavior - the content is updated but the URL stays the same
    // The frontend will use cache busting (timestamp) to force refresh

    return NextResponse.json({
      success: true,
      message: 'Main image swapped successfully',
      timestamp: Date.now(),
      swapped: {
        newMain: verifiedMainUrl,
        newSource: newSourceResult.url,
        oldMain: mainImage.url,
        oldSource: sourceImage.url,
      },
      verification: {
        mainImageExists: !!finalMain,
        sourceImageExists: !!finalSource,
        mainImageUrl: verifiedMainUrl,
        // URL may not change - that's okay, content is updated
        urlChanged: verifiedMainUrl !== mainImage.url,
        note: verifiedMainUrl === mainImage.url 
          ? 'URL unchanged (expected with R2 overwrite) - content is updated, use cache busting'
          : 'URL changed',
      },
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
