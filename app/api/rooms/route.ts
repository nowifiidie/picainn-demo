import { NextResponse } from 'next/server';
import { readdir, access, constants, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { roomOrder } from '@/lib/rooms';
import { Redis } from '@upstash/redis';

const ROOM_ORDER_KEY = 'room-order';

// Initialize Redis client (will use environment variables automatically)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

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

    // Get list of deleted rooms from Redis (for production where file system is read-only)
    let deletedRooms: string[] = [];
    if (redis) {
      try {
        const deletedRoomsKey = 'deleted-rooms';
        deletedRooms = await redis.get<string[]>(deletedRoomsKey) || [];
      } catch (error) {
        console.error('Error fetching deleted rooms from Redis:', error);
      }
    }

    // Check each directory to see if it's a room folder with a main.jpg
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('room')) {
        const roomId = entry.name;
        
        // Skip if room is marked as deleted in Redis
        if (deletedRooms.includes(roomId)) {
          continue;
        }
        
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

    // Get room order from Upstash Redis (production) or fallback to lib/rooms.ts
    let savedOrder: string[] = [];
    
    if (redis) {
      try {
        // Try to get from Upstash Redis first
        const redisOrder = await redis.get<string[]>(ROOM_ORDER_KEY);
        if (Array.isArray(redisOrder) && redisOrder.length > 0) {
          savedOrder = redisOrder;
        }
      } catch (redisError) {
        // Redis not configured or not available, use fallback
        console.log('Redis not available, using fallback');
      }
    }
    
    // Fallback: use roomOrder from lib/rooms.ts
    if (savedOrder.length === 0) {
      savedOrder = roomOrder || [];
    }
    
    // Last resort: try reading from data file if roomOrder is empty (for backward compatibility)
    if (savedOrder.length === 0) {
      const orderFilePath = join(process.cwd(), 'data', 'room-order.json');
      if (existsSync(orderFilePath)) {
        try {
          const orderContent = await readFile(orderFilePath, 'utf-8');
          savedOrder = JSON.parse(orderContent);
        } catch (error) {
          console.error('Error reading room order file:', error);
        }
      }
    }

    // Sort rooms based on saved order, or fallback to numerical sort
    if (savedOrder.length > 0) {
      availableRooms.sort((a, b) => {
        const orderA = savedOrder.indexOf(a.roomId);
        const orderB = savedOrder.indexOf(b.roomId);
        
        // If both are in order, sort by order
        if (orderA !== -1 && orderB !== -1) {
          return orderA - orderB;
        }
        // If only A is in order, A comes first
        if (orderA !== -1) return -1;
        // If only B is in order, B comes first
        if (orderB !== -1) return 1;
        // If neither is in order, sort numerically
        const numA = parseInt(a.roomId.replace('room', '')) || 0;
        const numB = parseInt(b.roomId.replace('room', '')) || 0;
        return numA - numB;
      });
    } else {
      // Fallback to numerical sort if no order file exists
      availableRooms.sort((a, b) => {
        const numA = parseInt(a.roomId.replace('room', '')) || 0;
        const numB = parseInt(b.roomId.replace('room', '')) || 0;
        return numA - numB;
      });
    }

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

