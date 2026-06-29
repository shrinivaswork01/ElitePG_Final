-- ==========================================
-- WHATSAPP TEMPLATES TABLE MIGRATION
-- ==========================================
-- Run this in your Supabase SQL Editor.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES pg_branches(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom' CHECK (category IN ('reminder', 'notice', 'greeting', 'custom')),
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (drop if already exist from previous run)
DROP POLICY IF EXISTS "Auth read templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "Admins manage templates" ON whatsapp_templates;

CREATE POLICY "Auth read templates" ON whatsapp_templates
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage templates" ON whatsapp_templates
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
