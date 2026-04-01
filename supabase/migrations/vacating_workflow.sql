-- Migration to add vacating workflow columns to tenants table

-- 1. Add new columns
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vacating_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exit_date DATE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS vacating_status TEXT DEFAULT 'active' CHECK (vacating_status IN ('active', 'notice_given', 'vacated'));

-- 2. Update existing status enum if needed (TenantStatus check)
-- Existing: status IN ('active', 'vacating', 'vacated', 'blacklisted')
-- No change needed to status, but vacating_status will be the primary driver for the new workflow.

COMMENT ON COLUMN tenants.vacating_date IS 'The date the tenant requested to vacate.';
COMMENT ON COLUMN tenants.exit_date IS 'The auto-calculated final exit date (vacating_date + 30 days).';
COMMENT ON COLUMN tenants.vacating_status IS 'Tracks the vacating lifecycle: active (no notice), notice_given (under 30-day notice), vacated (checkout complete).';

-- 3. Add Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenants_vacating_status ON tenants(vacating_status);
CREATE INDEX IF NOT EXISTS idx_tenants_exit_date ON tenants(exit_date);
CREATE INDEX IF NOT EXISTS idx_tenants_branch_id ON tenants(branch_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

CREATE INDEX IF NOT EXISTS idx_payments_month_status ON payments(month, status);
CREATE INDEX IF NOT EXISTS idx_payments_branch_id ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);

CREATE INDEX IF NOT EXISTS idx_rooms_branch_id ON rooms(branch_id);
