import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { uploadImageToBlob, deleteImageFromBlob, listRoomImages } from '@/lib/blob-storage';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const roomId = formData.get('roomId') as string;
    const filename = formData.get('filename') as string;
    const image = formData.get('image') as File;

    if (!roomId || !filename || !image) {
      return NextResponse.json(
        { success: false, error: 'Room ID, filename, and image are required' },
        { status: 400 }
      );
    }

    if (!image.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Find the old image URL from Blob Storage
    const roomImages = await listRoomImages(roomId);
    const oldImage = roomImages.find(img => img.filename === filename);

    // Delete old image if it exists
    if (oldImage) {
      try {
        await deleteImageFromBlob(oldImage.url);
      } catch (error) {
        console.error('Error deleting old image (non-fatal):', error);
      }
    }

    // Upload new image to Blob Storage
    const blobPath = `rooms/${roomId}/${filename}`;
    const { url } = await uploadImageToBlob(blobPath, image, {
      contentType: image.type,
    });

    revalidatePath('/');
    return NextResponse.json({
      success: true,
      message: 'Image updated successfully',
      url,
    });
  } catch (error) {
    console.error('Error updating image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update image' },
      { status: 500 }
    );
  }
}
