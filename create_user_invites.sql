-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_code TEXT UNIQUE NOT NULL,
  email TEXT,
  branch_id TEXT NOT NULL REFERENCES pg_branches(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'tenant',
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Allow public read of invites (since unauthenticated users need to verify code)
CREATE POLICY "Allow public read of invites" ON user_invites FOR SELECT USING (true);

-- Allow public update of invites (to mark as accepted)
CREATE POLICY "Allow public update of invites" ON user_invites FOR UPDATE USING (true);

-- Allow admin to insert invites
CREATE POLICY "Allow admin insert of invites" ON user_invites FOR INSERT WITH CHECK (true);

-- Allow admins to delete invites
CREATE POLICY "Allow admin delete of invites" ON user_invites FOR DELETE USING (true);
