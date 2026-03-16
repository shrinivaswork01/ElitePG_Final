-- SQL Script to add Razorpay Subscription fields to the database

-- 1. Add Razorpay Plan ID and Billing Cycle to subscription_plans
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS razorpay_plan_id TEXT,
ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly'; -- 'monthly' or 'annual'

-- 2. Add Razorpay tracking fields to pg_branches for subscriptions
ALTER TABLE pg_branches
ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT,
ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
