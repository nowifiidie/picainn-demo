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

// Language code mapping for MyMemory Translation API
const LANGUAGE_CODES: Record<string, string> = {
  'en': 'en',
  'zh': 'zh-CN', // Simplified Chinese
  'zh-TW': 'zh-TW', // Traditional Chinese
  'ko': 'ko',
  'th': 'th',
  'es': 'es',
  'fr': 'fr',
  'id': 'id',
  'ar': 'ar',
  'de': 'de',
  'vi': 'vi',
  'my': 'my', // Myanmar
};

// Translate text using MyMemory Translation API (free, no API key required)
async function translateText(text: string, targetLang: string): Promise<string> {
  try {
    const langCode = LANGUAGE_CODES[targetLang] || targetLang;
    
    // MyMemory Translation API - free tier: 10,000 words/day
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${langCode}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Translation API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      return data.responseData.translatedText;
    } else {
      console.error(`Translation failed for ${targetLang}:`, data);
      return text; // Fallback to original text
    }
  } catch (error) {
    console.error(`Error translating to ${targetLang}:`, error);
    // Return original text if translation fails
    return text;
  }
}

// Amenity keys that should not be translated (e.g. standard acronyms)
const AMENITY_KEEP_AS_IS = new Set(['Wi-Fi', 'WiFi', 'Wifi']);

// Translate a single text to all languages
async function translateToAllLanguages(sourceText: string): Promise<Record<string, string>> {
  const translations: Record<string, string> = {
    en: sourceText, // English is the source
  };

  const languages = ['zh', 'zh-TW', 'ko', 'th', 'es', 'fr', 'id', 'ar', 'de', 'vi', 'my'];

  const translationPromises = languages.map(async (lang) => {
    try {
      const translated = await translateText(sourceText, lang);
      return { lang, translated };
    } catch (error) {
      console.error(`Failed to translate to ${lang}:`, error);
      return { lang, translated: sourceText };
    }
  });

  const results = await Promise.all(translationPromises);
  results.forEach(({ lang, translated }) => {
    translations[lang] = translated;
  });

  return translations;
}

// Translate description to all languages (alias for clarity)
async function translateDescription(description: string): Promise<Record<string, string>> {
  return translateToAllLanguages(description);
}

// Translate room name and type to all languages
async function translateNameAndType(name: string, type: string): Promise<{ nameI18n: Record<string, string>; typeI18n: Record<string, string> }> {
  const [nameI18n, typeI18n] = await Promise.all([
    translateToAllLanguages(name),
    translateToAllLanguages(type),
  ]);
  return { nameI18n, typeI18n };
}

// Translate amenities to all languages; keep Wi-Fi (and similar) unchanged
async function translateAmenities(amenities: string[]): Promise<Record<string, string[]>> {
  const result: Record<string, string[]> = {
    en: amenities,
  };

  const languages = ['zh', 'zh-TW', 'ko', 'th', 'es', 'fr', 'id', 'ar', 'de', 'vi', 'my'];

  for (const lang of languages) {
    const translatedList: string[] = [];
    for (const amenity of amenities) {
      if (AMENITY_KEEP_AS_IS.has(amenity)) {
        translatedList.push(amenity); // Keep Wi-Fi etc. as-is
      } else {
        try {
          const translated = await translateText(amenity, lang);
          translatedList.push(translated);
        } catch {
          translatedList.push(amenity);
        }
      }
    }
    result[lang] = translatedList;
  }

  return result;
}

