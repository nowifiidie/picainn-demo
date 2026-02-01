import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { revalidatePath } from 'next/cache';
import { deleteImageFromBlob } from '@/lib/blob-storage';

export async function DELETE(request: NextRequest) {
  try {
    // Try to get URL from request body first (from admin page)
    let heroImageUrl: string | null = null;
    try {
      const body = await request.json();
      if (body.url && typeof body.url === 'string') {
        heroImageUrl = body.url;
      }
    } catch {
      // Request body might be empty, continue to check config file
    }

    // If not in request body, get from config file
    if (!heroImageUrl) {
      const configPath = join(process.cwd(), 'lib', 'rooms.ts');
      const configContent = await readFile(configPath, 'utf-8');
      const heroImageUrlMatch = configContent.match(/heroImageUrl:\s*['"]([^'"]+)['"]/);
      heroImageUrl = heroImageUrlMatch ? heroImageUrlMatch[1] : null;
    }

    if (!heroImageUrl || heroImageUrl.startsWith('/images/hero/')) {
      return NextResponse.json(
        { success: false, error: 'Hero image does not exist' },
        { status: 404 }
      );
    }

    // Delete from R2 blob storage
    try {
      await deleteImageFromBlob(heroImageUrl);
    } catch (error) {
      console.warn('Error deleting hero image from blob storage:', error);
      // Continue to update config even if deletion fails
    }

    // Update CMS config to remove heroImageUrl
    await updateCMSConfig('hero');

    // Revalidate the home page for all locales
    revalidatePath('/en');
    revalidatePath('/zh');

    return NextResponse.json({ 
      success: true, 
      message: 'Hero image deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting hero image:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: `Failed to delete hero image: ${errorMessage}` },
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
      
      // Remove ALL occurrences of properties we're updating (to handle duplicates)
      const propertyPattern = new RegExp(`\\s*${propertyName}:\\s*\\d+[,\\n]*`, 'g');
      configBody = configBody.replace(propertyPattern, '');
      
      // Remove heroImageUrl if deleting hero
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
      
      // Get existing heroImageUrl if not deleting hero
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
        // Don't add heroImageUrl when deleting
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
      
      // Remove heroImageUrl if deleting hero
      if (type === 'hero') {
        const heroImageUrlPattern = /heroImageUrl:\s*['"][^'"]+['"]/g;
        updatedContent = updatedContent.replace(heroImageUrlPattern, '');
      }
      
      await writeFile(configPath, updatedContent, 'utf-8');
    }
  } catch (error) {
    console.error('Error updating CMS config:', error);
  }
}

