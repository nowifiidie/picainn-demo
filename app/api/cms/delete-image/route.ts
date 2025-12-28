import { NextRequest, NextResponse } from 'next/server';
import { rm, rename, access, constants } from 'fs/promises';
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

    const imagePath = join(process.cwd(), 'public', 'images', 'rooms', roomId, filename);
    const deletedPath = join(process.cwd(), 'public', 'images', 'rooms', roomId, `_deleted_${filename}`);

    try {
      let fileToDelete = imagePath;
      let targetPath = deletedPath;
      
      // Check if file exists first
      try {
        await access(imagePath, constants.F_OK);
      } catch (accessError) {
        // File doesn't exist - might be hidden or already deleted
        // Check if it exists with _hidden_ prefix
        const hiddenPath = join(process.cwd(), 'public', 'images', 'rooms', roomId, `_hidden_${filename}`);
        try {
          await access(hiddenPath, constants.F_OK);
          // Hidden version exists, mark it as deleted
          fileToDelete = hiddenPath;
          targetPath = join(process.cwd(), 'public', 'images', 'rooms', roomId, `_deleted_${filename}`);
        } catch {
          // Check if already marked as deleted
          try {
            await access(deletedPath, constants.F_OK);
            return NextResponse.json({
              success: true,
              message: 'Image already deleted',
            });
          } catch {
            return NextResponse.json(
              { success: false, error: 'Image not found. It may have already been deleted.' },
              { status: 404 }
            );
          }
        }
      }

      // Try to delete/rename the file
      try {
        // First, try to rename (mark as deleted) - works in local dev
        try {
          await rename(fileToDelete, targetPath);
          revalidatePath('/');
          return NextResponse.json({
            success: true,
            message: 'Image deleted successfully',
          });
        } catch (renameError: any) {
          // If rename fails, try actual delete (for local dev)
          if (renameError.code !== 'EROFS' && renameError.code !== 'EACCES' && renameError.code !== 'EPERM') {
            await rm(fileToDelete);
            revalidatePath('/');
            return NextResponse.json({
              success: true,
              message: 'Image deleted successfully',
            });
          }
          // If both fail due to read-only file system, track deletion in Redis
          throw renameError;
        }
      } catch (fileError: any) {
        // File system is read-only (production/serverless)
        if (fileError.code === 'EROFS' || fileError.code === 'EACCES' || fileError.code === 'EPERM') {
          // Track deleted files in Redis
          if (redis) {
            const deletedKey = `deleted-images:${roomId}`;
            const deletedFiles = await redis.get<string[]>(deletedKey) || [];
            if (!deletedFiles.includes(filename)) {
              deletedFiles.push(filename);
              await redis.set(deletedKey, deletedFiles);
            }
            revalidatePath('/');
            return NextResponse.json({
              success: true,
              message: 'Image deleted successfully',
              note: 'File system is read-only. Deletion tracked in database.'
            });
          } else {
            // Redis not available - return error with helpful message
            return NextResponse.json(
              {
                success: false,
                error: 'Cannot delete image in production environment',
                details: 'File system is read-only and Redis is not configured. Please set up Upstash Redis to track deleted files, or delete images manually from your repository.',
                code: fileError.code
              },
              { status: 403 }
            );
          }
        }
        throw fileError;
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      console.error('Room ID:', roomId);
      console.error('Filename:', filename);
      console.error('Image Path:', imagePath);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code;
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      // Log full error details for debugging
      console.error('Error code:', errorCode);
      console.error('Error stack:', errorStack);
      
      // Provide more specific error messages
      if (errorCode === 'EACCES' || errorCode === 'EPERM') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Permission denied. File system may be read-only in this environment.',
            details: 'In production (serverless) environments, file deletion may be restricted. Files are typically read-only in serverless deployments.',
            code: errorCode
          },
          { status: 403 }
        );
      }
      
      if (errorCode === 'ENOENT') {
        return NextResponse.json(
          { success: false, error: 'Image not found. It may have already been deleted.', code: errorCode },
          { status: 404 }
        );
      }

      // Return detailed error in both dev and production for debugging
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete image',
          details: errorMessage,
          code: errorCode,
          path: imagePath,
          roomId,
          filename
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

