import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';
import { Redis } from '@upstash/redis';
import { uploadImageToBlob, listRoomImages } from '@/lib/blob-storage';

const ROOM_METADATA_KEY = 'room-metadata';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export const maxDuration = 60; // 60 seconds for large uploads

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const roomId = formData.get('roomId') as string;
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

    if (!roomId || !name || !type || !description) {
      return NextResponse.json(
        { success: false, error: 'Room ID, name, type, and description are required' },
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

    // Build alt text object
    const altText: Record<string, string> = {};
    if (altTextEn) altText.en = altTextEn;
    if (altTextJa) altText.ja = altTextJa;
    if (altTextKo) altText.ko = altTextKo;
    if (altTextZh) altText.zh = altTextZh;

    // Check if room exists in Redis (Blob Storage rooms)
    let roomExistsInRedis = false;
    if (redis) {
      try {
        const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
        roomExistsInRedis = !!allRooms[roomId];
      } catch (error) {
        console.error('Error checking Redis:', error);
      }
    }

    if (roomExistsInRedis && redis) {
      // Update room in Redis (Blob Storage rooms)
      const allRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
      
      allRooms[roomId] = {
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
        mainImageUrl: allRooms[roomId]?.mainImageUrl, // Preserve existing main image URL
      };

      await redis.set(ROOM_METADATA_KEY, allRooms);

      // Handle new image uploads to Blob Storage
      const validImages = images.filter(img => img && img.size > 0 && img.type.startsWith('image/'));
      if (validImages.length > 0) {
        // Get existing images to find the next available image number
        const existingImages = await listRoomImages(roomId);
        
        // Find the highest image number (e.g., image-8.jpg -> 8)
        let maxImageNumber = 0;
        for (const img of existingImages) {
          if (img.filename.startsWith('image-') && !img.isHidden) {
            const match = img.filename.match(/^image-(\d+)\./);
            if (match) {
              const num = parseInt(match[1], 10);
              if (num > maxImageNumber) {
                maxImageNumber = num;
              }
            }
          }
        }
        
        // Upload all new images as additional images (don't overwrite main.jpg)
        // Start numbering from the next available number
        for (let i = 0; i < validImages.length; i++) {
          const image = validImages[i];
          const imageNumber = maxImageNumber + i + 1;
          const filename = `image-${imageNumber}.jpg`;
          
          try {
            const blobPath = `rooms/${roomId}/${filename}`;
            const { url } = await uploadImageToBlob(blobPath, image, {
              contentType: image.type,
            });
            
            console.log(`Uploaded new image as ${filename} for room ${roomId}`);
          } catch (blobError) {
            console.error(`Error uploading image ${filename} to Blob Storage:`, blobError);
            // Continue with other images even if one fails
          }
        }
      }

      revalidatePath('/');
      return NextResponse.json({ 
        success: true, 
        message: `Room ${roomId} updated successfully`,
        timestamp: Date.now()
      });
    } else {
      // Update room in static file (legacy rooms)
      const roomsFilePath = join(process.cwd(), 'lib', 'rooms.ts');
      const roomsFileContent = await readFile(roomsFilePath, 'utf-8');

      // Build alt text parts for file
      const altTextParts = [];
      if (altTextEn) altTextParts.push(`en: '${altTextEn.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
      if (altTextJa) altTextParts.push(`ja: '${altTextJa.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
      if (altTextKo) altTextParts.push(`ko: '${altTextKo.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
      if (altTextZh) altTextParts.push(`zh: '${altTextZh.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
      
      const altTextContent = altTextParts.length > 0 
        ? `,\n    altText: {\n      ${altTextParts.join(',\n      ')},\n    }`
        : '';

      // Escape strings
      const escapedName = name.replace(/'/g, "\\'").replace(/\n/g, ' ');
      const escapedDesc = description.replace(/'/g, "\\'").replace(/\n/g, ' ');
      const escapedBedInfo = bedInfo.replace(/'/g, "\\'").replace(/\n/g, ' ');
      const escapedAddress = address.replace(/'/g, "\\'").replace(/\n/g, ' ');
      const escapedMapUrl = mapUrl.replace(/'/g, "\\'").replace(/\n/g, ' ');
      const escapedSize = formattedSize.replace(/'/g, "\\'").replace(/\n/g, ' ');

      // Find and replace the room entry
      const roomStartPattern = new RegExp(`${roomId}:\\s*\\{`);
      const roomStartMatch = roomsFileContent.match(roomStartPattern);
      
      if (!roomStartMatch || roomStartMatch.index === undefined) {
        return NextResponse.json(
          { success: false, error: `Room ${roomId} not found` },
          { status: 404 }
        );
      }
      
      let startIndex = roomStartMatch.index;
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      let endIndex = startIndex;
      
      // Find the matching closing brace
      for (let i = startIndex; i < roomsFileContent.length; i++) {
        const char = roomsFileContent[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' || char === "'") {
          inString = !inString;
          continue;
        }
        
        if (inString) continue;
        
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            endIndex = i + 1;
            // Check if there's a comma after
            if (roomsFileContent[endIndex] === ',') {
              endIndex++;
            }
            break;
          }
        }
      }
      
      const oldRoomEntry = roomsFileContent.substring(startIndex, endIndex);

      const timestamp = Date.now();
      const amenitiesStr = amenitiesArray.map(a => `'${a.replace(/'/g, "\\'")}'`).join(', ');
      
      const newRoomEntry = `${roomId}: {
    id: '${roomId}',
    name: '${escapedName}',
    type: '${type.replace(/'/g, "\\'")}',
    description: '${escapedDesc}',
    amenities: [${amenitiesStr}],
    bedInfo: '${escapedBedInfo}',
    maxGuests: ${parseInt(maxGuests) || 2},
    size: '${escapedSize}',
    address: '${escapedAddress}',
    mapUrl: '${escapedMapUrl}'${altTextContent},
    lastUpdated: ${timestamp},
  },`;

      const updatedContent = roomsFileContent.replace(oldRoomEntry, newRoomEntry);

      // Write updated file
      try {
        await writeFile(roomsFilePath, updatedContent, 'utf-8');
      } catch (writeError: any) {
        console.error('Error writing to file:', writeError);
        if (writeError.code === 'EROFS' || writeError.code === 'EACCES' || writeError.code === 'EPERM') {
          return NextResponse.json(
            {
              success: false,
              error: 'Cannot update room in production environment',
              details: 'File system is read-only. Room metadata cannot be updated in the static file.',
              code: writeError.code
            },
            { status: 403 }
          );
        }
        throw writeError;
      }

      // Update room images if provided (for legacy rooms - file system)
      const validImages = images.filter(img => img && img.size > 0 && img.type.startsWith('image/'));
      
      if (validImages.length > 0) {
        try {
          const { mkdir, readdir } = await import('node:fs/promises');
          const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
          await mkdir(roomDir, { recursive: true });

          // Validate all files are images (double check)
          for (const image of validImages) {
            if (!image.type || !image.type.startsWith('image/')) {
              return NextResponse.json(
                { success: false, error: 'All files must be images' },
                { status: 400 }
              );
            }
          }

          // Get existing images to find the next available image number
          let maxImageNumber = 0;
          try {
            const existingFiles = await readdir(roomDir);
            for (const file of existingFiles) {
              if (file.startsWith('image-') && file.endsWith('.jpg')) {
                const match = file.match(/^image-(\d+)\.jpg$/);
                if (match) {
                  const num = parseInt(match[1], 10);
                  if (num > maxImageNumber) {
                    maxImageNumber = num;
                  }
                }
              }
            }
          } catch (readError) {
            // Directory might not exist or be empty, that's okay
            console.log('Could not read existing images directory:', readError);
          }

          // Save all new images as additional images (don't overwrite main.jpg)
          // Start numbering from the next available number
          for (let i = 0; i < validImages.length; i++) {
            const image = validImages[i];
            const bytes = await image.arrayBuffer();
            const buffer = Buffer.from(bytes);
            
            const imageNumber = maxImageNumber + i + 1;
            const imagePath = join(roomDir, `image-${imageNumber}.jpg`);
            
            try {
              await writeFile(imagePath, buffer);
              console.log(`Saved new image as image-${imageNumber}.jpg for room ${roomId}`);
            } catch (writeError: any) {
              console.error(`Error saving image ${imagePath}:`, writeError);
              if (writeError.code === 'EROFS' || writeError.code === 'EACCES' || writeError.code === 'EPERM') {
                return NextResponse.json(
                  {
                    success: false,
                    error: 'Cannot save images in production environment',
                    details: 'File system is read-only. Images cannot be saved to the file system.',
                    code: writeError.code
                  },
                  { status: 403 }
                );
              }
              throw writeError;
            }
          }
        } catch (imageError: any) {
          console.error('Error processing images:', imageError);
          // Don't fail the whole update if image saving fails
        }
      }

      // Update CMS config timestamp
      await updateCMSConfig('rooms');

      // Revalidate all paths that use room data
      revalidatePath('/');
      revalidatePath('/api/rooms');
      revalidatePath(`/images/rooms/${roomId}`);

      return NextResponse.json({ 
        success: true, 
        message: `Room ${roomId} updated successfully`,
        timestamp: Date.now()
      });
    }
  } catch (error) {
    console.error('Error updating room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update room' },
      { status: 500 }
    );
  }
}

async function updateCMSConfig(type: 'hero' | 'rooms') {
  try {
    const configPath = join(process.cwd(), 'lib', 'rooms.ts');
    const configContent = await readFile(configPath, 'utf-8');
    const timestamp = Date.now();

    const propertyName = type === 'hero' ? 'heroLastUpdated' : 'roomsLastUpdated';
    
    // Find the cmsConfig object and rebuild it properly to avoid duplicates
    const configObjectPattern = /export let cmsConfig: CMSConfig = \{([\s\S]*?)\};/;
    const match = configContent.match(configObjectPattern);
    
    if (match) {
      let configBody = match[1];
      
      // Remove ALL occurrences of the property we're updating (to handle duplicates)
      const propertyPattern = new RegExp(`\\s*${propertyName}:\\s*\\d+[,\\n]*`, 'g');
      configBody = configBody.replace(propertyPattern, '');
      
      // Also remove the other property if it exists (to rebuild cleanly)
      const otherPropertyName = type === 'hero' ? 'roomsLastUpdated' : 'heroLastUpdated';
      const otherPropertyPattern = new RegExp(`\\s*${otherPropertyName}:\\s*\\d+[,\\n]*`, 'g');
      const otherPropertyMatch = configBody.match(new RegExp(`${otherPropertyName}:\\s*\\d+`));
      let otherPropertyValue = '';
      if (otherPropertyMatch) {
        otherPropertyValue = otherPropertyMatch[0];
        configBody = configBody.replace(otherPropertyPattern, '');
      }
      
      // Clean up extra commas and whitespace
      configBody = configBody.trim().replace(/^,|,$/g, '').trim();
      
      // Build new config body with both properties
      const properties = [];
      if (type === 'hero') {
        properties.push(`  heroLastUpdated: ${timestamp}`);
        if (otherPropertyValue) {
          properties.push(`  ${otherPropertyValue}`);
        } else {
          properties.push(`  roomsLastUpdated: ${Date.now()}`);
        }
      } else {
        if (otherPropertyValue) {
          properties.push(`  ${otherPropertyValue}`);
        } else {
          properties.push(`  heroLastUpdated: ${Date.now()}`);
        }
        properties.push(`  roomsLastUpdated: ${timestamp}`);
      }
      
      const newConfigBody = properties.join(',\n');
      const updatedContent = configContent.replace(
        configObjectPattern,
        `export let cmsConfig: CMSConfig = {\n${newConfigBody},\n};`
      );
      
      await writeFile(configPath, updatedContent, 'utf-8');
    } else {
      // Fallback: if pattern doesn't match, try simple replace (but replace ALL occurrences)
      const propertyPattern = new RegExp(`${propertyName}:\\s*\\d+`, 'g');
      const updatedContent = configContent.replace(
        propertyPattern,
        `${propertyName}: ${timestamp}`
      );
      await writeFile(configPath, updatedContent, 'utf-8');
    }
  } catch (error) {
    console.error('Error updating CMS config:', error);
  }
}
