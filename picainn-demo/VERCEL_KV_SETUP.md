# Upstash Redis Setup for Room Order

The room order feature now uses Upstash Redis for persistent storage in production. This is required for the drag-and-drop reordering to work on your live website.

## Setup Instructions

### 1. Create an Upstash Redis Database via Vercel Marketplace

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to the **Storage** tab
4. Click **Create Database**
5. Click **Browse Marketplace**
6. Select **Upstash Redis**
7. Choose a name (e.g., "room-order-db")
8. Select a region closest to your users
9. Click **Create**

### 2. Environment Variables (Automatic)

When you create the Upstash Redis database through Vercel Marketplace, the environment variables are **automatically added** to your project:
- `KV_REST_API_URL` - The REST API URL
- `KV_REST_API_TOKEN` - The REST API token

You don't need to manually add these - they're configured automatically!

### 3. Redeploy Your Application

After creating the database:
1. Go to the **Deployments** tab
2. Click the three dots on your latest deployment
3. Select **Redeploy**
4. Or push a new commit to trigger a new deployment

## Local Development

For local development, the system will fall back to using the file system (`lib/rooms.ts`). This means:
- ✅ Works locally without Redis setup
- ✅ Changes are saved to the file
- ⚠️ In production, you MUST set up Upstash Redis for it to work

## Troubleshooting

If you see an error about Redis not being configured:
1. Make sure you've created an Upstash Redis database through Vercel Marketplace
2. Verify the environment variables are present (they should be automatic)
3. Check that you've redeployed after creating the database
4. The error message will include specific instructions

## Free Tier

Upstash Redis has a generous free tier that should be sufficient for storing room order data:
- 10,000 commands/day
- 256 MB storage
- Global replication

This is more than enough for room order management.

## Why Upstash Redis?

- ✅ Serverless Redis compatible with standard Redis
- ✅ Works seamlessly with Vercel Edge and Serverless Functions
- ✅ Automatic provisioning and billing through Vercel
- ✅ Free tier available
- ✅ Recommended by Vercel (Vercel KV has been deprecated)

