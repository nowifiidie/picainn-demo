import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';

export const maxDuration = 60; // 60 seconds for large uploads

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('image') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No image file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
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

    // Revalidate the home page
    revalidatePath('/');

    return NextResponse.json({ 
      success: true, 
      message: 'Hero image updated successfully' 
    });
  } catch (error) {
    console.error('Error updating hero image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update hero image' },
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

