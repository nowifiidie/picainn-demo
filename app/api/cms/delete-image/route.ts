import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { deleteImageFromBlob, listRoomImages } from '@/lib/blob-storage';
import { Redis } from '@upstash/redis';

const DELETED_IMAGES_KEY = 'deleted-images';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export const maxDuration = 30;

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    let filename = searchParams.get('filename');

    if (!roomId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Room ID and filename are required' },
        { status: 400 }
      );
    }

    // Decode URL-encoded filename
    try {
      filename = decodeURIComponent(filename);
    } catch {
      // If decoding fails, use original filename
    }

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }

    // Don't allow deleting main.jpg - it's required
    if (filename === 'main.jpg' || filename === '_hidden_main.jpg') {
      return NextResponse.json(
        { success: false, error: 'Cannot delete the main image. Set another image as main first, or delete the room entirely.' },
        { status: 400 }
      );
    }

    // Find the image in Blob Storage
    const roomImages = await listRoomImages(roomId);
    const imageToDelete = roomImages.find(img => img.filename === filename);

    if (!imageToDelete) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Delete from Blob Storage
    try {
      await deleteImageFromBlob(imageToDelete.url);
      
      // Also mark as deleted in Redis for tracking
      if (redis) {
        await redis.sadd(`deleted-images:${roomId}`, filename);
      }

      revalidatePath('/');
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting image from Blob Storage:', error);
      
      // If deletion fails, mark as deleted in Redis anyway (for tracking)
      if (redis) {
        await redis.sadd(`deleted-images:${roomId}`, filename);
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to delete image',
          details: error.message || 'Unknown error',
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in delete-image route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
