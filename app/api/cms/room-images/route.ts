import { NextRequest, NextResponse } from 'next/server';
import { listRoomImages, uploadImageToBlob, deleteImageFromBlob } from '@/lib/blob-storage';
import { Redis } from '@upstash/redis';

const DELETED_IMAGES_KEY = 'deleted-images';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

/**
 * Ensures a room has a main image by automatically promoting one if none exists
 */
async function ensureMainImage(roomId: string): Promise<boolean> {
  try {
    const images = await listRoomImages(roomId);
    
    // Check if main.jpg exists
    const mainImage = images.find(img => img.filename === 'main.jpg' && !img.isHidden);
    if (mainImage) {
      return true; // Main image already exists
    }
    
    // Find the first available non-hidden image to promote to main
    const availableImages = images.filter(img => !img.isHidden && img.filename !== 'main.jpg');
    if (availableImages.length === 0) {
      console.warn(`No images available to promote to main for room ${roomId}`);
      return false; // No images to promote
    }
    
    // Randomly select one image (or just use the first one)
    const imageToPromote = availableImages[Math.floor(Math.random() * availableImages.length)];
    console.log(`Auto-promoting ${imageToPromote.filename} to main.jpg for room ${roomId}`);
    
    // Download the image
    const imageResponse = await fetch(imageToPromote.url);
    if (!imageResponse.ok) {
      console.error(`Failed to download image ${imageToPromote.filename} for promotion`);
      return false;
    }
    
    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], 'main.jpg', { type: imageBlob.type || 'image/jpeg' });
    
    // Upload as main.jpg
    await uploadImageToBlob(`rooms/${roomId}/main.jpg`, imageFile, {
      contentType: imageBlob.type || 'image/jpeg',
      allowOverwrite: true,
    });
    
    // Update Redis metadata if available
    if (redis) {
      try {
        const ROOM_METADATA_KEY = 'room-metadata';
        const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
        if (allRooms[roomId]) {
          allRooms[roomId].mainImageUrl = imageToPromote.url; // Keep original URL for now
          allRooms[roomId].lastUpdated = Date.now();
          await redis.set(ROOM_METADATA_KEY, allRooms);
        }
      } catch (error) {
        console.error('Error updating Redis metadata (non-fatal):', error);
      }
    }
    
    console.log(`Successfully auto-promoted ${imageToPromote.filename} to main.jpg for room ${roomId}`);
    return true;
  } catch (error) {
    console.error(`Error ensuring main image for room ${roomId}:`, error);
    return false;
  }
}

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

    // Ensure room has a main image (auto-promote one if none exists)
    await ensureMainImage(roomId);
    
    // List images from Cloudflare R2
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
