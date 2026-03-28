-- Migration: Unified plan pricing (monthly + annual in one plan row)
-- Run this in your Supabase SQL Editor

-- 1. Add annual_price column (stores total annual billing amount, e.g. 4999)
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS annual_price INTEGER DEFAULT 0;

-- 2. Add a dedicated annual Razorpay plan ID
--    (razorpay_plan_id is now treated as the MONTHLY plan ID)
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS razorpay_annual_plan_id TEXT;

-- 3. Drop and recreate the billing_cycle check constraint
--    to allow NULL (since billing_cycle is no longer used per-row)
ALTER TABLE subscription_plans
DROP CONSTRAINT IF EXISTS subscription_plans_billing_cycle_check;

-- (Optional) Remove billing_cycle column entirely since it's no longer needed
-- ALTER TABLE subscription_plans DROP COLUMN IF EXISTS billing_cycle;
-- NOTE: Only run the above if you've cleaned up old separate-cycle plan rows first.
