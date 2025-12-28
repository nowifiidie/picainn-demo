import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export async function GET() {
  try {
    if (!redis) {
      // Redis not configured, return empty array
      return NextResponse.json({ deletedRooms: [] });
    }

    const deletedRoomsKey = 'deleted-rooms';
    const deletedRooms = await redis.get<string[]>(deletedRoomsKey) || [];
    
    return NextResponse.json({ deletedRooms });
  } catch (error) {
    console.error('Error fetching deleted rooms:', error);
    return NextResponse.json({ deletedRooms: [] });
  }
}

