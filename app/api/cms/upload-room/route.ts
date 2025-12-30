import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { uploadImageToBlob } from '@/lib/blob-storage';
import { Redis } from '@upstash/redis';

const ROOM_METADATA_KEY = 'room-metadata';
const ROOM_ORDER_KEY = 'room-order';
const DELETED_ROOMS_KEY = 'deleted-rooms';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export const maxDuration = 60; // 60 seconds for large uploads

interface RoomMetadata {
  id: string;
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
  lastUpdated: number;
  mainImageUrl?: string; // Store Blob URL for main image
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    const bedInfo = formData.get('bedInfo') as string;
    const maxGuests = formData.get('maxGuests') as string;
    const size = formData.get('size') as string;
    const address = formData.get('address') as string;
    const mapUrl = formData.get('mapUrl') as string;
    const amenitiesArray = formData.getAll('amenities') as string[];
    const altTextEn = formData.get('altTextEn') as string;
    const altTextJa = formData.get('altTextJa') as string;
    const altTextKo = formData.get('altTextKo') as string;
    const altTextZh = formData.get('altTextZh') as string;
    // Get multiple images
    const images = formData.getAll('images') as File[];
    
    // Build descriptionI18n object from form data
    const descriptionI18n: Record<string, string> = {};
    const supportedLanguages = ['en', 'zh', 'zh-TW', 'ko', 'th', 'es', 'fr', 'id', 'ar', 'de', 'vi', 'my'];
    for (const lang of supportedLanguages) {
      const value = formData.get(`descriptionI18n-${lang}`) as string;
      if (value && value.trim()) {
        descriptionI18n[lang] = value.trim();
      }
    }

