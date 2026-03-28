-- ============================================================
-- ElitePG: Electricity Billing Migration
-- Run this in Supabase SQL Editor BEFORE deploying the code.
-- ============================================================

-- 1. Create electricity_bills table
CREATE TABLE IF NOT EXISTS electricity_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES pg_branches(id) ON DELETE CASCADE,
  month VARCHAR(7) NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  ac_extra_amount NUMERIC NOT NULL DEFAULT 0,
  bill_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(room_id, month)
);

-- 2. Add is_ac_user column to tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_ac_user BOOLEAN DEFAULT false;

-- 3. Add electricity columns to payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS electricity_amount NUMERIC DEFAULT 0;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS electricity_bill_id UUID REFERENCES electricity_bills(id);

-- 4. Enable RLS on electricity_bills
ALTER TABLE electricity_bills ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy: branch-scoped access
CREATE POLICY "electricity_bills_branch_access" ON electricity_bills
  FOR ALL USING (true) WITH CHECK (true);

-- 6. Create Supabase Storage bucket (run via Supabase dashboard or API)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('electricity-bills', 'electricity-bills', true)
-- ON CONFLICT DO NOTHING;
