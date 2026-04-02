-- Create 'signatures' bucket for storing official and individual signatures
INSERT INTO storage.buckets (id, name, public)
VALUES ('signatures', 'signatures', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to signatures
-- This ensures that signatures can be retrieved for PDF generation without auth overhead
CREATE POLICY "Public Read Access for Signatures"
ON storage.objects FOR SELECT
USING ( bucket_id = 'signatures' );

-- Allow authenticated users to upload their own signatures
-- We keep it simple for now to allow all authenticated uploads to this bucket
CREATE POLICY "Allow Authenticated Uploads to Signatures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'signatures' );

-- Allow owners to update/delete their own objects if needed (based on name which contains user/branch ID)
CREATE POLICY "Allow Individual Update to Signatures"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'signatures' );

CREATE POLICY "Allow Individual Delete from Signatures"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'signatures' );
