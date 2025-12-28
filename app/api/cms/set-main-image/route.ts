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

    // Check if the selected image is already main.jpg
    if (filename === 'main.jpg') {
      return NextResponse.json({
        success: true,
        message: 'This image is already the main image',
      });
    }

    // Get all room images from Blob Storage
    const roomImages = await listRoomImages(roomId);
    const sourceImage = roomImages.find(img => img.filename === filename);
    const mainImage = roomImages.find(img => img.isMain && img.filename === 'main.jpg');

    if (!sourceImage) {
      return NextResponse.json(
        { success: false, error: 'Source image not found' },
        { status: 404 }
      );
    }

    if (!mainImage) {
      return NextResponse.json(
        { success: false, error: 'Main image not found' },
        { status: 404 }
      );
    }

    // Download both images
    const [sourceResponse, mainResponse] = await Promise.all([
      fetch(sourceImage.url),
      fetch(mainImage.url),
    ]);

    if (!sourceResponse.ok || !mainResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to download images' },
        { status: 500 }
      );
    }

    const [sourceBlob, mainBlob] = await Promise.all([
      sourceResponse.blob(),
      mainResponse.blob(),
    ]);

    // Convert to Files for upload
    const sourceFile = new File([sourceBlob], 'main.jpg', { type: sourceBlob.type });
    const mainFile = new File([mainBlob], filename, { type: mainBlob.type });

    // Upload swapped images
    const [newMainResult, newSourceResult] = await Promise.all([
      uploadImageToBlob(`rooms/${roomId}/main.jpg`, sourceFile, {
        contentType: sourceBlob.type,
      }),
      uploadImageToBlob(`rooms/${roomId}/${filename}`, mainFile, {
        contentType: mainBlob.type,
      }),
    ]);

    // Delete old blobs
    await Promise.all([
      deleteImageFromBlob(sourceImage.url).catch(() => {}),
      deleteImageFromBlob(mainImage.url).catch(() => {}),
    ]);

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
    return NextResponse.json(
      { success: false, error: 'Failed to set main image' },
      { status: 500 }
    );
  }
}
