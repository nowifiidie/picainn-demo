import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';

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
    // Get amenities from checkboxes
    const amenitiesArray = formData.getAll('amenities') as string[];
    const altTextEn = formData.get('altTextEn') as string;
    const altTextJa = formData.get('altTextJa') as string;
    const altTextKo = formData.get('altTextKo') as string;
    const altTextZh = formData.get('altTextZh') as string;
    // Get multiple images
    const images = formData.getAll('images') as File[];

    if (!roomId || !name || !type || !description) {
      return NextResponse.json(
        { success: false, error: 'Room ID, name, type, and description are required' },
        { status: 400 }
      );
    }

    // Read current rooms.ts file
    const roomsFilePath = join(process.cwd(), 'lib', 'rooms.ts');
    const roomsFileContent = await readFile(roomsFilePath, 'utf-8');

    // Build alt text object
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
    
    // Ensure size is in m² format
    let formattedSize = size.trim();
    if (!formattedSize.toLowerCase().endsWith('m²') && !formattedSize.toLowerCase().endsWith('m2')) {
      formattedSize = `${formattedSize.replace(/\s*m²?\s*$/i, '')} m²`;
    } else if (formattedSize.toLowerCase().endsWith('m2')) {
      formattedSize = formattedSize.replace(/m2$/i, 'm²');
    }
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
    mapUrl: '${escapedMapUrl}',${altTextContent}
    lastUpdated: ${timestamp},
  },`;

    const updatedContent = roomsFileContent.replace(oldRoomEntry, newRoomEntry);

    // Write updated file
    await writeFile(roomsFilePath, updatedContent, 'utf-8');

    // Update room images if provided
    // Filter out empty files (when no files are selected, FormData may include empty entries)
    const validImages = images.filter(img => img && img.size > 0 && img.type.startsWith('image/'));
    
    if (validImages.length > 0) {
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

      // Save images: first as main.jpg, rest as image-1.jpg, image-2.jpg, etc.
      for (let i = 0; i < validImages.length; i++) {
        const image = validImages[i];
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
      timestamp: Date.now() // Return timestamp for cache busting
    });
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

