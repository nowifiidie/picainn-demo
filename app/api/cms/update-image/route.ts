import { NextRequest, NextResponse } from 'next/server';
import { writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const roomId = formData.get('roomId') as string;
    const filename = formData.get('filename') as string;
    const image = formData.get('image') as File;

    if (!roomId || !filename || !image) {
      return NextResponse.json(
        { success: false, error: 'Room ID, filename, and image are required' },
        { status: 400 }
      );
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
    const oldImagePath = join(roomDir, filename);

    // Delete old image if it exists
    try {
      await rm(oldImagePath);
    } catch {
      // File doesn't exist, that's okay
    }

    // Save new image
    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const newImagePath = join(roomDir, filename);
    await writeFile(newImagePath, buffer);

    revalidatePath('/');
    return NextResponse.json({
      success: true,
      message: 'Image updated successfully',
    });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    );
  }
}

