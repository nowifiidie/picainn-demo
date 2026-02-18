'use server';

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';

export async function updateHero(formData: FormData) {
  try {
    const file = formData.get('image') as File;
    if (!file) {
      return { success: false, error: 'No image file provided' };
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return { success: false, error: 'File must be an image' };
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Always save as hero-background.jpg (Hero component expects this)
    const filePath = join(process.cwd(), 'public', 'images', 'hero', 'hero-background.jpg');

    // Write file
    await writeFile(filePath, buffer);

    // Update CMS config timestamp
    await updateCMSConfig('hero');

    // Revalidate the home page for all locales
    revalidatePath('/en');
    revalidatePath('/zh');

    return { success: true, message: 'Hero image updated successfully' };
  } catch (error) {
    console.error('Error updating hero image:', error);
    return { success: false, error: 'Failed to update hero image' };
  }
}

export async function addRoom(formData: FormData) {
  try {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const altTextEn = formData.get('altTextEn') as string;
    const altTextJa = formData.get('altTextJa') as string;
    const altTextKo = formData.get('altTextKo') as string;
    const altTextZh = formData.get('altTextZh') as string;
    // Get multiple images
    const images = formData.getAll('images') as File[];
    // Get amenities from checkboxes
    const amenitiesArray = formData.getAll('amenities') as string[];

    if (!name || !description || !images || images.length === 0) {
      return { success: false, error: 'Name, description, and at least one image are required' };
    }

    // Validate all files are images
    for (const image of images) {
      if (!image.type.startsWith('image/')) {
        return { success: false, error: 'All files must be images' };
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
    // Look for room5 entry and insert after it
    const room5Match = roomsFileContent.match(/(room5:\s*\{[\s\S]*?\},?\s*)/);
    let insertPosition: number;
    
    if (room5Match && room5Match.index !== undefined) {
      // Insert after room5 entry
      insertPosition = room5Match.index + room5Match[0].length;
    } else {
      // Fallback: find the last room entry before comments
      const lastRoomMatch = roomsFileContent.match(/(room\d+):\s*\{[\s\S]*?\},?\s*(?=\s*\/\/|\s*\/\*|\s*\};)/);
      if (lastRoomMatch && lastRoomMatch.index !== undefined) {
        insertPosition = lastRoomMatch.index + lastRoomMatch[0].length;
      } else {
        // Last resort: find the closing brace of roomMetadata
        const roomMetadataEnd = roomsFileContent.lastIndexOf('};');
        if (roomMetadataEnd === -1) {
          return { success: false, error: 'Could not find roomMetadata object end' };
        }
        insertPosition = roomMetadataEnd;
      }
    }

    // Build new room entry
    const timestamp = Date.now();
    const escapedName = name.replace(/'/g, "\\'").replace(/\n/g, ' ');
    const escapedDesc = description.replace(/'/g, "\\'").replace(/\n/g, ' ');
    
    const altTextParts = [];
    if (altTextEn) altTextParts.push(`en: '${altTextEn.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
    if (altTextJa) altTextParts.push(`ja: '${altTextJa.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
    if (altTextKo) altTextParts.push(`ko: '${altTextKo.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
    if (altTextZh) altTextParts.push(`zh: '${altTextZh.replace(/'/g, "\\'").replace(/\n/g, ' ')}'`);
    
    const altTextContent = altTextParts.length > 0 
      ? `altText: {\n      ${altTextParts.join(',\n      ')},\n    },\n    `
      : '';
    
    const amenitiesStr = amenitiesArray.length > 0 
      ? amenitiesArray.map(a => `'${a.replace(/'/g, "\\'")}'`).join(', ')
      : "'Wi-Fi', 'Air Conditioner', 'TV', 'Refrigerator', 'Private Bathroom'";
    
    const newRoomEntry = `,\n  ${roomId}: {
    id: '${roomId}',
    name: '${escapedName}',
    type: 'Standard Room',
    description: '${escapedDesc}',
    amenities: [${amenitiesStr}],
    bedInfo: 'To be configured',
    maxGuests: 2,
    size: '20 m²',
    address: 'Near Komagome Station, Bunkyo City, Tokyo',
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

    // Revalidate the home page for all locales
    revalidatePath('/en');
    revalidatePath('/zh');

    return { 
      success: true, 
      message: `Room ${roomId} added successfully`,
      roomId 
    };
  } catch (error) {
    console.error('Error adding room:', error);
    return { success: false, error: 'Failed to add room' };
  }
}

export async function updateRoom(formData: FormData) {
  try {
    const roomId = formData.get('roomId') as string;
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const description = formData.get('description') as string;
    const bedInfo = formData.get('bedInfo') as string;
    const maxGuests = formData.get('maxGuests') as string;
    const size = formData.get('size') as string;
    const address = formData.get('address') as string;
    const mapUrl = formData.get('mapUrl') as string;
    // Get amenities from checkboxes (FormData.getAll returns all values with the same name)
    const amenitiesArray = formData.getAll('amenities') as string[];
    const altTextEn = formData.get('altTextEn') as string;
    const altTextJa = formData.get('altTextJa') as string;
    const altTextKo = formData.get('altTextKo') as string;
    const altTextZh = formData.get('altTextZh') as string;
    // Get multiple images
    const images = formData.getAll('images') as File[];

    if (!roomId || !name || !type || !description) {
      return { success: false, error: 'Room ID, name, type, and description are required' };
    }

    // Read current rooms.ts file
    const roomsFilePath = join(process.cwd(), 'lib', 'rooms.ts');
    const roomsFileContent = await readFile(roomsFilePath, 'utf-8');

    // Amenities are already an array from checkboxes

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

    // Find and replace the room entry
    // Match from roomId: { to the matching closing brace
    const roomStartPattern = new RegExp(`${roomId}:\\s*\\{`);
    const roomStartMatch = roomsFileContent.match(roomStartPattern);
    
    if (!roomStartMatch || roomStartMatch.index === undefined) {
      return { success: false, error: `Room ${roomId} not found` };
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
    size: '${size.replace(/'/g, "\\'")}',
    address: '${escapedAddress}',
    mapUrl: '${escapedMapUrl}',${altTextContent}
    lastUpdated: ${timestamp},
  },`;

    const updatedContent = roomsFileContent.replace(oldRoomEntry, newRoomEntry);

    // Write updated file
    await writeFile(roomsFilePath, updatedContent, 'utf-8');

    // Update room images if provided
    if (images && images.length > 0) {
      const roomDir = join(process.cwd(), 'public', 'images', 'rooms', roomId);
      await mkdir(roomDir, { recursive: true });

      // Validate all files are images
      for (const image of images) {
        if (!image.type.startsWith('image/')) {
          return { success: false, error: 'All files must be images' };
        }
      }

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
    }

    // Update CMS config timestamp
    await updateCMSConfig('rooms');

    // Revalidate the home page for all locales
    revalidatePath('/en');
    revalidatePath('/zh');

    return { 
      success: true, 
      message: `Room ${roomId} updated successfully`
    };
  } catch (error) {
    console.error('Error updating room:', error);
    return { success: false, error: 'Failed to update room' };
  }
}

async function updateCMSConfig(type: 'hero' | 'rooms') {
  try {
    const configPath = join(process.cwd(), 'lib', 'rooms.ts');
    const configContent = await readFile(configPath, 'utf-8');
    const timestamp = Date.now();

    let updatedContent = configContent;
    const propertyName = type === 'hero' ? 'heroLastUpdated' : 'roomsLastUpdated';
    
    // Try to update existing property
    const existingPattern = new RegExp(`${propertyName}:\\s*\\d+`);
    if (existingPattern.test(configContent)) {
      updatedContent = configContent.replace(
        existingPattern,
        `${propertyName}: ${timestamp}`
      );
    } else {
      // Property doesn't exist, add it to the config object
      const configObjectPattern = /export let cmsConfig: CMSConfig = \{([\s\S]*?)\};/;
      const match = configContent.match(configObjectPattern);
      if (match) {
        const configBody = match[1];
        const newConfigBody = configBody.trim() 
          ? `${configBody.trim().replace(/,\s*$/, '')},\n  ${propertyName}: ${timestamp}`
          : `  ${propertyName}: ${timestamp}`;
        updatedContent = configContent.replace(
          configObjectPattern,
          `export let cmsConfig: CMSConfig = {\n${newConfigBody},\n};`
        );
      }
    }

    await writeFile(configPath, updatedContent, 'utf-8');
  } catch (error) {
    console.error('Error updating CMS config:', error);
  }
}