    if (!name || !type || !description || !bedInfo || !maxGuests || !size || !address || !mapUrl || !images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name, type, description, bed info, max guests, size, address, map URL, and at least one image are required' },
        { status: 400 }
      );
    }

    // Ensure size is in m² format
    let formattedSize = size.trim();
    if (!formattedSize.toLowerCase().endsWith('m²') && !formattedSize.toLowerCase().endsWith('m2')) {
      formattedSize = `${formattedSize.replace(/\s*m²?\s*$/i, '')} m²`;
    } else if (formattedSize.toLowerCase().endsWith('m2')) {
      formattedSize = formattedSize.replace(/m2$/i, 'm²');
    }

    // Validate all files are images
    for (const image of images) {
      if (!image.type.startsWith('image/')) {
        return NextResponse.json(
          { success: false, error: 'All files must be images' },
          { status: 400 }
        );
      }
    }

    // Get next room number from Redis or fallback
    // Exclude deleted rooms to avoid reusing IDs
    let roomId: string;
    if (redis) {
      const allRooms = await redis.get<Record<string, RoomMetadata>>(ROOM_METADATA_KEY) || {};
      const deletedRooms = await redis.get<string[]>(DELETED_ROOMS_KEY) || [];
      
      // Get all room numbers from existing rooms (excluding deleted ones)
      const activeRoomNumbers = Object.keys(allRooms)
        .filter(id => !deletedRooms.includes(id)) // Exclude deleted rooms
        .map(id => parseInt(id.replace('room', '')) || 0)
        .filter(num => num > 0)
        .sort((a, b) => b - a);
      
      // Also check deleted rooms to find the highest number ever used
      const deletedRoomNumbers = deletedRooms
        .map(id => parseInt(id.replace('room', '')) || 0)
        .filter(num => num > 0);
      
      const allRoomNumbers = [...activeRoomNumbers, ...deletedRoomNumbers];
      const maxRoomNumber = allRoomNumbers.length > 0 ? Math.max(...allRoomNumbers) : 0;
      const nextRoomNumber = maxRoomNumber + 1;
      roomId = `room${nextRoomNumber}`;
    } else {
      // Fallback: try to read from lib/rooms.ts for local dev
      try {
        const { readFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const existingRooms = await readFile(join(process.cwd(), 'lib', 'rooms.ts'), 'utf-8');
        const roomMatches = existingRooms.match(/room(\d+):/g) || [];
        const roomNumbers = roomMatches.map(m => parseInt(m.match(/\d+/)![0])).sort((a, b) => b - a);
        const nextRoomNumber = roomNumbers.length > 0 ? roomNumbers[0] + 1 : 1;
        roomId = `room${nextRoomNumber}`;
      } catch {
        roomId = `room${Date.now()}`; // Fallback to timestamp
      }
    }

    // Upload images to Cloudflare R2
    const uploadedImages: { url: string; filename: string }[] = [];
    let mainImageUrl: string | undefined;

    try {
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        let filename: string;
        if (i === 0) {
          filename = 'main.jpg';
        } else {
          filename = `image-${i}.jpg`;
        }
        
        const blobPath = `rooms/${roomId}/${filename}`;
        const { url } = await uploadImageToBlob(blobPath, image, {
          contentType: image.type,
        });
        
        uploadedImages.push({ url, filename });
        if (i === 0) {
          mainImageUrl = url;
        }
      }
    } catch (blobError: any) {
      console.error('Error uploading images to R2:', blobError);
      // Try to clean up any uploaded images
      const { deleteImageFromBlob } = await import('@/lib/blob-storage');
      for (const img of uploadedImages) {
        try {
          await deleteImageFromBlob(img.url);
        } catch {
          // Ignore cleanup errors
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to upload images to R2',
          details: blobError.message || 'Error uploading images',
        },
        { status: 500 }
      );
    }

    // Build room metadata
    const altText: RoomMetadata['altText'] = {};
    if (altTextEn) altText.en = altTextEn;
    if (altTextJa) altText.ja = altTextJa;
    if (altTextKo) altText.ko = altTextKo;
    if (altTextZh) altText.zh = altTextZh;

    const roomMetadata: RoomMetadata = {
      id: roomId,
      name,
      type,
      description,
      descriptionI18n: Object.keys(descriptionI18n).length > 0 ? descriptionI18n : undefined,
      amenities: amenitiesArray.length > 0 ? amenitiesArray : ['Wi-Fi', 'Private Bathroom'],
      bedInfo,
      maxGuests: parseInt(maxGuests) || 2,
      size: formattedSize,
      address,
      mapUrl,
      altText: Object.keys(altText).length > 0 ? altText : undefined,
      lastUpdated: Date.now(),
      mainImageUrl,
    };

    // Save room metadata to Redis
    if (redis) {
      try {
        const allRooms = await redis.get<Record<string, RoomMetadata>>(ROOM_METADATA_KEY) || {};
        allRooms[roomId] = roomMetadata;
        await redis.set(ROOM_METADATA_KEY, allRooms);

        // Add to room order
        const currentOrder = await redis.get<string[]>(ROOM_ORDER_KEY) || [];
        if (!currentOrder.includes(roomId)) {
          currentOrder.push(roomId);
          await redis.set(ROOM_ORDER_KEY, currentOrder);
        }
      } catch (redisError) {
        console.error('Error saving to Redis:', redisError);
        // Continue - we'll try to save to file as fallback
      }
    }

    // Fallback: Try to save to lib/rooms.ts for local dev (optional)
    if (process.env.NODE_ENV === 'development') {
      try {
        const { readFile, writeFile } = await import('node:fs/promises');
        const { join } = await import('node:path');
        const roomsFilePath = join(process.cwd(), 'lib', 'rooms.ts');
        const roomsFileContent = await readFile(roomsFilePath, 'utf-8');

        // Find insertion point
        const lastRoomMatch = roomsFileContent.match(/(room\d+):\s*\{[\s\S]*?\},?\s*(?=\s*\/\/|\s*\/\*|\s*\};)/);
        let insertPosition: number;
        
        if (lastRoomMatch && lastRoomMatch.index !== undefined) {
          insertPosition = lastRoomMatch.index + lastRoomMatch[0].length;
        } else {
          const roomMetadataEnd = roomsFileContent.lastIndexOf('};');
          insertPosition = roomMetadataEnd === -1 ? roomsFileContent.length : roomMetadataEnd;
        }

        // Build room entry (note: mainImageUrl won't be in file, it's in Blob)
        const escapedName = name.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const escapedType = type.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const escapedDesc = description.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const escapedBedInfo = bedInfo.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const escapedSize = formattedSize.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const escapedAddress = address.replace(/'/g, "\\'").replace(/\n/g, ' ');
        const escapedMapUrl = mapUrl.replace(/'/g, "\\'").replace(/\n/g, ' ');
        
        const altTextParts = [];
        if (altTextEn) altTextParts.push(`en: '${altTextEn.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
        if (altTextJa) altTextParts.push(`ja: '${altTextJa.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
        if (altTextKo) altTextParts.push(`ko: '${altTextKo.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
        if (altTextZh) altTextParts.push(`zh: '${altTextZh.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
        
        const altTextContent = altTextParts.length > 0 
          ? `,\n    altText: {\n      ${altTextParts.join(',\n      ')},\n    }`
          : '';
        
        const amenitiesStr = roomMetadata.amenities.map(a => `'${a.replace(/'/g, "\\'")}'`).join(', ');
        
        const newRoomEntry = `,\n  ${roomId}: {
    id: '${roomId}',
    name: '${escapedName}',
    type: '${escapedType}',
    description: '${escapedDesc}',
    amenities: [${amenitiesStr}],
    bedInfo: '${escapedBedInfo}',
    maxGuests: ${roomMetadata.maxGuests},
    size: '${escapedSize}',
    address: '${escapedAddress}',
    mapUrl: '${escapedMapUrl}'${altTextContent},
    lastUpdated: ${roomMetadata.lastUpdated},
  },`;

        const newContent = 
          roomsFileContent.slice(0, insertPosition) + 
          newRoomEntry + 
          roomsFileContent.slice(insertPosition);

        await writeFile(roomsFilePath, newContent, 'utf-8');
      } catch (fileError) {
        console.error('Error saving to file (non-fatal):', fileError);
        // Non-fatal - metadata is in Redis
      }
    }

    // Revalidate the home page
    revalidatePath('/');

    return NextResponse.json({ 
      success: true, 
      message: `Room ${roomId} added successfully`,
      roomId,
      mainImageUrl,
    });
  } catch (error) {
    console.error('Error adding room:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    const errorCode = (error as any)?.code;
    
    console.error('Error details:', errorMessage);
    console.error('Error code:', errorCode);
    if (errorStack) {
      console.error('Error stack:', errorStack);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add room',
        details: errorMessage,
        code: errorCode,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}
