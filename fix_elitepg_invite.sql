-- Fix invite code for existing ElitePG branches
-- Run this in your Supabase SQL Editor

-- This will generate fresh invite codes for any branches that don't have one yet.
-- It uses your existing pg_branches data.

-- Step 1: Check which branches are missing invite codes
SELECT b.id, b.name, b.branch_name, i.invite_code
FROM pg_branches b
LEFT JOIN user_invites i ON i.branch_id = b.id
ORDER BY b.name;

-- Step 2: Insert invite codes for any branches missing them
-- (This is safe to run multiple times - it skips branches that already have invite codes)
INSERT INTO user_invites (invite_code, branch_id, role, status)
SELECT
  UPPER(SUBSTRING(MD5(RANDOM()::TEXT || b.id), 1, 8)) AS invite_code,
  b.id AS branch_id,
  'tenant' AS role,
  'active' AS status
FROM pg_branches b
WHERE NOT EXISTS (
  SELECT 1 FROM user_invites ui WHERE ui.branch_id = b.id
);

-- Step 3: Verify all branches now have invite codes
SELECT b.id, b.name, b.branch_name, i.invite_code, i.status
FROM pg_branches b
LEFT JOIN user_invites i ON i.branch_id = b.id
ORDER BY b.name;
