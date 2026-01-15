# Cloudinary Implementation Plan

## Status
✅ Configuration and service created
✅ Students module updated to import CloudinaryModule
⏳ Students service needs to use CloudinaryService
⏳ Students controller needs to use memoryStorage

## Required Changes

### 1. Update Students Service (`backend/src/students/students.service.ts`)

Inject CloudinaryService in constructor and update all file upload methods:
- `uploadProfileImage` - Use CloudinaryService
- `addProject` - Use CloudinaryService  
- `updateProject` - Use CloudinaryService
- `addAchievement` - Use CloudinaryService
- `updateAchievement` - Use CloudinaryService
- `addTalent` - Use CloudinaryService
- `updateTalent` - Use CloudinaryService

Store Cloudinary URLs (result.secure_url) instead of local paths.

### 2. Update Students Controller (`backend/src/students/students.controller.ts`)

Change all `diskStorage` to `memoryStorage` from multer:
- Profile image upload
- Project file uploads
- Achievement file uploads
- Talent file uploads

This is required because Cloudinary needs file buffers, not disk storage.

### 3. Environment Variables

Add to `.env` and Railway:
```
CLOUDINARY_CLOUD_NAME=dh6druxj7
CLOUDINARY_API_KEY=339499429779494
CLOUDINARY_API_SECRET=your_api_secret_here
```

## Notes

- Files will be stored in Cloudinary with folders: `profiles/`, `projects/`, `achievements/`, `talents/`
- URLs stored in database will be Cloudinary URLs (e.g., `https://res.cloudinary.com/...`)
- No changes needed to frontend - URLs will work the same way
- Old local file paths in database will still work (via backward compatibility check)
