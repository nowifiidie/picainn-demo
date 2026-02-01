import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';
import { uploadImageToBlob, deleteImageFromBlob } from '@/lib/blob-storage';

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

    // Get current hero image URL to delete old one
    const configPath = join(process.cwd(), 'lib', 'rooms.ts');
    const configContent = await readFile(configPath, 'utf-8');
    const heroImageUrlMatch = configContent.match(/heroImageUrl:\s*['"]([^'"]+)['"]/);
    const oldHeroImageUrl = heroImageUrlMatch ? heroImageUrlMatch[1] : null;

    // Upload to R2 blob storage
    const blobPath = 'hero/hero-background.jpg';
    const { url } = await uploadImageToBlob(blobPath, file, {
      contentType: file.type || 'image/jpeg',
      allowOverwrite: true,
    });

    // Delete old hero image if it exists and is different
    if (oldHeroImageUrl && oldHeroImageUrl !== url) {
      try {
        await deleteImageFromBlob(oldHeroImageUrl);
      } catch (error) {
        console.warn('Error deleting old hero image:', error);
        // Continue even if deletion fails
      }
    }

    // Update CMS config with new URL and timestamp
    const configUpdateResult = await updateCMSConfig('hero', url);
    if (!configUpdateResult) {
      console.error('Failed to update CMS config file');
      // Still return success since image was uploaded, but log the error
    }

    // Revalidate the home page for all locales
    revalidatePath('/en');
    revalidatePath('/zh');

    return NextResponse.json({ 
      success: true, 
      message: 'Hero image updated successfully',
      url 
    });
  } catch (error) {
    console.error('Error updating hero image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to update hero image: ${errorMessage}` },
      { status: 500 }
    );
  }
}

async function updateCMSConfig(type: 'hero' | 'rooms', heroImageUrl?: string): Promise<boolean> {
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
      
      // Remove ALL occurrences of properties we're updating (to handle duplicates)
      const propertyPattern = new RegExp(`\\s*${propertyName}:\\s*\\d+[,\\n]*`, 'g');
      configBody = configBody.replace(propertyPattern, '');
      
      // Remove heroImageUrl if updating hero
      if (type === 'hero') {
        const heroImageUrlPattern = /\s*heroImageUrl:\s*['"][^'"]+['"][,\n]*/g;
        configBody = configBody.replace(heroImageUrlPattern, '');
      }
      
      // Also remove the other property if it exists (to rebuild cleanly)
      const otherPropertyName = type === 'hero' ? 'roomsLastUpdated' : 'heroLastUpdated';
      const otherPropertyPattern = new RegExp(`\\s*${otherPropertyName}:\\s*\\d+[,\\n]*`, 'g');
      const otherPropertyMatch = configBody.match(new RegExp(`${otherPropertyName}:\\s*\\d+`));
      let otherPropertyValue = '';
      if (otherPropertyMatch) {
        otherPropertyValue = otherPropertyMatch[0];
        configBody = configBody.replace(otherPropertyPattern, '');
      }
      
      // Get existing heroImageUrl if not updating it
      let existingHeroImageUrl = '';
      if (type !== 'hero') {
        const heroImageUrlMatch = configBody.match(/heroImageUrl:\s*['"]([^'"]+)['"]/);
        if (heroImageUrlMatch) {
          existingHeroImageUrl = heroImageUrlMatch[0];
          const heroImageUrlPattern = /\s*heroImageUrl:\s*['"][^'"]+['"][,\n]*/g;
          configBody = configBody.replace(heroImageUrlPattern, '');
        }
      }
      
      // Clean up extra commas and whitespace
      configBody = configBody.trim().replace(/^,|,$/g, '').trim();
      
      // Build new config body with all properties
      const properties = [];
      if (type === 'hero') {
        properties.push(`  heroLastUpdated: ${timestamp}`);
        if (heroImageUrl) {
          properties.push(`  heroImageUrl: '${heroImageUrl}'`);
        }
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
        if (existingHeroImageUrl) {
          properties.push(`  ${existingHeroImageUrl}`);
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
      let updatedContent = configContent.replace(
        propertyPattern,
        `${propertyName}: ${timestamp}`
      );
      
      // Add heroImageUrl if updating hero
      if (type === 'hero' && heroImageUrl) {
        const heroImageUrlPattern = /heroImageUrl:\s*['"][^'"]+['"]/g;
        if (heroImageUrlPattern.test(updatedContent)) {
          updatedContent = updatedContent.replace(heroImageUrlPattern, `heroImageUrl: '${heroImageUrl}'`);
        } else {
          // Insert after heroLastUpdated
          updatedContent = updatedContent.replace(
            /(heroLastUpdated:\s*\d+)/,
            `$1,\n  heroImageUrl: '${heroImageUrl}'`
          );
        }
      }
      
      await writeFile(configPath, updatedContent, 'utf-8');
      console.log(`Successfully updated CMS config: ${type}${heroImageUrl ? ` with URL: ${heroImageUrl}` : ''}`);
      return true;
    }
  } catch (error) {
    console.error('Error updating CMS config:', error);
    return false;
  }
  return true;
}

