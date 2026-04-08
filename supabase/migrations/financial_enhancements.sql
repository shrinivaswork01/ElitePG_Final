-- Tenant Deposit Logs for history
CREATE TABLE tenant_deposit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES pg_branches(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'deposit', 'token'
  amount numeric NOT NULL,
  status text NOT NULL, -- 'paid', 'refunded', 'pending'
  date date NOT NULL DEFAULT CURRENT_DATE,
  note text,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Partner Share Ratios
CREATE TABLE partner_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text REFERENCES users(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES pg_branches(id) ON DELETE CASCADE,
  share_percentage numeric NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, branch_id)
);

-- Profit Distributions History
CREATE TABLE profit_distributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES pg_branches(id) ON DELETE CASCADE,
  month text NOT NULL, -- '2026-04'
  total_revenue numeric NOT NULL,
  total_expenses numeric NOT NULL,
  net_profit numeric NOT NULL,
  distributions jsonb NOT NULL, -- Array of {partnerId, partnerName, sharePercentage, amount}
  created_at timestamptz DEFAULT now(),
  UNIQUE(branch_id, month)
);



-- Simple RLS (matching existing pattern for branch-based access)
CREATE POLICY "Users can view deposit logs for their branches" ON tenant_deposit_logs FOR SELECT USING (branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text));
CREATE POLICY "Admins can manage deposit logs for their branches" ON tenant_deposit_logs FOR ALL USING (branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can view shares for their branches" ON partner_shares FOR SELECT USING (branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text));
CREATE POLICY "Admins can manage shares for their branches" ON partner_shares FOR ALL USING (branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can view distributions for their branches" ON profit_distributions FOR SELECT USING (branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text));
CREATE POLICY "Admins can manage distributions for their branches" ON profit_distributions FOR ALL USING (branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text));
