# Railway Deployment Guide

This backend is configured for deployment on Railway.

## Environment Variables

Set the following environment variables in Railway:

### Database (PostgreSQL)
- `DB_HOST` - Database host (Railway provides this automatically if using Railway PostgreSQL)
- `DB_PORT` - Database port (default: 5432)
- `DB_USERNAME` - Database username
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name

### Application
- `PORT` - Server port (Railway sets this automatically, defaults to 3000)
- `NODE_ENV` - Set to `production` for production deployments
- `CORS_ORIGINS` - Comma-separated list of allowed CORS origins (e.g., `https://yourdomain.com,https://www.yourdomain.com`)

### JWT (if using JWT authentication)
- `JWT_SECRET` - Secret key for JWT tokens
- `JWT_EXPIRES_IN` - JWT expiration time (e.g., `7d`)

### Other
- `FRONTEND_URL` - Frontend URL for redirects/links
- `LOG_LEVEL` - Logging level (default: `info`)

## Deployment Steps

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the Node.js project
3. Add a PostgreSQL service in Railway
4. Set all required environment variables
5. Deploy!

## Database Migrations

Migrations run automatically on startup (`migrationsRun: true` in database config).

To run migrations manually:
```bash
npm run migration:run
```

## Notes

- The app listens on `0.0.0.0` to accept connections from Railway's network
- Static files in `/uploads` are served, but consider using cloud storage (S3, Cloudinary) for production
- CORS is configured to allow requests from specified origins

