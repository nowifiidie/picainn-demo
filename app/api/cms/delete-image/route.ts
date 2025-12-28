import { NextRequest, NextResponse } from 'next/server';
import { rm } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

export const maxDuration = 30;

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');
    const filename = searchParams.get('filename');

    if (!roomId || !filename) {
      return NextResponse.json(
        { success: false, error: 'Room ID and filename are required' },
        { status: 400 }
      );
    }

    const imagePath = join(process.cwd(), 'public', 'images', 'rooms', roomId, filename);

    try {
      await rm(imagePath);
      revalidatePath('/');
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to delete image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in delete-image route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

