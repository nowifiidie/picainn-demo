import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';

export const maxDuration = 60; // 60 seconds for large uploads

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

    // Get next room number
    const roomsDir = join(process.cwd(), 'public', 'images', 'rooms');
    const existingRooms = await readFile(join(process.cwd(), 'lib', 'rooms.ts'), 'utf-8');
    const roomMatches = existingRooms.match(/room(\d+):/g) || [];
    const roomNumbers = roomMatches.map(m => parseInt(m.match(/\d+/)![0])).sort((a, b) => b - a);
    const nextRoomNumber = roomNumbers.length > 0 ? roomNumbers[0] + 1 : 1;
    const roomId = `room${nextRoomNumber}`;

    // Create room directory
    const roomDir = join(roomsDir, roomId);
    await mkdir(roomDir, { recursive: true });

    // Save images: first as main.jpg, rest as image-1.jpg, image-2.jpg, etc.
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      let imagePath: string;
      if (i === 0) {
        // First image is main.jpg
        imagePath = join(roomDir, 'main.jpg');
      } else {
        // Additional images are image-1.jpg, image-2.jpg, etc.
        imagePath = join(roomDir, `image-${i}.jpg`);
      }
      
      await writeFile(imagePath, buffer);
    }

    // Read current rooms.ts file
    const roomsFilePath = join(process.cwd(), 'lib', 'rooms.ts');
    const roomsFileContent = await readFile(roomsFilePath, 'utf-8');

    // Find the insertion point - after the last room entry (room5)
    const room5Match = roomsFileContent.match(/(room5:\s*\{[\s\S]*?\},?\s*)/);
    let insertPosition: number;
    
    if (room5Match && room5Match.index !== undefined) {
      insertPosition = room5Match.index + room5Match[0].length;
    } else {
      const lastRoomMatch = roomsFileContent.match(/(room\d+):\s*\{[\s\S]*?\},?\s*(?=\s*\/\/|\s*\/\*|\s*\};)/);
      if (lastRoomMatch && lastRoomMatch.index !== undefined) {
        insertPosition = lastRoomMatch.index + lastRoomMatch[0].length;
      } else {
        const roomMetadataEnd = roomsFileContent.lastIndexOf('};');
        if (roomMetadataEnd === -1) {
          return NextResponse.json(
            { success: false, error: 'Could not find roomMetadata object end' },
            { status: 500 }
          );
        }
        insertPosition = roomMetadataEnd;
      }
    }

    // Build new room entry
    const timestamp = Date.now();
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
    
    const amenitiesStr = amenitiesArray.length > 0 
      ? amenitiesArray.map(a => `'${a.replace(/'/g, "\\'")}'`).join(', ')
      : "'Wi-Fi', 'Private Bathroom'";
    
    const newRoomEntry = `,\n  ${roomId}: {
    id: '${roomId}',
    name: '${escapedName}',
    type: '${escapedType}',
    description: '${escapedDesc}',
    amenities: [${amenitiesStr}],
    bedInfo: '${escapedBedInfo}',
    maxGuests: ${parseInt(maxGuests) || 2},
    size: '${escapedSize}',
    address: '${escapedAddress}',
    mapUrl: '${escapedMapUrl}'${altTextContent},
    mapUrl: 'https://www.google.com/maps/embed?pb=...',
    ${altTextContent}lastUpdated: ${timestamp},
  }`;

    // Insert new room entry
    const newContent = 
      roomsFileContent.slice(0, insertPosition) + 
      newRoomEntry + 
      roomsFileContent.slice(insertPosition);

    // Write updated file
    await writeFile(roomsFilePath, newContent, 'utf-8');

    // Update CMS config timestamp
    await updateCMSConfig('rooms');

    // Revalidate the home page
    revalidatePath('/');

    return NextResponse.json({ 
      success: true, 
      message: `Room ${roomId} added successfully`,
      roomId 
    });
  } catch (error) {
    console.error('Error adding room:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add room' },
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

