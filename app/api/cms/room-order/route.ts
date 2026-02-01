import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { roomOrder } from '@/lib/rooms';

const ROOM_ORDER_KEY = 'room-order';

// Initialize Redis client (will use environment variables automatically)
const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

// Get room order
export async function GET() {
  try {
    // Try to get from Upstash Redis first (production)
    if (redis) {
      try {
        const redisOrder = await redis.get<string[]>(ROOM_ORDER_KEY);
        if (Array.isArray(redisOrder) && redisOrder.length > 0) {
          return NextResponse.json({ order: redisOrder });
        }
      } catch (redisError) {
        // Redis might not be configured, fall through to file-based approach
        console.log('Redis not available, using fallback:', redisError instanceof Error ? redisError.message : 'Unknown error');
      }
    }

    // Fallback: return the imported value from lib/rooms.ts
    return NextResponse.json({ order: roomOrder || [] });
  } catch (error) {
    console.error('Error reading room order:', error);
    return NextResponse.json({ order: [] });
  }
}

// Update room order
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order } = body;

    if (!Array.isArray(order)) {
      return NextResponse.json(
        { error: 'Order must be an array' },
        { status: 400 }
      );
    }

    // Validate that all items are strings (room IDs)
    if (!order.every((item: any) => typeof item === 'string')) {
      return NextResponse.json(
        { error: 'All order items must be room IDs (strings)' },
        { status: 400 }
      );
    }

    // Try to save to Upstash Redis first (production)
    if (redis) {
      try {
        await redis.set(ROOM_ORDER_KEY, order);
        return NextResponse.json({ 
          success: true, 
          message: 'Room order updated successfully',
          order 
        });
      } catch (redisError) {
        // Redis might not be configured, fall through to file-based approach for local dev
        console.log('Redis not available, trying file-based approach:', redisError instanceof Error ? redisError.message : 'Unknown error');
      }
    }
    
    // For local development, try to update the file
    if (process.env.NODE_ENV === 'development') {
      try {
        const { readFile, writeFile } = await import('fs/promises');
        const { join } = await import('path');
        const ROOMS_FILE_PATH = join(process.cwd(), 'lib', 'rooms.ts');
        const fileContent = await readFile(ROOMS_FILE_PATH, 'utf-8');
        
        // Format the order array as a string
        const orderString = JSON.stringify(order, null, 2)
          .split('\n')
          .map((line, index) => index === 0 ? line : '  ' + line)
          .join('\n');
        
        // Replace the roomOrder declaration
        const orderPattern = /export let roomOrder: string\[\] = (\[[\s\S]*?\]);/;
        
        let updatedContent: string;
        if (orderPattern.test(fileContent)) {
          updatedContent = fileContent.replace(
            orderPattern,
            `export let roomOrder: string[] = ${orderString};`
          );
        } else {
          const cmsConfigPattern = /(export let cmsConfig: CMSConfig = \{[\s\S]*?\};)/;
          updatedContent = fileContent.replace(
            cmsConfigPattern,
            `$1\n\n// Room order configuration - stores the display order of rooms\nexport let roomOrder: string[] = ${orderString};`
          );
        }

        await writeFile(ROOMS_FILE_PATH, updatedContent, 'utf-8');
        
        return NextResponse.json({ 
          success: true, 
          message: 'Room order updated successfully (local file)',
          order 
        });
      } catch (fileError) {
        console.error('File write also failed:', fileError);
      }
    }
    
    // If both Redis and file write fail, return error with instructions
    return NextResponse.json(
      { 
        error: 'Failed to save room order', 
        details: 'Upstash Redis is not configured. Please set up Upstash Redis for production use.',
        instructions: 'To fix this: 1) Go to your Vercel dashboard, 2) Navigate to Storage, 3) Click "Browse Marketplace", 4) Select "Upstash Redis", 5) Create the database (environment variables will be added automatically), 6) Redeploy your application.'
      },
      { status: 500 }
    );
  } catch (error) {
    console.error('Error updating room order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: 'Failed to update room order', 
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

