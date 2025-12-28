import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, stat, utimes } from 'fs/promises';
import { join } from 'path';
import { revalidatePath } from 'next/cache';

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

    const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
    const currentMainPath = join(roomDir, 'main.jpg');
    const sourcePath = join(roomDir, filename);

    try {
      // Check if the selected image is already main.jpg
      if (filename === 'main.jpg') {
        return NextResponse.json({
          success: true,
          message: 'This image is already the main image',
        });
      }

      // Check if source file exists
      try {
        await stat(sourcePath);
      } catch {
        return NextResponse.json(
          { success: false, error: 'Source image not found' },
          { status: 404 }
        );
      }

      // Read both files
      const mainImageData = await readFile(currentMainPath);
      const sourceImageData = await readFile(sourcePath);

      // Get modification times to preserve them
      const mainStats = await stat(currentMainPath);
      const sourceStats = await stat(sourcePath);

      // Swap the image content (not the filenames)
      // Write source image content to main.jpg
      await writeFile(currentMainPath, sourceImageData);
      
      // Write main image content to source file
      await writeFile(sourcePath, mainImageData);

      // Update modification times to current time to ensure proper sorting
      // This ensures the swapped images are properly sorted
      const now = new Date();
      await Promise.all([
        utimes(currentMainPath, now, now),
        utimes(sourcePath, now, now)
      ]);

      // Revalidate paths to clear Next.js cache
      revalidatePath('/');
      revalidatePath(`/images/rooms/${roomId}/main.jpg`);
      revalidatePath(`/images/rooms/${roomId}/${filename}`);

      return NextResponse.json({
        success: true,
        message: 'Main image swapped successfully',
        timestamp: Date.now(), // Return timestamp for cache busting
      });
    } catch (error) {
      console.error('Error setting main image:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to set main image' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in set-main-image route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

