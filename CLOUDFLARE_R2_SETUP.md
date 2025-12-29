# Cloudflare R2 Setup Guide

This guide will help you set up Cloudflare R2 for image storage in your Next.js application.

## Step 1: Create a Cloudflare Account

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Sign up for a free account (no credit card required for free tier)
3. Complete the registration process

## Step 2: Enable R2

1. In your Cloudflare dashboard, go to **R2** in the left sidebar
2. Click **Create bucket**
3. Give your bucket a name (e.g., `room-images` or `picainn-images`)
4. Choose a location (select the closest to your users)
5. Click **Create bucket**

## Step 3: Create API Token

1. In the R2 dashboard, click on **Manage R2 API Tokens**
2. Click **Create API Token**
3. Set permissions:
   - **Object Read & Write** (for full access)
   - Select your bucket
4. Click **Create API Token**
5. **IMPORTANT**: Copy the credentials immediately - you won't be able to see them again!
   - **Access Key ID**
   - **Secret Access Key**

## Step 4: Get Your Account ID

1. In your Cloudflare dashboard, go to the right sidebar
2. Your **Account ID** is displayed there (copy it)

## Step 5: Set Up Public Access (Optional but Recommended)

To make images publicly accessible:

1. Go to your R2 bucket
2. Click **Settings**
3. Under **Public Access**, enable **Allow Access**
4. You can use the default public URL or set up a custom domain

**Default Public URL format:**
```
https://pub-{account-id}.r2.dev/{bucket-name}/{file-path}
```

**Custom Domain (Recommended):**
1. In bucket settings, go to **Custom Domains**
2. Add your domain (e.g., `images.yourdomain.com`)
3. Follow the DNS setup instructions
4. This gives you cleaner URLs like: `https://images.yourdomain.com/rooms/room1/main.jpg`

## Step 6: Add Environment Variables

Add these environment variables to your Vercel project (or `.env.local` for local development):

```bash
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://pub-your_account_id.r2.dev/your_bucket_name
```

**Or if using custom domain:**
```bash
R2_PUBLIC_URL=https://images.yourdomain.com
```

### For Vercel:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add all the variables above
4. Redeploy your application

### For Local Development:
Create or update `.env.local` file in your project root with the variables above.

## Step 7: Test the Setup

After setting up, test the image upload functionality:
1. Go to `/admin`
2. Try uploading a new room with images
3. Check if images appear correctly
4. Verify images are accessible via the public URL

## Free Tier Limits

Cloudflare R2's free tier includes:
- **10GB storage** per month
- **1 million Class A operations** (writes, lists) per month
- **10 million Class B operations** (reads) per month
- **Unlimited egress bandwidth** (no charges for downloads!)

## Pricing Beyond Free Tier

If you exceed the free tier:
- **Storage**: $0.015 per GB per month
- **Class A operations**: $4.50 per million operations
- **Class B operations**: $0.36 per million operations
- **Bandwidth**: Still FREE (unlimited!)

## Troubleshooting

### Images not showing:
1. Verify all environment variables are set correctly
2. Check that public access is enabled on your bucket
3. Verify the R2_PUBLIC_URL is correct
4. Check browser console for CORS errors (if so, configure CORS in R2 settings)

### CORS Issues:
1. Go to your R2 bucket → **Settings** → **CORS Policy**
2. Add a CORS policy:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

### Upload errors:
1. Verify your API token has correct permissions
2. Check that R2_BUCKET_NAME matches your bucket name exactly
3. Verify R2_ENDPOINT is correct

## Migration from Vercel Blob Storage

If you have existing images in Vercel Blob Storage:
1. Download all images from Vercel Blob Storage
2. Upload them to R2 using the Cloudflare dashboard or API
3. Update the image URLs in your Redis database

## Benefits of R2

- ✅ **Unlimited bandwidth** - no surprise bills from traffic spikes
- ✅ **10GB free storage** - plenty for room images
- ✅ **S3-compatible** - easy to use and migrate
- ✅ **Fast CDN** - images served from Cloudflare's global network
- ✅ **Cost-effective** - very affordable if you exceed free tier

