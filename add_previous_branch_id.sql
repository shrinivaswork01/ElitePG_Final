-- Migration: Add previous_branch_id to tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS previous_branch_id UUID REFERENCES pg_branches(id) ON DELETE SET NULL;
