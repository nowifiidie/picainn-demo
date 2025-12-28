import { NextRequest, NextResponse } from 'next/server';
import { listRoomImages } from '@/lib/blob-storage';
import { Redis } from '@upstash/redis';

const DELETED_IMAGES_KEY = 'deleted-images';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Get deleted images from Redis
    let deletedImageFilenames: string[] = [];
    if (redis) {
      try {
        const kvDeletedImages = await redis.smembers(`deleted-images:${roomId}`);
        if (kvDeletedImages) {
          deletedImageFilenames = Array.from(kvDeletedImages);
        }
      } catch (error) {
        console.error('Error fetching deleted images from Redis:', error);
      }
    }

    // List images from Blob Storage
    const blobImages = await listRoomImages(roomId);

    // Filter out deleted images
    const filteredImages = blobImages.filter(img => {
      // Check if image is marked as deleted in Redis
      if (deletedImageFilenames.includes(img.filename)) {
        return false;
      }
      // Also filter out hidden images that are marked as deleted
      if (img.isHidden) {
        const originalFilename = img.filename.replace('_hidden_', '');
        if (deletedImageFilenames.includes(originalFilename)) {
          return false;
        }
      }
      return true;
    });

    // Sort images: main first, then by filename
    const sortedImages = filteredImages.sort((a, b) => {
      if (a.isMain && !b.isMain) return -1;
      if (!a.isMain && b.isMain) return 1;
      return a.filename.localeCompare(b.filename);
    });

    // Format response
    const images = sortedImages.map((img, index) => ({
      filename: img.filename,
      url: img.url,
      isMain: img.isMain,
      isHidden: img.isHidden,
      order: index,
    }));

    return NextResponse.json({
      success: true,
      images,
    });
  } catch (error) {
    console.error('Error fetching room images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room images' },
      { status: 500 }
    );
  }
}