export async function POST(request: NextRequest) {
  try {
    if (!redis) {
      return NextResponse.json(
        { success: false, error: 'Redis not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { overwrite = false, dryRun = false } = body;

    // Get all rooms from Redis
    const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
    
    if (Object.keys(allRooms).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No rooms found in Redis' },
        { status: 404 }
      );
    }

    const updatedRooms: Record<string, any> = {};
    const translationResults: Array<{ 
      roomId: string; 
      name: string; 
      status: string;
      description?: string;
      translations?: Record<string, string>;
    }> = [];

    // Process each room
    for (const [roomId, room] of Object.entries(allRooms)) {
      try {
        // Skip if already has translations and overwrite is false
        if (!overwrite && room.descriptionI18n && Object.keys(room.descriptionI18n).length > 0) {
          translationResults.push({
            roomId,
            name: room.name || roomId,
            status: 'skipped (already has translations)',
            description: room.description,
          });
          updatedRooms[roomId] = room;
          continue;
        }

        // Get the description (required), name, type, and amenities
        const description = room.description || '';
        const name = room.name || roomId;
        const type = room.type || '';
        const amenities: string[] = Array.isArray(room.amenities) ? room.amenities : [];

        if (!description || description.trim() === '') {
          translationResults.push({
            roomId,
            name,
            status: 'skipped (no description)',
          });
          updatedRooms[roomId] = room;
          continue;
        }

        // Translate description, name, type, and amenities in parallel where possible
        const [descriptionI18n, { nameI18n, typeI18n }, amenitiesI18n] = await Promise.all([
          translateDescription(description),
          name && type ? translateNameAndType(name, type) : Promise.resolve({ nameI18n: { en: name } as Record<string, string>, typeI18n: { en: type } as Record<string, string> }),
          amenities.length > 0 ? translateAmenities(amenities) : Promise.resolve({ en: amenities } as Record<string, string[]>),
        ]);

        // If name/type were not translated (empty), keep only en
        const finalNameI18n = name && type ? nameI18n : { en: name };
        const finalTypeI18n = name && type ? typeI18n : { en: type };

        // Update the room with all translations
        updatedRooms[roomId] = {
          ...room,
          descriptionI18n,
          nameI18n: finalNameI18n,
          typeI18n: finalTypeI18n,
          amenitiesI18n: amenities.length > 0 ? amenitiesI18n : undefined,
          lastUpdated: Date.now(),
        };

        translationResults.push({
          roomId,
          name,
          status: dryRun ? 'would be translated' : 'translated',
          description: description.substring(0, 100) + (description.length > 100 ? '...' : ''),
          translations: dryRun ? descriptionI18n : undefined,
        });
      } catch (error) {
        console.error(`Error processing room ${roomId}:`, error);
        translationResults.push({
          roomId,
          name: room.name || roomId,
          status: `error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
        updatedRooms[roomId] = room;
      }
    }

    // Save all updated rooms back to Redis (unless dry run)
    if (!dryRun) {
      await redis.set(ROOM_METADATA_KEY, updatedRooms);
      revalidatePath('/');
      revalidatePath('/api/rooms');
    }

    return NextResponse.json({
      success: true,
      dryRun,
      message: dryRun 
        ? `Preview: Would translate ${translationResults.filter(r => r.status === 'would be translated').length} rooms`
        : `Translated ${translationResults.filter(r => r.status === 'translated').length} rooms`,
      totalRooms: Object.keys(allRooms).length,
      results: translationResults,
      summary: {
        translated: translationResults.filter(r => r.status.includes('translated') || r.status.includes('would be')).length,
        skipped: translationResults.filter(r => r.status.includes('skipped')).length,
        errors: translationResults.filter(r => r.status.includes('error')).length,
      },
    });
  } catch (error) {
    console.error('Error in auto-translate:', error);
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

// GET endpoint to preview what would be translated
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
      maxGuests: room.maxGuests || 0,
      size: room.size || '',
    }));

    return NextResponse.json({
      success: true,
      totalRooms: Object.keys(allRooms).length,
      rooms: preview,
      instructions: {
        step1: 'Review the rooms above',
        step2: 'POST to this endpoint with { "dryRun": true } to preview translations',
        step3: 'POST to this endpoint with { "overwrite": false } to translate rooms without translations',
        step4: 'POST to this endpoint with { "overwrite": true } to retranslate all rooms',
      },
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

