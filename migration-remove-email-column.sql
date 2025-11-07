-- Migration: Remove email column from users table
-- Date: 2025-01-06
-- Description: Removes email column for privacy - email addresses are not needed for question routing

-- Drop the email column from users table
ALTER TABLE users DROP COLUMN IF EXISTS email;

-- Note: This is a destructive operation. Email data will be permanently deleted.
-- If you need to backup emails first, run this before executing the migration:
-- CREATE TABLE users_email_backup AS SELECT slack_user_id, email FROM users WHERE email IS NOT NULL;
