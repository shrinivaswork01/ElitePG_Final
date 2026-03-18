-- SQL script to add new resolution fields to the complaints table
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_comment text;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_images jsonb;
