-- Add ratio column if it doesn't already exist to fix schema cache error

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'partner_shares' AND COLUMN_NAME = 'ratio') THEN
        ALTER TABLE partner_shares ADD COLUMN ratio numeric NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Add a comment for clarification
COMMENT ON COLUMN partner_shares.ratio IS 'Used by frontend for partner distribution ratios. Mirrors share_percentage.';
