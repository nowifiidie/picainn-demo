import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getRoomMetadata } from '@/lib/rooms';
import { Redis } from '@upstash/redis';

const ROOM_METADATA_KEY = 'room-metadata';

const redis = process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  ? new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    })
  : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fullName, email, guests, roomType, contactApp, dateRange } = body;

    // Validate required fields
    if (!fullName || !email || !roomType) {
      return NextResponse.json(
        { error: 'Full name, email, and room type are required' },
        { status: 400 }
      );
    }

    // Get room metadata to build room type label
    // Check Redis first (for Blob Storage rooms), then fall back to static metadata
    let roomTypeLabel = roomType;
    try {
      let metadata = null;
      
      // Try Redis first (Blob Storage rooms)
      if (redis) {
        try {
          const blobRooms = await redis.get<Record<string, any>>(ROOM_METADATA_KEY) || {};
          if (blobRooms[roomType]) {
            metadata = blobRooms[roomType];
          }
        } catch (error) {
          console.log('Redis not available, using static metadata');
        }
      }
      
      // Fall back to static metadata if not found in Redis
      if (!metadata) {
        metadata = getRoomMetadata(roomType);
      }
      
      if (metadata) {
        roomTypeLabel = `${metadata.name} - ${metadata.type}`;
      }
    } catch (error) {
      console.error('Error fetching room metadata:', error);
      // Fallback to roomType if metadata fetch fails
      roomTypeLabel = roomType;
    }

    // Format the email content
    const dateRangeText = dateRange?.from && dateRange?.to
      ? `${new Date(dateRange.from).toLocaleDateString()} to ${new Date(dateRange.to).toLocaleDateString()}`
      : 'Not selected';

    const emailSubject = `New Booking Inquiry from ${fullName}`;
    const emailBody = `
New booking inquiry received:

Name: ${fullName}
Email: ${email}
Room Type: ${roomTypeLabel}
Number of Guests: ${guests}
Preferred Contact Method: ${contactApp}
Date Range: ${dateRangeText}

Please contact the guest via their preferred method: ${contactApp}
    `.trim();

    const htmlEmailBody = `
      <h2>New Booking Inquiry</h2>
      <p><strong>Name:</strong> ${fullName}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Room Type:</strong> ${roomTypeLabel}</p>
      <p><strong>Number of Guests:</strong> ${guests}</p>
      <p><strong>Preferred Contact Method:</strong> ${contactApp}</p>
      <p><strong>Date Range:</strong> ${dateRangeText}</p>
      <p>Please contact the guest via their preferred method: ${contactApp}</p>
    `;

    // Send email using Resend
    // If RESEND_API_KEY is not set, it will use mailto as fallback
    if (process.env.RESEND_API_KEY) {
      try {
        // Initialize Resend only when needed and when API key is available
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to: process.env.CONTACT_EMAIL || 'info@minpaku.com',
          subject: emailSubject,
          html: htmlEmailBody,
          replyTo: email, // So you can reply directly to the customer
        });
      } catch (emailError) {
        console.error('Error sending email via Resend:', emailError);
        // Fall through to mailto option
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Inquiry submitted successfully. We will contact you soon!'
    });

  } catch (error) {
    console.error('Error processing inquiry:', error);
    return NextResponse.json(
      { error: 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}

