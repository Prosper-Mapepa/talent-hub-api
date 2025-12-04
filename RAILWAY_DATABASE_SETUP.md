# Railway Database Setup Guide

## The Problem
If you see `ECONNREFUSED ::1:5432` errors, it means your backend is trying to connect to `localhost` instead of your Railway PostgreSQL database. This happens when database environment variables are not set.

## Solution: Add PostgreSQL Service in Railway

### Option 1: Add PostgreSQL Service (Recommended - Easiest)

1. **In Railway Dashboard:**
   - Click "New" → "Database" → "Add PostgreSQL"
   - Railway will create a PostgreSQL database for you

2. **Link the Database to Your Backend:**
   - Go to your backend service
   - Click on the "Variables" tab
   - You'll see a section called "Reference Variables" or "Add Reference"
   - Click "Add Reference"
   - Select your PostgreSQL service
   - Railway will automatically add these variables:
     - `PGHOST` → Maps to `DB_HOST`
     - `PGPORT` → Maps to `DB_PORT`
     - `PGUSER` → Maps to `DB_USERNAME`
     - `PGPASSWORD` → Maps to `DB_PASSWORD`
     - `PGDATABASE` → Maps to `DB_NAME`

3. **Map Railway Variables to Your App Variables:**
   Railway uses `PG*` variables, but your app expects `DB_*` variables. You need to create references:
   
   - Click "Add Reference" for each:
     - `DB_HOST` → Reference `${{PostgreSQL.PGHOST}}`
     - `DB_PORT` → Reference `${{PostgreSQL.PGPORT}}`
     - `DB_USERNAME` → Reference `${{PostgreSQL.PGUSER}}`
     - `DB_PASSWORD` → Reference `${{PostgreSQL.PGPASSWORD}}`
     - `DB_NAME` → Reference `${{PostgreSQL.PGDATABASE}}`

   **OR** Railway might auto-detect and suggest these mappings. Look for "Generate Variables" or similar option.

### Option 2: Manual Setup (If Option 1 doesn't work)

1. **Get Database Connection Details:**
   - Go to your PostgreSQL service in Railway
   - Click on the "Variables" tab
   - Copy these values:
     - `PGHOST`
     - `PGPORT`
     - `PGUSER`
     - `PGPASSWORD`
     - `PGDATABASE`

2. **Add to Backend Service:**
   - Go to your backend service → "Variables" tab
   - Add these variables manually:
     ```
     DB_HOST = (value from PGHOST)
     DB_PORT = (value from PGPORT)
     DB_USERNAME = (value from PGUSER)
     DB_PASSWORD = (value from PGPASSWORD)
     DB_NAME = (value from PGDATABASE)
     ```

## Verify Setup

After setting up, your backend service should have these variables:
- ✅ `DB_HOST` (should NOT be localhost or ::1)
- ✅ `DB_PORT` (usually 5432)
- ✅ `DB_USERNAME`
- ✅ `DB_PASSWORD`
- ✅ `DB_NAME`

## Quick Checklist

- [ ] PostgreSQL service created in Railway
- [ ] PostgreSQL service linked to backend service
- [ ] `DB_HOST` variable set (check it's not localhost)
- [ ] `DB_PORT` variable set
- [ ] `DB_USERNAME` variable set
- [ ] `DB_PASSWORD` variable set
- [ ] `DB_NAME` variable set
- [ ] Backend service redeployed after adding variables

## After Setup

Once variables are set:
1. Railway will automatically redeploy your backend
2. The connection errors should stop
3. Your app will connect to the Railway PostgreSQL database
4. Migrations will run automatically on startup (configured in `database.config.ts`)

## Troubleshooting

**Still seeing connection errors?**
- Check that `DB_HOST` is NOT `localhost` or `::1`
- Verify all 5 database variables are set
- Make sure the PostgreSQL service is running (green status)
- Check Railway logs for more details

**Can't find "Add Reference" option?**
- Make sure both services (PostgreSQL and Backend) are in the same Railway project
- Try the manual setup (Option 2) instead

