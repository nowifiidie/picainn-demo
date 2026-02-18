import { NextResponse } from 'next/server';
import { readdir, access, constants } from 'fs/promises';
import { join } from 'path';
import { roomOrder } from '@/lib/rooms';
import { Redis } from '@upstash/redis';
import { listRoomImages } from '@/lib/blob-storage';

const ROOM_ORDER_KEY = 'room-order';
const ROOM_METADATA_KEY = 'room-metadata';
const DELETED_ROOMS_KEY = 'deleted-rooms';

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
  metadata?: {
    name: string;
    type: string;
    description: string;
    descriptionI18n?: {
      en?: string;
      zh?: string;
      'zh-TW'?: string;
      ko?: string;
      th?: string;
      es?: string;
      fr?: string;
      id?: string;
      ar?: string;
      de?: string;
      vi?: string;
      my?: string;
    };
    amenities: string[];
    bedInfo: string;
    maxGuests: number;
    size: string;
    address: string;
    mapUrl: string;
    altText?: {
      en?: string;
      ja?: string;
      ko?: string;
      zh?: string;
    };
    lastUpdated?: number;
  };
}

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const availableRooms: RoomImages[] = [];

    // Get deleted rooms from Redis
    let deletedRooms: string[] = [];
    if (redis) {
      try {
        deletedRooms = await redis.get<string[]>(DELETED_ROOMS_KEY) || [];
      } catch (error) {
        console.error('Error fetching deleted rooms from Redis:', error);
      }
    }

    // Get rooms from Blob Storage (Redis metadata)
    if (redis) {
      try {
        const blobRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
        
        for (const [roomId, metadata] of Object.entries(blobRooms)) {
          if (deletedRooms.includes(roomId)) {
            continue;
          }

          // Get images from Cloudflare R2
          const images = await listRoomImages(roomId);
          // Find main image by filename (main.jpg) - this is the source of truth
          const mainImage = images.find(img => img.filename === 'main.jpg' && !img.isHidden);
          const additionalImages = images
            .filter(img => img.filename !== 'main.jpg' && !img.isHidden)
            .sort((a, b) => a.filename.localeCompare(b.filename));

          // Include room even if no main image (use first available image or placeholder)
          if (images.length > 0) {
            const displayImage = mainImage || images[0]; // Use main image or first available
            availableRooms.push({
              roomId,
              mainImage: displayImage.url,
              additionalImages: additionalImages.map(img => img.url),
              metadata: {
                name: metadata.name,
                type: metadata.type,
                description: metadata.description,
                descriptionI18n: metadata.descriptionI18n,
                amenities: metadata.amenities,
                bedInfo: metadata.bedInfo,
                maxGuests: metadata.maxGuests,
                size: metadata.size,
                address: metadata.address,
                mapUrl: metadata.mapUrl,
                altText: metadata.altText,
                lastUpdated: metadata.lastUpdated,
              },
            });
          } else {
            // Room has no images at all - still include it but with a placeholder
            console.warn(`Room ${roomId} has no images, using placeholder`);
            availableRooms.push({
              roomId,
              mainImage: '/images/placeholder-room.jpg',
              additionalImages: [],
              metadata: {
                name: metadata.name,
                type: metadata.type,
                description: metadata.description,
                descriptionI18n: metadata.descriptionI18n,
                amenities: metadata.amenities,
                bedInfo: metadata.bedInfo,
                maxGuests: metadata.maxGuests,
                size: metadata.size,
                address: metadata.address,
                mapUrl: metadata.mapUrl,
                altText: metadata.altText,
                lastUpdated: metadata.lastUpdated,
              },
            });
          }
        }
      } catch (error) {
        console.error('Error fetching rooms from Blob Storage:', error);
      }
    }

    // Also check file system for legacy rooms (backward compatibility)
    try {
      const roomsDir = join(process.cwd(), 'public', 'images', 'rooms');
      const entries = await readdir(roomsDir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && entry.name.startsWith('room')) {
          const roomId = entry.name;
          
          // Skip if already added from Blob Storage or marked as deleted
          if (availableRooms.some(r => r.roomId === roomId) || deletedRooms.includes(roomId)) {
            continue;
          }
          
          const mainImagePath = join(roomsDir, roomId, 'main.jpg');

          try {
            // Check if main.jpg exists
            await access(mainImagePath, constants.F_OK);
            
            // Get all files in the room directory
            const roomFiles = await readdir(join(roomsDir, roomId));
            
            // Filter and sort additional images
            const additionalImages = roomFiles
              .filter(file => file.startsWith('image-') && (file.endsWith('.jpg') || file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.webp')))
              .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numA - numB;
              });

            // Get metadata from static file for legacy rooms
            const { getRoomMetadata } = await import('@/lib/rooms');
            const metadata = getRoomMetadata(roomId);

            availableRooms.push({
              roomId,
              mainImage: `/images/rooms/${roomId}/main.jpg`,
              additionalImages: additionalImages.map(img => `/images/rooms/${roomId}/${img}`),
              metadata: metadata ? {
                name: metadata.name,
                type: metadata.type,
                description: metadata.description,
                amenities: metadata.amenities,
                bedInfo: metadata.bedInfo,
                maxGuests: metadata.maxGuests,
                size: metadata.size,
                address: metadata.address,
                mapUrl: metadata.mapUrl,
                altText: metadata.altText,
                lastUpdated: metadata.lastUpdated,
              } : undefined,
            });
          } catch {
            // main.jpg doesn't exist, skip this room
            continue;
          }
        }
      }
    } catch (error) {
      // File system not accessible (e.g., in serverless), that's okay
      console.log('File system not accessible, using Blob Storage only');
    }

    // Get room order from Redis
    let savedOrder: string[] = [];
    
    if (redis) {
      try {
        const redisOrder = await redis.get<string[]>(ROOM_ORDER_KEY);
        if (Array.isArray(redisOrder) && redisOrder.length > 0) {
          savedOrder = redisOrder;
        }
      } catch (redisError) {
        console.log('Redis not available, using fallback');
      }
    }
    
    // Fallback: use roomOrder from lib/rooms.ts
    if (savedOrder.length === 0) {
      savedOrder = roomOrder || [];
    }

    // Sort rooms based on saved order
    if (savedOrder.length > 0) {
      availableRooms.sort((a, b) => {
        const orderA = savedOrder.indexOf(a.roomId);
        const orderB = savedOrder.indexOf(b.roomId);
        
        if (orderA !== -1 && orderB !== -1) {
          return orderA - orderB;
        }
        if (orderA !== -1) return -1;
        if (orderB !== -1) return 1;
        const numA = parseInt(a.roomId.replace('room', '')) || 0;
        const numB = parseInt(b.roomId.replace('room', '')) || 0;
        return numA - numB;
      });
    } else {
      availableRooms.sort((a, b) => {
        const numA = parseInt(a.roomId.replace('room', '')) || 0;
        const numB = parseInt(b.roomId.replace('room', '')) || 0;
        return numA - numB;
      });
    }

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
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rooms' },
      { status: 500 }
    );
  }
}
