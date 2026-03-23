-- ==========================================
-- ELITE PG - LATE FEE & ROLE PERMISSIONS MIGRATION
-- ==========================================
-- Run this script in the Supabase SQL Editor to add the missing columns to pg_configs.

-- 1. ADD MISSING COLUMNS
ALTER TABLE pg_configs 
ADD COLUMN IF NOT EXISTS role_permissions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS default_payment_due_date INT DEFAULT 1,
ADD COLUMN IF NOT EXISTS default_late_fee_day INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS late_fee_amount INT DEFAULT 100;

-- 2. INITIALIZE EXISTING RECORDS WITH DEFAULTS (OPTIONAL BUT RECOMMENDED)
UPDATE pg_configs SET 
default_payment_due_date = COALESCE(default_payment_due_date, 1),
default_late_fee_day = COALESCE(default_late_fee_day, 5),
late_fee_amount = COALESCE(late_fee_amount, 100),
role_permissions = COALESCE(role_permissions, '[]');

-- 3. ENSURE RLS POLICIES ARE STILL VALID (THEY SHOULD BE)
-- "Admins manage config" strategy already covers all columns.

-- 4. VERIFY TABLE SCHEMA
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'pg_configs';
