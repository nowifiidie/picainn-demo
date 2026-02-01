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

    console.log('Received inquiry:', { fullName, email, guests, roomType, contactApp, dateRange });

    // Validate required fields
    if (!fullName || !email || !roomType) {
      console.error('Validation failed:', { fullName: !!fullName, email: !!email, roomType: !!roomType });
      return NextResponse.json(
        { error: 'Full name, email, and room type are required' },
        { status: 400 }
      );
    }

    // Validate roomType is not empty string
    if (roomType.trim() === '') {
      console.error('Room type is empty string');
      return NextResponse.json(
        { error: 'Please select a room type' },
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
          console.log('Checking Redis for roomType:', roomType, 'Available rooms:', Object.keys(blobRooms));
          if (blobRooms[roomType]) {
            metadata = blobRooms[roomType];
            console.log('Found room in Redis:', metadata);
          }
        } catch (error) {
          console.log('Redis not available, using static metadata:', error);
        }
      }
      
      // Fall back to static metadata if not found in Redis
      if (!metadata) {
        console.log('Trying static metadata for roomType:', roomType);
        metadata = getRoomMetadata(roomType);
        if (metadata) {
          console.log('Found room in static metadata:', metadata);
        } else {
          console.warn('Room not found in static metadata:', roomType);
        }
      }
      
      if (metadata) {
        roomTypeLabel = `${metadata.name} - ${metadata.type}`;
        console.log('Room type label:', roomTypeLabel);
      } else {
        console.warn('No metadata found for roomType:', roomType, 'Using roomType as label');
        roomTypeLabel = roomType;
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
        const emailResult = await resend.emails.send({
          from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
          to: process.env.CONTACT_EMAIL || 'info@minpaku.com',
          subject: emailSubject,
          html: htmlEmailBody,
          replyTo: email, // So you can reply directly to the customer
        });
        
        console.log('Email sent successfully:', emailResult);
      } catch (emailError) {
        console.error('Error sending email via Resend:', emailError);
        // Log the full error for debugging
        if (emailError instanceof Error) {
          console.error('Email error details:', emailError.message, emailError.stack);
        }
        // Still return success to user, but log the error for admin
        // You might want to change this to return an error if email is critical
      }
    } else {
      console.warn('RESEND_API_KEY is not set. Email will not be sent.');
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

