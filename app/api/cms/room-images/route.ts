import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';
import { Redis } from '@upstash/redis';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

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

    const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
    
    try {
      const files = await readdir(roomDir);
      
      // Get list of deleted files from Redis (for production where file system is read-only)
      let deletedFiles: string[] = [];
      if (redis) {
        try {
          const deletedKey = `deleted-images:${roomId}`;
          deletedFiles = await redis.get<string[]>(deletedKey) || [];
        } catch (error) {
          console.error('Error fetching deleted files from Redis:', error);
        }
      }
      
      // Filter image files and exclude hidden files, deleted files (renamed), and files tracked as deleted in Redis
      const imageFiles = files.filter(file => {
        const ext = file.toLowerCase();
        const isImage = ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
        const isNotHidden = !file.startsWith('_hidden_');
        const isNotDeleted = !file.startsWith('_deleted_');
        const isNotTrackedAsDeleted = !deletedFiles.includes(file);
        return isImage && isNotHidden && isNotDeleted && isNotTrackedAsDeleted;
      });

      // Get file stats to sort by modification time (preserves original order)
      const filesWithStats = await Promise.all(
        imageFiles.map(async (file) => {
          const filePath = join(roomDir, file);
          const stats = await stat(filePath);
          return {
            file,
            mtime: stats.mtime.getTime(),
          };
        })
      );

      // Sort by modification time (oldest first) to preserve original order
      // This way, when an image becomes main.jpg, it stays in its original position
      filesWithStats.sort((a, b) => a.mtime - b.mtime);
      
      const sortedImageFiles = filesWithStats.map(item => item.file);

      // Check for hidden images (but exclude deleted ones)
      const hiddenFiles = files.filter(file => 
        file.startsWith('_hidden_') && !file.startsWith('_deleted_')
      );
      const hiddenImages = hiddenFiles
        .filter(file => {
          const ext = file.toLowerCase();
          return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png') || ext.endsWith('.webp');
        })
        .map(file => ({
          filename: file,
          url: `/images/rooms/${roomId}/${file}`,
          isMain: file === '_hidden_main.jpg',
          isHidden: true,
        }));

      const images = sortedImageFiles.map((file, index) => {
        const filePath = join(roomDir, file);
        return {
          filename: file,
          url: `/images/rooms/${roomId}/${file}`,
          isMain: file === 'main.jpg',
          isHidden: false,
          order: index,
        };
      });

      return NextResponse.json({
        success: true,
        images: [...images, ...hiddenImages],
      });
    } catch (error) {
      // Directory doesn't exist or can't be read
      return NextResponse.json({
        success: true,
        images: [],
      });
    }
  } catch (error) {
    console.error('Error fetching room images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch room images' },
      { status: 500 }
    );
  }
}

