import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export async function GET() {
  try {
    const configPath = join(process.cwd(), 'lib', 'rooms.ts');
    const configContent = await readFile(configPath, 'utf-8');
    const heroImageUrlMatch = configContent.match(/heroImageUrl:\s*['"]([^'"]+)['"]/);
    const heroImageUrl = heroImageUrlMatch ? heroImageUrlMatch[1] : null;

    return NextResponse.json({ 
      url: heroImageUrl || '/images/hero/hero-background.jpg' // Fallback to static path
    });
  } catch (error) {
    console.error('Error getting hero image URL:', error);
    return NextResponse.json(
      { url: '/images/hero/hero-background.jpg' }, // Fallback on error
      { status: 200 }
    );
  }
}

