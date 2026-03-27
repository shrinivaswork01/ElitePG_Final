-- Add proof_url to payments table for tenant-uploaded payment proofs
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- Update RLS for storage if needed (assuming payments-proofs bucket will be used)
-- We'll use the existing 'electricity-bills' bucket for now or a new one. 
-- Let's create 'payment-proofs' bucket.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-proofs', 'payment-proofs', true) 
ON CONFLICT DO NOTHING;

-- Storage RLS for payment-proofs
CREATE POLICY "Public Read Access for payment-proofs" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'payment-proofs' );

CREATE POLICY "Allow All Uploads to payment-proofs" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'payment-proofs' );
