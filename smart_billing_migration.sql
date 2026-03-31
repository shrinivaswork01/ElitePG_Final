-- ==========================================
-- SMART ELECTRICITY BILLING MIGRATION (UPDATED)
-- ==========================================
-- Run this in your Supabase SQL Editor.

-- 1. Ensure rooms table has amenities column
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS amenities TEXT[] DEFAULT '{}';

-- 2. Ensure tenants table has is_ac_user column
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_ac_user BOOLEAN DEFAULT false;

-- 3. Add total_units to electricity_bills (optional field for backward compat)
ALTER TABLE electricity_bills 
ADD COLUMN IF NOT EXISTS total_units NUMERIC DEFAULT NULL;

-- 4. Create room_ac_readings table
CREATE TABLE IF NOT EXISTS room_ac_readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    electricity_bill_id UUID NOT NULL REFERENCES electricity_bills(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL,
    month TEXT NOT NULL,
    previous_reading NUMERIC NOT NULL DEFAULT 0,
    current_reading NUMERIC NOT NULL DEFAULT 0,
    units_consumed NUMERIC GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Unique constraint: one reading per room per month
ALTER TABLE room_ac_readings
DROP CONSTRAINT IF EXISTS unique_room_month_reading;

ALTER TABLE room_ac_readings
ADD CONSTRAINT unique_room_month_reading UNIQUE (room_id, month);

-- 6. Enable RLS
ALTER TABLE room_ac_readings ENABLE ROW LEVEL SECURITY;

-- 7. Add persistence columns to payments table for historical accuracy
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS electricity_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_share NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS ac_share NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS units_consumed NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost_per_unit NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS actual_bill_file_url TEXT,
ADD COLUMN IF NOT EXISTS ac_bill_file_url TEXT;

-- 8. Helper function to bypass RLS for role checks (Security Definer)
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role IN ('super', 'admin', 'manager', 'receptionist', 'caretaker')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. RLS Policies
DROP POLICY IF EXISTS "Auth read ac readings" ON room_ac_readings;
CREATE POLICY "Auth read ac readings" ON room_ac_readings
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins manage ac readings" ON room_ac_readings;
CREATE POLICY "Admins manage ac readings" ON room_ac_readings
FOR ALL TO authenticated
USING (
  public.check_is_admin(auth.uid())
)
WITH CHECK (
  public.check_is_admin(auth.uid())
);

-- 10. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
