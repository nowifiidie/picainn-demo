import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { revalidatePath } from 'next/cache';

const ROOM_METADATA_KEY = 'room-metadata';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json(
        { success: false, error: 'Redis not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { translations, overwrite = false } = body;

    // Get all rooms from Redis
    const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
    
    if (Object.keys(allRooms).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rooms found in Redis' },
        { status: 404 }
      );
    }

    const updatedRooms: Record<string, any> = {};
    const translationResults: Array<{ roomId: string; name: string; status: string }> = [];

    // If translations are provided, use them
    if (translations && typeof translations === 'object') {
      for (const [roomId, roomTranslations] of Object.entries(translations)) {
        if (!allRooms[roomId]) {
          translationResults.push({
            roomId,
            name: roomId,
            status: 'error: room not found'
          });
          continue;
        }

        const room = allRooms[roomId];
        
        // Update the room with provided translations
        updatedRooms[roomId] = {
          ...room,
          descriptionI18n: roomTranslations as Record<string, string>,
          lastUpdated: Date.now(),
        };

        translationResults.push({
          roomId,
          name: room.name || roomId,
          status: 'updated with translations'
        });
      }

      // Keep other rooms unchanged
      for (const [roomId, room] of Object.entries(allRooms)) {
        if (!updatedRooms[roomId]) {
          updatedRooms[roomId] = room;
        }
      }
    } else {
      // Auto-translate: Process each room that doesn't have translations
      for (const [roomId, room] of Object.entries(allRooms)) {
        try {
          // Skip if already has translations and overwrite is false
          if (!overwrite && room.descriptionI18n && Object.keys(room.descriptionI18n).length > 0) {
            translationResults.push({
              roomId,
              name: room.name || roomId,
              status: 'skipped (already has translations)'
            });
            updatedRooms[roomId] = room;
            continue;
          }

          // Get the description (fallback to empty string if not present)
          const description = room.description || '';
          
          if (!description) {
            translationResults.push({
              roomId,
              name: room.name || roomId,
              status: 'skipped (no description)'
            });
            updatedRooms[roomId] = room;
            continue;
          }

          // For auto-translate, we'll need actual translation logic
          // For now, return an error asking for manual translations
          translationResults.push({
            roomId,
            name: room.name || roomId,
            status: 'needs manual translation'
          });
          updatedRooms[roomId] = room;
        } catch (error) {
          console.error(`Error processing room ${roomId}:`, error);
          translationResults.push({
            roomId,
            name: room.name || roomId,
            status: `error: ${error instanceof Error ? error.message : 'Unknown error'}`
          });
          updatedRooms[roomId] = room;
        }
      }
    }

    // Save all updated rooms back to Redis
    await redis.set(ROOM_METADATA_KEY, updatedRooms);

    // Revalidate paths
    revalidatePath('/');
    revalidatePath('/api/rooms');

    return NextResponse.json({
      success: true,
      message: `Processed ${Object.keys(allRooms).length} rooms`,
      results: translationResults,
      updated: translationResults.filter(r => r.status.includes('updated') || r.status === 'translated').length,
      skipped: translationResults.filter(r => r.status.includes('skipped')).length,
    });
  } catch (error) {
    console.error('Error in bulk translate:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to translate rooms',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to preview what would be translated (without saving)
export async function GET() {
  try {
    if (!redis) {
      return NextResponse.json(
        { success: false, error: 'Redis not configured' },
        { status: 500 }
      );
    }

    const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
    
    const preview = Object.entries(allRooms).map(([roomId, room]) => ({
      roomId,
      name: room.name || roomId,
      type: room.type || 'Unknown',
      description: room.description || '',
      hasTranslations: !!(room.descriptionI18n && Object.keys(room.descriptionI18n).length > 0),
      translationCount: room.descriptionI18n ? Object.keys(room.descriptionI18n).length : 0,
    }));

    return NextResponse.json({
      success: true,
      totalRooms: Object.keys(allRooms).length,
      rooms: preview,
    });
  } catch (error) {
    console.error('Error fetching rooms preview:', error);
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

