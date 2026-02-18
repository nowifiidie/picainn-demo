import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { listRoomImages, uploadImageToBlob, deleteImageFromBlob } from '@/lib/blob-storage';

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { roomId, filename, hide } = await request.json();

    if (!roomId || !filename || typeof hide !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Room ID, filename, and hide flag are required' },
        { status: 400 }
      );
    }

    // Don't allow hiding main.jpg - it's required
    if (hide && (filename === 'main.jpg' || filename === '_hidden_main.jpg')) {
      return NextResponse.json(
        { success: false, error: 'Cannot hide the main image. Set another image as main first.' },
        { status: 400 }
      );
    }

    // Get the image from Blob Storage
    const roomImages = await listRoomImages(roomId);
    const currentImage = roomImages.find(img => img.filename === filename);

    if (!currentImage) {
      return NextResponse.json(
        { success: false, error: 'Image not found' },
        { status: 404 }
      );
    }

    // Determine new filename
    let newFilename: string;
    if (hide) {
      // Hide: add _hidden_ prefix
      newFilename = filename.startsWith('_hidden_') ? filename : `_hidden_${filename}`;
    } else {
      // Show: remove _hidden_ prefix
      newFilename = filename.startsWith('_hidden_') ? filename.replace('_hidden_', '') : filename;
    }

    // If filename hasn't changed, nothing to do
    if (newFilename === filename) {
      return NextResponse.json({
        success: true,
        message: hide ? 'Image is already hidden' : 'Image is already visible',
        newFilename,
      });
    }

    // Download the image
    const imageResponse = await fetch(currentImage.url);
    if (!imageResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to download image' },
        { status: 500 }
      );
    }

    const imageBlob = await imageResponse.blob();
    const imageFile = new File([imageBlob], newFilename, { type: imageBlob.type });

    // Upload to new path
    const newBlobPath = `rooms/${roomId}/${newFilename}`;
    await uploadImageToBlob(newBlobPath, imageFile, {
      contentType: imageBlob.type,
    });

    // Delete old blob
    await deleteImageFromBlob(currentImage.url).catch(() => {
      // Non-fatal if deletion fails
    });

    revalidatePath('/');
    return NextResponse.json({
      success: true,
      message: hide ? 'Image hidden successfully' : 'Image shown successfully',
      newFilename,
    });
  } catch (error) {
    console.error('Error in toggle-image-visibility route:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
