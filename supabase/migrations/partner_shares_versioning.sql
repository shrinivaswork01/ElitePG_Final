-- Update partner_shares to support versioning
ALTER TABLE partner_shares DROP CONSTRAINT IF EXISTS partner_shares_user_id_branch_id_key;

-- Add effective_from column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'partner_shares' AND COLUMN_NAME = 'effective_from') THEN
        ALTER TABLE partner_shares ADD COLUMN effective_from text NOT NULL DEFAULT '2024-01';
    END IF;
END $$;

-- Add UNIQUE constraint for (branch, partner, effective_month)
ALTER TABLE partner_shares ADD CONSTRAINT partner_shares_version_unique UNIQUE (branch_id, user_id, effective_from);

-- Comments for documentation
COMMENT ON COLUMN partner_shares.effective_from IS 'The month this ratio becomes active (format: YYYY-MM)';
