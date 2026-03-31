-- ============================================================
-- Fix: Drop FK constraint on users.id → auth.users(id)
-- 
-- The ElitePG app uses a hybrid auth model:
-- - Local users: custom password stored in users.password
-- - Google OAuth users: provisioned via AuthContext.provisionNewUser()
--
-- The FK constraint prevents locally-created users (tenants, employees)
-- from being inserted because their UUID doesn't exist in auth.users.
-- 
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ============================================================

-- 1. Drop the foreign key constraint from users.id → auth.users(id)
DO $$
BEGIN
    -- Find and drop any FK constraint referencing auth.users on the users table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%auth%'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE public.users DROP CONSTRAINT ' || constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'users'
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%auth%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped FK constraint referencing auth.users';
    ELSE
        RAISE NOTICE 'No FK constraint found referencing auth.users — may already be dropped';
    END IF;
END $$;

-- 2. Also try dropping by the most common constraint name patterns
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_id_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_pkey_fkey;
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS fk_users_auth;

-- 3. Drop the auto-provisioning trigger (if it exists)
-- This trigger auto-creates public.users rows from auth.users on OAuth signup.
-- Since AuthContext.provisionNewUser() handles this manually, the trigger is redundant.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user();

-- 4. Ensure the users.id column is still UUID type without FK reference
-- (It should already be UUID PRIMARY KEY, just without the FK now)

-- 5. Ensure requires_password_change column exists
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS requires_password_change BOOLEAN DEFAULT FALSE;

-- 6. Verify: Check current constraints on users table
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'users' AND table_schema = 'public';
