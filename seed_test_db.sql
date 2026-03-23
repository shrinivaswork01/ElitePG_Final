-- Supabase Schema and Seed Data for Testing Pagination
-- Paste this entire script into the Supabase SQL Editor and click "Run"

-- 1. Create Tables

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    price INT NOT NULL,
    annual_price INT NOT NULL,
    features TEXT[] DEFAULT '{}',
    max_tenants INT NOT NULL,
    max_rooms INT NOT NULL,
    razorpay_monthly_plan_id TEXT,
    razorpay_annual_plan_id TEXT
);

CREATE TABLE pg_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_id UUID REFERENCES subscription_plans(id),
    subscription_status TEXT DEFAULT 'trial',
    subscription_end_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '30 days',
    razorpay_customer_id TEXT,
    razorpay_subscription_id TEXT,
    official_signature_url TEXT
);

CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT,
    role TEXT NOT NULL DEFAULT 'tenant',
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    avatar TEXT,
    seen_announcements TEXT[] DEFAULT '{}',
    is_authorized BOOLEAN DEFAULT true,
    requires_password_change BOOLEAN DEFAULT false,
    branch_id UUID REFERENCES pg_branches(id),
    provider TEXT DEFAULT 'local',
    google_id TEXT,
    signature_url TEXT
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_number TEXT NOT NULL,
    floor INT NOT NULL,
    total_beds INT NOT NULL,
    occupied_beds INT DEFAULT 0,
    type TEXT NOT NULL CHECK (type IN ('AC', 'Non-AC')),
    price INT NOT NULL,
    branch_id UUID REFERENCES pg_branches(id),
    description TEXT,
    amenities TEXT[] DEFAULT '{}'
);

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    room_id UUID REFERENCES rooms(id),
    bed_number INT NOT NULL,
    rent_amount INT NOT NULL,
    deposit_amount INT NOT NULL,
    joining_date DATE NOT NULL,
    payment_due_date INT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'vacating', 'vacated', 'blacklisted')),
    kyc_status TEXT NOT NULL CHECK (kyc_status IN ('unsubmitted', 'pending', 'verified', 'rejected')),
    rent_agreement_url TEXT,
    invite_code TEXT,
    branch_id UUID REFERENCES pg_branches(id)
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    amount INT NOT NULL,
    late_fee INT DEFAULT 0,
    total_amount INT NOT NULL,
    payment_date DATE NOT NULL,
    month TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending')),
    method TEXT NOT NULL CHECK (method IN ('Online', 'Cash', 'Offline')),
    transaction_id TEXT,
    receipt_url TEXT,
    branch_id UUID REFERENCES pg_branches(id),
    created_by UUID REFERENCES users(id)
);

CREATE TABLE user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code TEXT NOT NULL UNIQUE,
    email TEXT,
    branch_id UUID REFERENCES pg_branches(id),
    role TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE kycs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    employee_id UUID,
    document_type TEXT NOT NULL,
    document_url TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('unsubmitted', 'pending', 'verified', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    branch_id UUID REFERENCES pg_branches(id)
);

-- Turn off RLS for testing purposes (Not recommended for production)
ALTER TABLE subscription_plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE pg_branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE kycs DISABLE ROW LEVEL SECURITY;


-- 2. Insert Dummy Seed Data specifically for Pagination Testing

-- Create a dummy subscription plan
INSERT INTO subscription_plans (id, name, price, annual_price, max_tenants, max_rooms)
VALUES ('00000000-0000-0000-0000-000000000001', 'Premium Plan', 999, 9999, 100, 50)
ON CONFLICT DO NOTHING;

-- Create a dummy branch
INSERT INTO pg_branches (id, name, branch_name, address, phone, plan_id)
VALUES ('00000000-0000-0000-0000-000000000002', 'Elite PG', 'Main Branch', '123 Test Ave', '9999999999', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;


-- Seed 25 Dummy Rooms
DO $$
DECLARE
    i INT;
    new_room_id UUID;
BEGIN
    FOR i IN 1..25 LOOP
        INSERT INTO rooms (room_number, floor, type, total_beds, price, branch_id)
        VALUES (
            (100 + i)::TEXT, 
            (i / 10) + 1, 
            CASE WHEN (i % 2 = 0) THEN 'AC' ELSE 'Non-AC' END, 
            2, 
            6000 + (i * 100), 
            '00000000-0000-0000-0000-000000000002'
        );
    END LOOP;
END $$;


-- Seed 25 Dummy Tenants tied to the rooms
DO $$
DECLARE
    r_record RECORD;
    i INT := 1;
    new_tenant_id UUID;
BEGIN
    FOR r_record IN SELECT id, room_number FROM rooms LIMIT 25 LOOP
        INSERT INTO tenants (
            name, email, phone, room_id, bed_number, rent_amount, deposit_amount, joining_date, payment_due_date, status, kyc_status, branch_id
        )
        VALUES (
            'Tenant ' || i, 
            'tenant' || i || '@example.com', 
            '98765432' || LPAD(i::TEXT, 2, '0'), 
            r_record.id, 
            1, 
            6000, 
            12000, 
            CURRENT_DATE - (i || ' days')::INTERVAL, 
            5, 
            'active', 
            'verified', 
            '00000000-0000-0000-0000-000000000002'
        ) RETURNING id INTO new_tenant_id;
        
        -- Seed 1 Dummy Payment for each tenant
        INSERT INTO payments (
            tenant_id, amount, late_fee, total_amount, payment_date, month, status, method, branch_id
        )
        VALUES (
            new_tenant_id,
            6000,
            0,
            6000,
            CURRENT_DATE,
            TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
            'paid',
            'Online',
            '00000000-0000-0000-0000-000000000002'
        );

        i := i + 1;
    END LOOP;
END $$;
