import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const ROOM_METADATA_KEY = 'room-metadata';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { success: false, error: 'Redis not configured' },
        { status: 500 }
      );
    }

    const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
    
    const roomsForTranslation = Object.entries(allRooms).map(([roomId, room]) => ({
      roomId,
      name: room.name || roomId,
      type: room.type || 'Unknown',
      description: room.description || '',
      hasTranslations: !!(room.descriptionI18n && Object.keys(room.descriptionI18n).length > 0),
      currentTranslations: room.descriptionI18n || {},
      maxGuests: room.maxGuests || 0,
      size: room.size || '',
      bedInfo: room.bedInfo || '',
    }));

    return NextResponse.json({
      success: true,
      totalRooms: Object.keys(allRooms).length,
      rooms: roomsForTranslation,
      message: 'Use this data to generate translations. Then POST to /api/cms/auto-translate-rooms with translations.',
    });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch rooms',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

