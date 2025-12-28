import { NextRequest, NextResponse } from 'next/server';
import { rm, access, constants } from 'fs/promises';
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

    const imagePath = join(process.cwd(), 'public', 'images', 'rooms', roomId, filename);

    try {
      // Check if file exists first
      try {
        await access(imagePath, constants.F_OK);
      } catch (accessError) {
        // File doesn't exist - might have already been deleted
        // Check if it exists with _hidden_ prefix
        const hiddenPath = join(process.cwd(), 'public', 'images', 'rooms', roomId, `_hidden_${filename}`);
        try {
          await access(hiddenPath, constants.F_OK);
          // Hidden version exists, delete that instead
          await rm(hiddenPath);
          revalidatePath('/');
          return NextResponse.json({
            success: true,
            message: 'Image deleted successfully',
          });
        } catch {
          return NextResponse.json(
            { success: false, error: 'Image not found. It may have already been deleted.' },
            { status: 404 }
          );
        }
      }

      // File exists, try to delete it
      await rm(imagePath);
      revalidatePath('/');
      return NextResponse.json({
        success: true,
        message: 'Image deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting image:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code;
      
      // Provide more specific error messages
      if (errorCode === 'EACCES' || errorCode === 'EPERM') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Permission denied. File system may be read-only in this environment.',
            details: 'In production (serverless) environments, file deletion may be restricted.'
          },
          { status: 403 }
        );
      }
      
      if (errorCode === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Image not found. It may have already been deleted.' },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete image',
          details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
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

