import { NextRequest, NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';
import { listRoomImages, deleteImageFromBlob } from '@/lib/blob-storage';

const ROOM_METADATA_KEY = 'room-metadata';
const ROOM_ORDER_KEY = 'room-order';
const DELETED_ROOMS_KEY = 'deleted-rooms';

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

    if (!roomId) {
      return NextResponse.json(
        { success: false, error: 'Room ID is required' },
        { status: 400 }
      );
    }

    // Validate roomId to prevent directory traversal
    if (roomId.includes('..') || roomId.includes('/') || roomId.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid room ID' },
        { status: 400 }
      );
    }

    // Delete images from Blob Storage
    try {
      const images = await listRoomImages(roomId);
      await Promise.all(
        images.map(img => deleteImageFromBlob(img.url).catch(err => {
          console.error(`Error deleting image ${img.filename} from Blob:`, err);
          // Continue even if some deletions fail
        }))
      );
    } catch (blobError) {
      console.error('Error deleting images from Blob Storage:', blobError);
      // Continue with other cleanup even if Blob deletion fails
    }

    // Remove from Redis metadata and order
    if (redis) {
      try {
        // Remove from room metadata
        const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
        if (allRooms[roomId]) {
          delete allRooms[roomId];
          await redis.set(ROOM_METADATA_KEY, allRooms);
        }

        // Remove from room order
        const currentOrder = await redis.get<string[]>(ROOM_ORDER_KEY) || [];
        const updatedOrder = currentOrder.filter(id => id !== roomId);
        if (updatedOrder.length !== currentOrder.length) {
          await redis.set(ROOM_ORDER_KEY, updatedOrder);
        }

        // Mark as deleted (for tracking)
        const deletedRooms = await redis.get<string[]>(DELETED_ROOMS_KEY) || [];
        if (!deletedRooms.includes(roomId)) {
          deletedRooms.push(roomId);
          await redis.set(DELETED_ROOMS_KEY, deletedRooms);
        }
      } catch (redisError) {
        console.error('Error updating Redis:', redisError);
        // Continue with file deletion even if Redis update fails
      }
    }

    // Try to delete the room directory from file system (for legacy rooms)
    const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
    try {
      await rm(roomDir, { recursive: true, force: true });
      console.log(`Successfully deleted room directory: ${roomDir}`);
    } catch (deleteError: any) {
      // File system deletion is optional - room is already removed from Redis/Blob
      if (deleteError.code !== 'ENOENT') {
        console.log(`Could not delete room directory (non-fatal): ${deleteError.code}`);
      }
    }

    revalidatePath('/');
    return NextResponse.json({
      success: true,
      message: `Room ${roomId} deleted successfully`,
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = (error as any)?.code;
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete room',
        details: errorMessage,
        code: errorCode
      },
      { status: 500 }
    );
  }
}
