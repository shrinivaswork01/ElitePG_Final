-- 1. DELETE EVERYTHING IN ORDER (FRESH START)
DELETE FROM public.kyc_documents;
DELETE FROM public.payments;
DELETE FROM public.complaints;
DELETE FROM public.tenants;
DELETE FROM public.electricity_bills;
DELETE FROM public.rooms;

-- 2. CLEAN UP METER GROUPS
DROP TABLE IF EXISTS public.meter_groups CASCADE;

-- 3. CREATE METER GROUPS (FLATS)
CREATE TABLE public.meter_groups (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    floor INTEGER NOT NULL,
    branch_id TEXT NOT NULL, -- Matched to your project pattern
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. ENABLE RLS
ALTER TABLE public.meter_groups ENABLE ROW LEVEL SECURITY;

-- 5. APPLY CORRECTED USER POLICIES
CREATE POLICY "View Meter Groups" ON public.meter_groups 
FOR SELECT
USING (
  branch_id IN (
    SELECT branch_id
    FROM public.users
    WHERE id = (SELECT auth.uid())::uuid
  )
);

CREATE POLICY "Manage Meter Groups" ON public.meter_groups 
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = (SELECT auth.uid())::uuid
      AND role IN ('super','admin','manager')
      AND (branch_id = public.meter_groups.branch_id OR role = 'super')
  )
);

-- 6. ADD FLAT LINK TO ROOMS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rooms' AND column_name='meter_group_id') THEN
        ALTER TABLE public.rooms ADD COLUMN meter_group_id UUID REFERENCES public.meter_groups(id) ON DELETE SET NULL;
    END IF;
END $$;
