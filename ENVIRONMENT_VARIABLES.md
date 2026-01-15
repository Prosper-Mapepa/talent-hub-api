# Environment Variables for Railway Deployment

## Required Variables

### Database (PostgreSQL)
These are **automatically provided** by Railway if you add a PostgreSQL service and link it to your backend service. However, you can also set them manually:

- `DB_HOST` - Database host (e.g., `containers-us-west-xxx.railway.app`)
- `DB_PORT` - Database port (usually `5432`)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

**Note:** If using Railway PostgreSQL, these are auto-injected. Just link the services.

### Application
- `PORT` - Server port (Railway sets this automatically, but defaults to `3000` if not set)
- `NODE_ENV` - Set to `production` for production deployments

### JWT Authentication
- `JWT_SECRET` - Secret key for JWT tokens (REQUIRED for authentication)
  - Example: `09d5de75e86600248c4b4a0cd4b56e83849311ff272fc4838214cdba236707b2d25e8d66309e0fac850436cbdbe73845533e2ce315ef2b7840d6a4edaf820882`
- `JWT_EXPIRES_IN` - JWT expiration time (optional, defaults to `7d`)
  - Examples: `7d`, `24h`, `1h`

### CORS Configuration
- `CORS_ORIGINS` - Comma-separated list of allowed frontend URLs (REQUIRED for production)
  - Example: `https://your-frontend.netlify.app,https://www.your-frontend.netlify.app`
  - For development: `http://localhost:3000,http://localhost:3001`

### Cloudinary (File Storage)
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name (REQUIRED for file uploads)
- `CLOUDINARY_API_KEY` - Your Cloudinary API key (REQUIRED for file uploads)
- `CLOUDINARY_API_SECRET` - Your Cloudinary API secret (REQUIRED for file uploads)
  - Get these from: https://console.cloudinary.com/
  - Free tier: 25GB storage, 25GB bandwidth/month

## Optional Variables

- `FRONTEND_URL` - Frontend URL for redirects/links
- `CORS_ORIGIN` - Single CORS origin (alternative to CORS_ORIGINS)
- `LOG_LEVEL` - Logging level (default: `info`)
  - Options: `error`, `warn`, `info`, `debug`

## Quick Setup in Railway

1. **Add PostgreSQL Service:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will automatically provide database connection variables

2. **Link Services:**
   - In your backend service, go to "Variables" tab
   - Railway will show "Reference" options for the PostgreSQL service
   - Click "Add Reference" for each database variable

3. **Add Required Variables:**
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = (use the generated secret from earlier)
   - `CORS_ORIGINS` = (your Netlify frontend URL)

4. **Optional Variables:**
   - `JWT_EXPIRES_IN` = `7d` (or your preferred expiration)
   - `LOG_LEVEL` = `info`
   - `FRONTEND_URL` = (your frontend URL)

## Example Railway Environment Variables

```
NODE_ENV=production
JWT_SECRET=09d5de75e86600248c4b4a0cd4b56e83849311ff272fc4838214cdba236707b2d25e8d66309e0fac850436cbdbe73845533e2ce315ef2b7840d6a4edaf820882
CORS_ORIGINS=https://your-frontend.netlify.app,https://www.your-frontend.netlify.app
JWT_EXPIRES_IN=7d
LOG_LEVEL=info
FRONTEND_URL=https://your-frontend.netlify.app
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Note:** Database variables (`DB_HOST`, `DB_PORT`, etc.) are automatically set when you link the PostgreSQL service.

