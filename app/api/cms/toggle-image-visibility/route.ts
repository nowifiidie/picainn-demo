import { NextRequest, NextResponse } from 'next/server';
import { rename } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { roomId, filename, hide } = await request.json();

    if (!roomId || !filename || typeof hide !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Room ID, filename, and hide flag are required' },
        { status: 400 }
      );
    }

    const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
    const currentPath = join(roomDir, filename);

    let newFilename: string;
    if (hide) {
      // Hide: add _hidden_ prefix
      newFilename = filename.startsWith('_hidden_') ? filename : `_hidden_${filename}`;
    } else {
      // Show: remove _hidden_ prefix
      newFilename = filename.startsWith('_hidden_') ? filename.replace('_hidden_', '') : filename;
    }

    const newPath = join(roomDir, newFilename);

    // Don't allow hiding main.jpg - it's required
    if (hide && (filename === 'main.jpg' || filename === '_hidden_main.jpg')) {
      return NextResponse.json(
        { success: false, error: 'Cannot hide the main image. Set another image as main first.' },
        { status: 400 }
      );
    }

    try {
      await rename(currentPath, newPath);
      revalidatePath('/');
      return NextResponse.json({
        success: true,
        message: hide ? 'Image hidden successfully' : 'Image shown successfully',
        newFilename,
      });
    } catch (error) {
      console.error('Error toggling image visibility:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to toggle image visibility' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in toggle-image-visibility route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

