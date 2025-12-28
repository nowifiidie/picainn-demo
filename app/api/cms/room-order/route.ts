import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const ORDER_FILE_PATH = join(process.cwd(), 'data', 'room-order.json');

// Ensure data directory exists
async function ensureDataDir() {
  const dataDir = join(process.cwd(), 'data');
  if (!existsSync(dataDir)) {
    await mkdir(dataDir, { recursive: true });
  }
}

// Get room order
export async function GET() {
  try {
    await ensureDataDir();
    
    if (!existsSync(ORDER_FILE_PATH)) {
      // Return empty array if no order file exists
      return NextResponse.json({ order: [] });
    }

    const fileContent = await readFile(ORDER_FILE_PATH, 'utf-8');
    const order = JSON.parse(fileContent);
    
    return NextResponse.json({ order });
  } catch (error) {
    console.error('Error reading room order:', error);
    return NextResponse.json(
      { error: 'Failed to read room order' },
      { status: 500 }
    );
  }
}

// Update room order
export async function POST(request: NextRequest) {
  try {
    await ensureDataDir();
    
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

    // Write the order to file
    await writeFile(ORDER_FILE_PATH, JSON.stringify(order, null, 2), 'utf-8');

    return NextResponse.json({ 
      success: true, 
      message: 'Room order updated successfully',
      order 
    });
  } catch (error) {
    console.error('Error updating room order:', error);
    return NextResponse.json(
      { error: 'Failed to update room order' },
      { status: 500 }
    );
  }
}

