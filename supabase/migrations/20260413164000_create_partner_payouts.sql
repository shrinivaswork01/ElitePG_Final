-- Create partner_payouts table
CREATE TABLE IF NOT EXISTS partner_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  branch_id UUID REFERENCES pg_branches(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'REQUESTED', -- REQUESTED, PARTNER_APPROVED, PAID
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Note: In combined mode, branch_id could potentially be NULL if we calculate combined, 
-- but normally people payout per-branch.
ALTER TABLE partner_payouts ALTER COLUMN branch_id DROP NOT NULL;

-- Enable RLS
ALTER TABLE partner_payouts ENABLE ROW LEVEL SECURITY;

-- Add RLS Policies
CREATE POLICY "Super admin can do all on partner_payouts"
  ON partner_payouts
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM employees WHERE user_id::uuid = auth.uid() AND role = 'super')
  );

CREATE POLICY "Partners and admins can view their branch payouts"
  ON partner_payouts
  FOR SELECT
  USING (
    auth.uid() = partner_id OR 
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id::uuid = auth.uid() 
      AND (role = 'admin' OR role = 'partner') 
      AND (branch_id::uuid = partner_payouts.branch_id OR partner_payouts.branch_id IS NULL)
    )
  );

-- Allow admins/partners to insert and update based on workflow
CREATE POLICY "Admins and partners can insert and update payouts"
  ON partner_payouts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM employees 
      WHERE user_id::uuid = auth.uid() 
      AND (role = 'admin' OR role = 'partner') 
      AND (branch_id::uuid = partner_payouts.branch_id OR partner_payouts.branch_id IS NULL)
    )
  );

-- To prevent duplicate payouts at DB level (Month + Branch + Partner)
CREATE UNIQUE INDEX IF NOT EXISTS partner_payouts_month_branch_partner_idx 
ON partner_payouts (month, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), partner_id);
