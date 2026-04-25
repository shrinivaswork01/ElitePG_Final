-- Add separate electricity late fee and due date columns to pg_configs
ALTER TABLE pg_configs
  ADD COLUMN IF NOT EXISTS electricity_late_fee_day INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS electricity_late_fee_amount INTEGER DEFAULT 50,
  ADD COLUMN IF NOT EXISTS electricity_due_date INTEGER DEFAULT 1;
