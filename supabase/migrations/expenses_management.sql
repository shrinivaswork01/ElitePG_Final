-- Expenses Table
CREATE TABLE expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid REFERENCES pg_branches(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  amount numeric NOT NULL,
  date date NOT NULL,
  receipt_url text,
  created_by text REFERENCES users(id) ON DELETE SET NULL,
  approved_by text[], -- Array of user IDs
  rejected_by text[], -- Array of user IDs
  status text NOT NULL DEFAULT 'saved', -- saved, pending, approved, rejected
  month text NOT NULL, -- e.g., '2026-04'
  edited_by text REFERENCES users(id) ON DELETE SET NULL,
  edited_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RLS for expenses
-- ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view expenses for their branches"
  ON expenses FOR SELECT
  USING (
    branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY "Users can insert expenses for their branches"
  ON expenses FOR INSERT
  WITH CHECK (
    branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY "Users can update expenses for their branches"
  ON expenses FOR UPDATE
  USING (
    branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text)
  );

CREATE POLICY "Users can delete expenses for their branches"
  ON expenses FOR DELETE
  USING (
    branch_id = (SELECT branch_id::uuid FROM users WHERE id = auth.uid()::text)
  );

-- Receipts Storage Bucket Policy
-- (Assuming 'receipts' bucket needs to be created or we use existing)
INSERT INTO storage.buckets (id, name, public) VALUES ('receipts', 'receipts', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public read access for receipts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'receipts');

CREATE POLICY "Authenticated users can upload receipts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');
