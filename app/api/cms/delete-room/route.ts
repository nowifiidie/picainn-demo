import { NextRequest, NextResponse } from 'next/server';
import { rm, readdir } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';

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

    const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);

    try {
      // Try to delete the room directory
      try {
        await rm(roomDir, { recursive: true, force: true });
        revalidatePath('/');
        return NextResponse.json({
          success: true,
          message: 'Room deleted successfully',
        });
      } catch (deleteError: any) {
        // If deletion fails due to read-only file system, track in Redis
        if (deleteError.code === 'EROFS' || deleteError.code === 'EACCES' || deleteError.code === 'EPERM') {
          if (redis) {
            const deletedRoomsKey = 'deleted-rooms';
            const deletedRooms = await redis.get<string[]>(deletedRoomsKey) || [];
            if (!deletedRooms.includes(roomId)) {
              deletedRooms.push(roomId);
              await redis.set(deletedRoomsKey, deletedRooms);
            }
            revalidatePath('/');
            return NextResponse.json({
              success: true,
              message: 'Room marked for deletion',
              note: 'File system is read-only. Room deletion tracked in database. You may need to manually remove the room folder from your repository.'
            });
          } else {
            return NextResponse.json(
              {
                success: false,
                error: 'Cannot delete room in production environment',
                details: 'File system is read-only and Redis is not configured. Please set up Upstash Redis, or manually delete the room folder from your repository.',
                code: deleteError.code
              },
              { status: 403 }
            );
          }
        }
        throw deleteError;
      }
    } catch (error) {
      console.error('Error deleting room:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code;
      
      if (errorCode === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Room not found. It may have already been deleted.' },
          { status: 404 }
        );
      }

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
  } catch (error) {
    console.error('Error in delete-room route:', error);
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

