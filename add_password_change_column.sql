-- Add requires_password_change column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- Optional: Reset any existing admin-created users without passwords to require a change
-- UPDATE users SET requires_password_change = TRUE WHERE password IS NOT NULL AND role NOT IN ('admin', 'super', 'tenant');
