import { NextResponse } from 'next/server';
import { readdir, access, constants } from 'fs/promises';
import { join } from 'path';

interface RoomImages {
  roomId: string;
  mainImage: string;
  additionalImages: string[];
}

export async function GET() {
  try {
    const roomsDir = join(process.cwd(), 'public', 'images', 'rooms');
    const availableRooms: RoomImages[] = [];

    // Read all directories in the rooms folder
    const entries = await readdir(roomsDir, { withFileTypes: true });

    // Check each directory to see if it's a room folder with a main.jpg
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('room')) {
        const roomId = entry.name;
        const mainImagePath = join(roomsDir, roomId, 'main.jpg');

        try {
          // Check if main.jpg exists
          await access(mainImagePath, constants.F_OK);
          
          // Get all files in the room directory
          const roomFiles = await readdir(join(roomsDir, roomId));
          
          // Filter and sort additional images (image-1.jpg, image-2.jpg, etc.)
          const additionalImages = roomFiles
            .filter(file => file.startsWith('image-') && (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp')))
            .sort((a, b) => {
              // Extract numbers from image-1.jpg, image-2.jpg, etc.
              const numA = parseInt(a.match(/\d+/)?.[0] || '0');
              const numB = parseInt(b.match(/\d+/)?.[0] || '0');
              return numA - numB;
            });

          availableRooms.push({
            roomId,
            mainImage: `/images/rooms/${roomId}/main.jpg`,
            additionalImages: additionalImages.map(img => `/images/rooms/${roomId}/${img}`),
          });
        } catch {
          // main.jpg doesn't exist, skip this room
          continue;
        }
      }
    }

    // Sort rooms numerically (room1, room2, ..., room10, room11, etc.)
    availableRooms.sort((a, b) => {
      const numA = parseInt(a.roomId.replace('room', '')) || 0;
      const numB = parseInt(b.roomId.replace('room', '')) || 0;
      return numA - numB;
    });

    // Add cache headers to ensure fresh data
    return NextResponse.json(
      { rooms: availableRooms },
      {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      }
    );
  } catch (error) {
    console.error('Error scanning rooms directory:', error);
    return NextResponse.json(
      { error: 'Failed to scan rooms directory' },
      { status: 500 }
    );
  }
}

