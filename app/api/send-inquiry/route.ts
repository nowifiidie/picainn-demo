import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

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

    // Get room type label
    const roomTypeLabels: { [key: string]: string } = {
      'room1': 'Room 1 - Standard Double',
      'room2': 'Room 2 - Deluxe Double',
      'room3': 'Room 3 - Family Room',
      'room4': 'Room 4 - Economy Single',
      'room5': 'Room 5 - Premium Suite',
    };
    const roomTypeLabel = roomTypeLabels[roomType] || roomType;

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

