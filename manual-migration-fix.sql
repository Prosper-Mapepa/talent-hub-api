-- Manual migration to add password reset fields
-- Run this directly in your Railway PostgreSQL database if the migration doesn't run automatically

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP NULL;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_password_token', 'reset_password_expires');
