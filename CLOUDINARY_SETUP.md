# Cloudinary Setup Guide

## Installation

First, install the Cloudinary SDK:

```bash
cd backend
npm install cloudinary
```

## Environment Variables

Add the following environment variables to your `.env` file and Railway:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Getting Cloudinary Credentials

1. Sign up for a free account at https://cloudinary.com/
2. Go to your Dashboard
3. Copy your `Cloud name`, `API Key`, and `API Secret`
4. Add them to your environment variables

### Free Tier Limits
- 25 GB storage
- 25 GB bandwidth/month
- Perfect for development and small projects

## What's Changed

### Files Created
- `backend/src/config/cloudinary.config.ts` - Cloudinary configuration
- `backend/src/common/services/cloudinary.service.ts` - Cloudinary service for uploading/deleting files
- `backend/src/common/services/cloudinary.module.ts` - Cloudinary module

### Files That Need Updating
- `backend/src/students/students.module.ts` - Import CloudinaryModule
- `backend/src/students/students.service.ts` - Use CloudinaryService instead of local paths
- `backend/src/students/students.controller.ts` - Use memoryStorage instead of diskStorage

## Next Steps

The code has been prepared but needs to be updated to use Cloudinary. The changes include:

1. **Students Module**: Import CloudinaryModule
2. **Students Service**: Update all file upload methods to use CloudinaryService
3. **Students Controller**: Change from `diskStorage` to `memoryStorage` (Cloudinary needs file buffers)

After installation and environment variables are set, the implementation can be completed.
