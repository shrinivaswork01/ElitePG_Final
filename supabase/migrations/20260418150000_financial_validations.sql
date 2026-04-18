-- 1. Prevent duplicate RENT payments for the same tenant in the same month and branch
CREATE UNIQUE INDEX IF NOT EXISTS unique_tenant_rent_monthly 
ON payments(tenant_id, month, branch_id) 
WHERE payment_type = 'rent';

-- 2. Prevent duplicate partner payouts for the same partner in the same month and branch
-- This specifically fixes the UPSERT error: "There is no unique or exclusion constraint matching the ON CONFLICT specification"
ALTER TABLE partner_payouts
ADD CONSTRAINT unique_partner_payout_monthly UNIQUE (partner_id, month, branch_id);
