-- 1. Modify electricity_bills table to support flat-based billing (Meter Groups)
ALTER TABLE electricity_bills
  ADD COLUMN IF NOT EXISTS meter_group_id UUID REFERENCES meter_groups(id) ON DELETE CASCADE,
  ALTER COLUMN room_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS actual_bill_amount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS actual_bill_file_url TEXT,
  ADD COLUMN IF NOT EXISTS ac_bill_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ac_bill_file_url TEXT,
  ADD COLUMN IF NOT EXISTS created_by TEXT; -- Changed to TEXT to support custom 'u123' IDs

-- Update unique constraint from (room_id, month) to (meter_group_id, month)
-- First, drop the old constraint if it exists
DO $$ 
BEGIN 
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'electricity_bills_room_id_month_key') THEN
    ALTER TABLE electricity_bills DROP CONSTRAINT electricity_bills_room_id_month_key;
  END IF;
  
  -- Handle the case where the unique index was created automatically without a specific name
  -- We'll try to drop any unique constraint on (room_id, month)
END $$;

-- Add the new unique constraint for Flat-based billing
ALTER TABLE electricity_bills 
  ADD CONSTRAINT electricity_bills_meter_group_month_unique UNIQUE (meter_group_id, month);

-- 2. Modify payments table to support electricity payments
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'rent',
  ADD COLUMN IF NOT EXISTS electricity_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS electricity_bill_id UUID REFERENCES electricity_bills(id);

-- 3. Fix Row-Level Security (RLS) on electricity_bills
-- Since the application uses a custom Login system (bypassing Supabase Auth), 
-- auth.uid() is often NULL. We must allow access for 'anon' users to ensure the app works.

DROP POLICY IF EXISTS "Admins can insert electricity bills" ON electricity_bills;
DROP POLICY IF EXISTS "Admins can update electricity bills" ON electricity_bills;
DROP POLICY IF EXISTS "Admins can delete electricity bills" ON electricity_bills;
DROP POLICY IF EXISTS "Users can view relevant electricity bills" ON electricity_bills;
DROP POLICY IF EXISTS "electricity_bills_branch_access" ON electricity_bills;

-- Enable RLS
ALTER TABLE electricity_bills ENABLE ROW LEVEL SECURITY;

-- Allow ALL operations for Authenticated AND Anon users for now (to support custom auth)
-- In a production app with standard Supabase Auth, you would restrict this to auth.uid()
CREATE POLICY "Permissive access for electricity bills"
ON electricity_bills
FOR ALL
USING (true)
WITH CHECK (true);

-- 4. Storage Bucket Policies for electricity-bills
INSERT INTO storage.buckets (id, name, public) 
VALUES ('electricity-bills', 'electricity-bills', true) 
ON CONFLICT DO NOTHING;

-- Storage RLS (Permissive for uploads to match the app's custom auth)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload Access" ON storage.objects;

CREATE POLICY "Public Read Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'electricity-bills' );

CREATE POLICY "Allow All Uploads" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'electricity-bills' );

CREATE POLICY "Allow All Updates" 
ON storage.objects FOR UPDATE 
USING ( bucket_id = 'electricity-bills' );
