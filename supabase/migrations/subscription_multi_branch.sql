-- Add max_branches column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_branches INTEGER DEFAULT 1;

-- Ensure existing plans have a default value
UPDATE subscription_plans SET max_branches = 1 WHERE max_branches IS NULL;

-- Update RLS if necessary (usually not needed for just adding a column unless policies are very specific)
-- But let's verify if there are any multi-branch related columns missing in pg_branches as well
ALTER TABLE pg_branches ADD COLUMN IF NOT EXISTS official_signature_url TEXT;

-- Verify and add other potential missing columns based on AppContext usage
-- razorpay_customer_id and razorpay_subscription_id are already being used in AppContext
ALTER TABLE pg_branches ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
ALTER TABLE pg_branches ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
