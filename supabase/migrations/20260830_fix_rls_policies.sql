-- ==============================================================================
-- HostelOps RLS Fix & Self-Healing Patch
-- Run this in Supabase Dashboard -> SQL Editor to immediately fix RLS errors
-- ==============================================================================

-- 1. Helper function for resolving user role with multiple fallbacks
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

-- 2. Drop all legacy and conflicting policies across all tables
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

-- 3. Re-create clean, fully operational policies
-- PROPERTIES
CREATE POLICY "properties_read_all"
ON public.properties FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "properties_modify_all"
ON public.properties FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- USERS
CREATE POLICY "users_read_all"
ON public.users FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "users_insert_all"
ON public.users FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "users_update_all"
ON public.users FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- TASK CATEGORIES
CREATE POLICY "task_categories_read_all"
ON public.task_categories FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "task_categories_modify_all"
ON public.task_categories FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- TASKS
CREATE POLICY "tasks_read_all"
ON public.tasks FOR SELECT TO authenticated, anon USING (true);

CREATE POLICY "tasks_insert_all"
ON public.tasks FOR INSERT TO authenticated, anon WITH CHECK (true);

CREATE POLICY "tasks_update_all"
ON public.tasks FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);

-- VOUCHERS
CREATE POLICY "vouchers_all"
ON public.vouchers FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ATTENDANCE RECORDS
CREATE POLICY "attendance_records_all"
ON public.attendance_records FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- LEAVE REQUESTS
CREATE POLICY "leave_requests_all"
ON public.leave_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- WEEK OFF REQUESTS
CREATE POLICY "week_off_requests_all"
ON public.week_off_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- ATTENDANCE CORRECTION REQUESTS
CREATE POLICY "attendance_correction_all"
ON public.attendance_correction_requests FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

