-- ==============================================================================
-- HostelOps Robust Clean Supabase Migration (Idempotent & Error-Free)
-- Run this in Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. TABLES
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    geofence_radius_m INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'inventory_manager', 'staff')),
    property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
    staff_type TEXT,
    shift_start TEXT,
    shift_end TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.task_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.task_categories(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    photo_url TEXT,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'pending_approval', 'approved', 'completed', 'rejected', 'open', 'claimed', 'settled')),
    last_action_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    last_action_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('no_payment', 'petty_cash', 'head_office', 'cash', 'online', 'unpaid')),
    amount NUMERIC(10, 2),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in_time TEXT,
    clock_in_selfie_url TEXT,
    clock_in_lat DOUBLE PRECISION,
    clock_in_lng DOUBLE PRECISION,
    clock_out_time TEXT,
    clock_out_selfie_url TEXT,
    status TEXT CHECK (status IS NULL OR status IN ('shift_completed', 'week_off', 'on_leave', 'absent', 'present', 'half_day', 'late')),
    marked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_attendance_user_date UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS public.week_off_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    requested_dates TEXT[] NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('casual', 'sick')),
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.attendance_correction_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);
CREATE INDEX IF NOT EXISTS idx_users_property_id ON public.users(property_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_tasks_property_id ON public.tasks(property_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON public.attendance_records(user_id, date);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    (auth.jwt() -> 'user_metadata' ->> 'role'),
    (auth.jwt() -> 'app_metadata' ->> 'role'),
    CASE WHEN auth.role() = 'anon' THEN 'anon' ELSE 'authenticated' END
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.current_user_property()
RETURNS UUID AS $$
  SELECT COALESCE(
    (SELECT property_id FROM public.users WHERE id = auth.uid()),
    NULLIF(auth.jwt() -> 'user_metadata' ->> 'property_id', '')::UUID,
    NULLIF(auth.jwt() -> 'app_metadata' ->> 'property_id', '')::UUID
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Drop all existing policies cleanly
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Create Policies
CREATE POLICY "properties_read_all"
ON public.properties FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "properties_modify_all"
ON public.properties FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "users_read_all"
ON public.users FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "users_insert_all"
ON public.users FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "users_update_all"
ON public.users FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "task_categories_read_all"
ON public.task_categories FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "task_categories_modify_all"
ON public.task_categories FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "tasks_read_all"
ON public.tasks FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "tasks_insert_all"
ON public.tasks FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "tasks_update_all"
ON public.tasks FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "vouchers_all"
ON public.vouchers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "attendance_records_all"
ON public.attendance_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "leave_requests_all"
ON public.leave_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "week_off_requests_all"
ON public.week_off_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

CREATE POLICY "attendance_correction_all"
ON public.attendance_correction_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);
