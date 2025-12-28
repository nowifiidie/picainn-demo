import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { roomOrder } from '@/lib/rooms';

const ROOMS_FILE_PATH = join(process.cwd(), 'lib', 'rooms.ts');

// Get room order
export async function GET() {
  try {
    // Read from the rooms.ts file to get the current order
    const fileContent = await readFile(ROOMS_FILE_PATH, 'utf-8');
    
    // Extract roomOrder array from the file
    const orderMatch = fileContent.match(/export let roomOrder: string\[\] = (\[[\s\S]*?\]);/);
    
    if (orderMatch) {
      try {
        // Parse the array from the file - the match should contain valid JSON array syntax
        const arrayString = orderMatch[1].trim();
        // Use JSON.parse to safely parse the array
        const order = JSON.parse(arrayString);
        if (Array.isArray(order)) {
          return NextResponse.json({ order });
        }
      } catch (error) {
        console.error('Error parsing room order from file:', error);
        // Fallback: try to extract manually if JSON.parse fails
        try {
          const arrayContent = orderMatch[1].trim();
          // Extract quoted strings from the array
          const stringMatches = arrayContent.match(/"([^"]+)"/g) || arrayContent.match(/'([^']+)'/g) || [];
          const items = stringMatches.map(m => m.replace(/^["']|["']$/g, ''));
          return NextResponse.json({ order: items });
        } catch {
          // If all parsing fails, return empty array
        }
      }
    }
    
    // Fallback: return the imported value (might be stale)
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

    // Read the rooms.ts file
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
      // Replace existing order
      updatedContent = fileContent.replace(
        orderPattern,
        `export let roomOrder: string[] = ${orderString};`
      );
    } else {
      // Insert after cmsConfig if roomOrder doesn't exist
      const cmsConfigPattern = /(export let cmsConfig: CMSConfig = \{[\s\S]*?\};)/;
      updatedContent = fileContent.replace(
        cmsConfigPattern,
        `$1\n\n// Room order configuration - stores the display order of rooms\nexport let roomOrder: string[] = ${orderString};`
      );
    }

    // Write the updated file
    try {
      await writeFile(ROOMS_FILE_PATH, updatedContent, 'utf-8');
    } catch (writeError) {
      console.error('File write error:', writeError);
      // In production (serverless), file writes might fail
      // Return a more helpful error message
      const errorMessage = writeError instanceof Error ? writeError.message : 'Unknown write error';
      return NextResponse.json(
        { 
          error: 'Failed to write room order to file', 
          details: errorMessage,
          note: 'In production environments, file writes may be restricted. The order may not persist across deployments.'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Room order updated successfully',
      order 
    });
  } catch (error) {
    console.error('Error updating room order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: 'Failed to update room order', 
        details: errorMessage,
        ...(process.env.NODE_ENV === 'development' && { stack: errorStack })
      },
      { status: 500 }
    );
  }
}

