-- ==========================================
-- ELITE PG - COMPLETE SUPABASE SCHEMA SCRIPT
-- ==========================================
-- This script contains all Tables, Functions, Triggers, and RLS Policies 
-- required to run the ElitePG application, derived from the TypeScript types.
-- It also includes Dummy Data designed for testing the paginated DataGrid.

-- NOTE: Run this entirely in the Supabase SQL Editor.

-- ==========================================
-- 1. BASE TABLES & ENUMS
-- ==========================================

CREATE TABLE IF NOT EXISTS subscription_plans (
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

CREATE TABLE IF NOT EXISTS pg_branches (
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

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS rooms (
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

CREATE TABLE IF NOT EXISTS tenants (
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

CREATE TABLE IF NOT EXISTS payments (
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

CREATE TABLE IF NOT EXISTS user_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invite_code TEXT NOT NULL UNIQUE,
    email TEXT,
    branch_id UUID REFERENCES pg_branches(id),
    role TEXT NOT NULL DEFAULT 'tenant',
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS kycs (
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

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    images TEXT[] DEFAULT '{}',
    branch_id UUID REFERENCES pg_branches(id),
    resolution_comment TEXT,
    resolution_images TEXT[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target TEXT NOT NULL CHECK (target IN ('all', 'active', 'vacating')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    branch_id UUID REFERENCES pg_branches(id)
);

CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    salary INT NOT NULL,
    joining_date DATE NOT NULL,
    user_id UUID REFERENCES users(id),
    kyc_status TEXT NOT NULL CHECK (kyc_status IN ('unsubmitted', 'pending', 'verified', 'rejected')),
    branch_id UUID REFERENCES pg_branches(id),
    signature_url TEXT
);

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    complaint_id UUID REFERENCES complaints(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    due_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    completion_comment TEXT,
    completion_images TEXT[] DEFAULT '{}',
    branch_id UUID REFERENCES pg_branches(id)
);

CREATE TABLE IF NOT EXISTS salary_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID REFERENCES employees(id),
    amount INT NOT NULL,
    month TEXT NOT NULL,
    payment_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('paid', 'pending')),
    method TEXT NOT NULL CHECK (method IN ('Bank Transfer', 'Cash', 'UPI')),
    transaction_id TEXT,
    branch_id UUID REFERENCES pg_branches(id)
);

CREATE TABLE IF NOT EXISTS pg_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES pg_branches(id),
    rules TEXT[] DEFAULT '{}',
    complaint_categories TEXT[] DEFAULT '{}',
    custom_roles TEXT[] DEFAULT '{}',
    role_permissions JSONB DEFAULT '[]',
    logo_url TEXT,
    pg_name TEXT,
    primary_color TEXT,
    theme TEXT DEFAULT 'system',
    default_payment_due_date INT DEFAULT 1,
    default_late_fee_day INT DEFAULT 5,
    late_fee_amount INT DEFAULT 100
);

-- ==========================================
-- 2. FUNCTIONS & TRIGGERS
-- ==========================================

-- Auto-create public.users row when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', new.email), COALESCE(new.raw_user_meta_data->>'role', 'tenant'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==========================================
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE kycs ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pg_configs ENABLE ROW LEVEL SECURITY;

-- SUBSCRIPTION PLANS: Anyone can read
CREATE POLICY "Public read plans" ON subscription_plans FOR SELECT USING (true);

-- PG BRANCHES: Anyone authenticated can read
CREATE POLICY "Auth read branches" ON pg_branches FOR SELECT TO authenticated USING (true);

-- USERS: Users can read themselves and admins can read all
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins view all users" ON users FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));
CREATE POLICY "Admins update users" ON users FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));

-- ROOMS: All authenticated users can read (tenants need to see room details)
CREATE POLICY "Auth read rooms" ON rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins edit rooms" ON rooms FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));

-- TENANTS: Tenants see themselves, Admins see all
CREATE POLICY "Tenants read self" ON tenants FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read all tenants" ON tenants FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager', 'receptionist', 'caretaker')));
CREATE POLICY "Admins edit tenants" ON tenants FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));

-- PAYMENTS: Tenants see their own, Admins see all
CREATE POLICY "Tenants read own payments" ON payments FOR SELECT TO authenticated USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()));
CREATE POLICY "Admins read all payments" ON payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager', 'receptionist', 'caretaker')));
CREATE POLICY "Admins edit payments" ON payments FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager', 'receptionist')));

-- INVITES: Public read/update allowed for signup flows
CREATE POLICY "Public read invites" ON user_invites FOR SELECT USING (true);
CREATE POLICY "Public update invites" ON user_invites FOR UPDATE USING (true);
CREATE POLICY "Admins manage invites" ON user_invites FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));

-- KYCS: Users see their own, Admins see all
CREATE POLICY "Users read own kyc" ON kycs FOR SELECT TO authenticated USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()) OR employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));
CREATE POLICY "Admins manage kyc" ON kycs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager', 'receptionist')));

-- COMPLAINTS
CREATE POLICY "Users read own complaints" ON complaints FOR SELECT TO authenticated USING (tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid()) OR assigned_to = auth.uid());
CREATE POLICY "Admins manage complaints" ON complaints FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager', 'caretaker')));

-- ANNOUNCEMENTS
CREATE POLICY "Users view announcements" ON announcements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage announcements" ON announcements FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));

-- EMPLOYEES
CREATE POLICY "Employees view own" ON employees FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins manage employees" ON employees FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));

-- PG CONFIGS
CREATE POLICY "Auth view config" ON pg_configs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage config" ON pg_configs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('super', 'admin', 'manager')));


-- ==========================================
-- 4. SEED DATA FOR PAGINATION TESTING
-- ==========================================

-- Generate 1 Core Subscription Plan
INSERT INTO subscription_plans (id, name, price, annual_price, max_tenants, max_rooms)
VALUES ('00000000-0000-0000-0000-000000000001', 'Premium Plan', 999, 9999, 500, 200)
ON CONFLICT DO NOTHING;

-- Generate 1 Branch
INSERT INTO pg_branches (id, name, branch_name, address, phone, plan_id)
VALUES ('00000000-0000-0000-0000-000000000002', 'Elite PG', 'Main Branch', '123 Test Ave', '9999999999', '00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Seed 25 Dummy Rooms
DO $$
DECLARE
    i INT;
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

-- Seed 25 Dummy Tenants tied to the rooms + 25 Corresponding Payments
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
            'Test Tenant ' || i, 
            'tenant' || i || '@test.com', 
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
