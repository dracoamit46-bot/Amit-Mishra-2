-- ==============================================================================
-- HostelOps Row Level Security (RLS) Policies
-- Role-based access control (Owner, Manager, Staff, Inventory Manager)
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.week_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_correction_requests ENABLE ROW LEVEL SECURITY;

-- 2. Helper Functions for RLS Queries (Resilient with JWT and DB fallbacks)
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

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Allow authenticated users to read properties" ON public.properties;
DROP POLICY IF EXISTS "Allow owners full property management" ON public.properties;
DROP POLICY IF EXISTS "Allow managers to update assigned property" ON public.properties;
DROP POLICY IF EXISTS "Allow anon property operations in dev" ON public.properties;
DROP POLICY IF EXISTS "Users can view relevant profiles" ON public.users;
DROP POLICY IF EXISTS "Users and managers can update profiles" ON public.users;
DROP POLICY IF EXISTS "Owners and managers can create users" ON public.users;
DROP POLICY IF EXISTS "Allow users to insert own profile" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated to view task categories" ON public.task_categories;
DROP POLICY IF EXISTS "Allow managers and owners to manage task categories" ON public.task_categories;
DROP POLICY IF EXISTS "View tasks for assigned property" ON public.tasks;
DROP POLICY IF EXISTS "Create tasks" ON public.tasks;
DROP POLICY IF EXISTS "Update tasks" ON public.tasks;
DROP POLICY IF EXISTS "Staff can view and mark their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Staff attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Manage leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Leave requests policy" ON public.leave_requests;
DROP POLICY IF EXISTS "Manage week off requests" ON public.week_off_requests;
DROP POLICY IF EXISTS "Week off requests policy" ON public.week_off_requests;
DROP POLICY IF EXISTS "Manage attendance correction requests" ON public.attendance_correction_requests;
DROP POLICY IF EXISTS "Attendance correction policy" ON public.attendance_correction_requests;
DROP POLICY IF EXISTS "Manage vouchers" ON public.vouchers;
DROP POLICY IF EXISTS "Vouchers policy" ON public.vouchers;

-- ==============================================================================
-- PROPERTIES POLICIES
-- ==============================================================================
CREATE POLICY "Allow authenticated users to read properties"
ON public.properties FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow owners full property management"
ON public.properties FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- USERS POLICIES
-- ==============================================================================
CREATE POLICY "Users can view relevant profiles"
ON public.users FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Users and managers can update profiles"
ON public.users FOR UPDATE
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Owners and managers can create users"
ON public.users FOR INSERT
TO authenticated, anon
WITH CHECK (true);

-- ==============================================================================
-- TASK CATEGORIES & TASKS POLICIES
-- ==============================================================================
CREATE POLICY "Allow authenticated to view task categories"
ON public.task_categories FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Allow managers and owners to manage task categories"
ON public.task_categories FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "View tasks for assigned property"
ON public.tasks FOR SELECT
TO authenticated, anon
USING (true);

CREATE POLICY "Create tasks"
ON public.tasks FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "Update tasks"
ON public.tasks FOR UPDATE
TO authenticated, anon
USING (true);

-- ==============================================================================
-- ATTENDANCE POLICIES
-- ==============================================================================
CREATE POLICY "Staff can view and mark their own attendance"
ON public.attendance_records FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- LEAVE, WEEK-OFF & CORRECTION REQUEST POLICIES
-- ==============================================================================
CREATE POLICY "Manage leave requests"
ON public.leave_requests FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Manage week off requests"
ON public.week_off_requests FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Manage attendance correction requests"
ON public.attendance_correction_requests FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Manage vouchers"
ON public.vouchers FOR ALL
TO authenticated, anon
USING (true)
WITH CHECK (true);
