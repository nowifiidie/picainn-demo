# Vercel Blob Storage Setup Guide

This guide explains how to set up Vercel Blob Storage for dynamic room image uploads in production.

## Overview

The application now uses **Vercel Blob Storage** for storing room images dynamically in production. This allows you to add rooms through the admin panel even in serverless environments where the file system is read-only.

## Free Tier Limits

- **1 GB storage** per month (free)
- **10 GB data transfer** per month (free)
- After that: $0.023/GB storage, $0.050/GB transfer

For a lightweight website, this should be more than sufficient.

## Setup Steps

### 1. Create a Blob Store in Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to the **Storage** tab
4. Click **Create Database** or **Connect Database**
5. Select **Blob** from the options
6. Name your store (e.g., "Room Images")
7. Click **Create**

### 2. Environment Variables

Vercel will automatically add the `BLOB_READ_WRITE_TOKEN` environment variable to your project. This is used by the `@vercel/blob` package to authenticate.

**Note:** The token is automatically available in your Vercel deployments. No manual configuration needed!

### 3. Verify Setup

After deployment, try adding a room through the admin panel. The images should upload successfully to Blob Storage.

## How It Works

### Storage Structure

Images are stored in Blob Storage with the following path structure:
```
rooms/{roomId}/main.jpg
rooms/{roomId}/image-1.jpg
rooms/{roomId}/image-2.jpg
...
```

### Room Metadata

Room metadata (name, description, amenities, etc.) is stored in **Upstash Redis** (already set up):
- Key: `room-metadata`
- Format: `Record<string, RoomMetadata>`

### Backward Compatibility

The system supports both:
- **Legacy rooms**: Images stored in `public/images/rooms/` (file system)
- **New rooms**: Images stored in Vercel Blob Storage

Both types of rooms are displayed together on the home page.

## API Endpoints Updated

All image-related APIs now use Blob Storage:

- `POST /api/cms/upload-room` - Uploads images to Blob Storage
- `GET /api/cms/room-images` - Lists images from Blob Storage
- `POST /api/cms/update-image` - Updates image in Blob Storage
- `DELETE /api/cms/delete-image` - Deletes image from Blob Storage
- `POST /api/cms/set-main-image` - Swaps main image in Blob Storage
- `POST /api/cms/toggle-image-visibility` - Toggles visibility (renames in Blob)
- `GET /api/rooms` - Returns rooms from both Blob Storage and file system

## Troubleshooting

### Images Not Uploading

1. Check that the Blob store is created in Vercel Dashboard
2. Verify `BLOB_READ_WRITE_TOKEN` is set (should be automatic)
3. Check Vercel function logs for errors

### Images Not Displaying

1. Verify images were uploaded successfully (check Blob store in Vercel Dashboard)
2. Check browser console for CORS or loading errors
3. Ensure image URLs are accessible (Blob URLs should be public)

### Room Metadata Missing

1. Check Upstash Redis connection
2. Verify `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set
3. Check Redis logs for errors

## Local Development

In local development, the system will:
- Try to use Blob Storage if `BLOB_READ_WRITE_TOKEN` is set
- Fall back to file system if Blob Storage is not configured
- Still work with legacy file-based rooms

## Migration Notes

- Existing rooms in `public/images/rooms/` continue to work
- New rooms added through the admin panel use Blob Storage
- No migration needed - both systems work together

