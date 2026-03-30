-- Run this in your Supabase SQL Editor to add the signature column for tenants.
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS signature_url TEXT;
