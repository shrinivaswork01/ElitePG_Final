-- Fix missing columns in complaints table
-- Path: d:\Other Projects\AntiGravity\ElitePG_Final\supabase\migrations\complaints_schema_fix.sql

ALTER TABLE IF EXISTS complaints 
ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS complaints 
ADD COLUMN IF NOT EXISTS resolution_images JSONB DEFAULT '[]'::jsonb;

ALTER TABLE IF EXISTS complaints 
ADD COLUMN IF NOT EXISTS resolution_comment TEXT;
