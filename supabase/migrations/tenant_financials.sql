-- Migration for Phase 3: Enhanced Financial Reporting (Tenant Deposits & Tokens)

-- Add Token and Deposit tracking fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS token_amount numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS token_status text DEFAULT 'pending' CHECK (token_status IN ('pending', 'paid', 'refunded')),
ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'pending' CHECK (deposit_status IN ('pending', 'paid', 'refunded')),
ADD COLUMN IF NOT EXISTS deposit_refund_date date;
