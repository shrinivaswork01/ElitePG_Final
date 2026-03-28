-- 1. Add meter_group_id to electricity_bills
ALTER TABLE public.electricity_bills ADD COLUMN IF NOT EXISTS meter_group_id UUID REFERENCES public.meter_groups(id);

-- 2. Migration: Link old room-based bills to their respective Flat (Meter Group)
UPDATE public.electricity_bills
SET meter_group_id = r.meter_group_id
FROM public.rooms r
WHERE public.electricity_bills.room_id = r.id
AND r.meter_group_id IS NOT NULL;

-- 3. Make room_id optional (since bills are now flat-based)
ALTER TABLE public.electricity_bills ALTER COLUMN room_id DROP NOT NULL;

-- 4. Add Unique Constraint to prevent duplicate bills for the same Flat and Month
-- First, delete any duplicates that might exist (keep the latest)
DELETE FROM public.electricity_bills a USING public.electricity_bills b
WHERE a.id < b.id 
AND a.meter_group_id = b.meter_group_id 
AND a.month = b.month;

ALTER TABLE public.electricity_bills 
DROP CONSTRAINT IF EXISTS unique_meter_group_month;

ALTER TABLE public.electricity_bills 
ADD CONSTRAINT unique_meter_group_month UNIQUE (meter_group_id, month);
