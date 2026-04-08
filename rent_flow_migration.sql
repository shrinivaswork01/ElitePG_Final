-- ==========================================
-- RENT FLOW MIGRATION
-- Adds deposit_balance and move_in_date to tenants table
-- ==========================================

-- Add deposit_balance: running balance that starts at deposit_amount when deposit is paid
-- Decreases when admin adjusts rent using deposit
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_balance NUMERIC DEFAULT 0;

-- Add move_in_date: marks physical move-in (vs joining_date = booking date)
-- Used to calculate first rent = rent_amount - token_amount
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS move_in_date DATE;

-- Backfill: For existing tenants with deposit_status = 'paid', set deposit_balance = deposit_amount
UPDATE tenants 
SET deposit_balance = deposit_amount 
WHERE deposit_status = 'paid' AND (deposit_balance IS NULL OR deposit_balance = 0);

-- Backfill: For existing active tenants, set move_in_date = joining_date if not set
UPDATE tenants 
SET move_in_date = joining_date 
WHERE status = 'active' AND move_in_date IS NULL;
