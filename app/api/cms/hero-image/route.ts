import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  try {
    const configPath = join(process.cwd(), 'lib', 'rooms.ts');
    const configContent = await readFile(configPath, 'utf-8');
    const heroImageUrlMatch = configContent.match(/heroImageUrl:\s*['"]([^'"]+)['"]/);
    const heroImageUrl = heroImageUrlMatch ? heroImageUrlMatch[1] : null;
    
    // Get timestamp for cache busting
    const timestampMatch = configContent.match(/heroLastUpdated:\s*(\d+)/);
    const timestamp = timestampMatch ? parseInt(timestampMatch[1]) : Date.now();

    return NextResponse.json({ 
      url: heroImageUrl || '/images/hero/hero-background.jpg', // Fallback to static path
      timestamp // Include timestamp for cache busting
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error) {
    console.error('Error getting hero image URL:', error);
    return NextResponse.json(
      { url: '/images/hero/hero-background.jpg', timestamp: Date.now() }, // Fallback on error
      { 
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}

