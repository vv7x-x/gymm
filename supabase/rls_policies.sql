-- ============================================================
-- GYMOS Row Level Security (RLS) Policies
-- Apply these in your Supabase SQL Editor
-- ============================================================
-- Assumes a `user_roles` table: (id, user_id, role text CHECK(role IN ('admin','staff')))
-- and that admin/staff users exist in `auth.users`.
-- ============================================================

-- 0. SECURITY DEFINER helper functions (break RLS recursion)
-- Must be created BEFORE policies that reference them

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'staff')
  );
$$;

-- 1. Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Drop old policies first if re-running
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users read own role" ON public.user_roles;

-- Only admins can manage roles (uses SECURITY DEFINER function → no recursion)
CREATE POLICY "Admins manage roles"
  ON public.user_roles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Users can read their own role
CREATE POLICY "Users read own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================
-- Business table policies
-- ============================================================

-- members: staff/admin can read all; only admins can insert/update/delete
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read members" ON public.members;
DROP POLICY IF EXISTS "Admin insert members" ON public.members;
DROP POLICY IF EXISTS "Admin update members" ON public.members;
DROP POLICY IF EXISTS "Admin delete members" ON public.members;
CREATE POLICY "Staff read members" ON public.members FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert members" ON public.members FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update members" ON public.members FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete members" ON public.members FOR DELETE USING (is_admin());

-- subscriptions
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin insert subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admin delete subscriptions" ON public.subscriptions;
CREATE POLICY "Staff read subscriptions" ON public.subscriptions FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert subscriptions" ON public.subscriptions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update subscriptions" ON public.subscriptions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete subscriptions" ON public.subscriptions FOR DELETE USING (is_admin());

-- payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read payments" ON public.payments;
DROP POLICY IF EXISTS "Admin insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admin update payments" ON public.payments;
DROP POLICY IF EXISTS "Admin delete payments" ON public.payments;
CREATE POLICY "Staff read payments" ON public.payments FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert payments" ON public.payments FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update payments" ON public.payments FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete payments" ON public.payments FOR DELETE USING (is_admin());

-- plans
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read plans" ON public.plans;
DROP POLICY IF EXISTS "Admin insert plans" ON public.plans;
DROP POLICY IF EXISTS "Admin update plans" ON public.plans;
DROP POLICY IF EXISTS "Admin delete plans" ON public.plans;
CREATE POLICY "Staff read plans" ON public.plans FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert plans" ON public.plans FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update plans" ON public.plans FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete plans" ON public.plans FOR DELETE USING (is_admin());

-- services
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read services" ON public.services;
DROP POLICY IF EXISTS "Admin insert services" ON public.services;
DROP POLICY IF EXISTS "Admin update services" ON public.services;
DROP POLICY IF EXISTS "Admin delete services" ON public.services;
CREATE POLICY "Staff read services" ON public.services FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert services" ON public.services FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update services" ON public.services FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete services" ON public.services FOR DELETE USING (is_admin());

-- branches
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read branches" ON public.branches;
DROP POLICY IF EXISTS "Admin insert branches" ON public.branches;
DROP POLICY IF EXISTS "Admin update branches" ON public.branches;
DROP POLICY IF EXISTS "Admin delete branches" ON public.branches;
CREATE POLICY "Staff read branches" ON public.branches FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert branches" ON public.branches FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update branches" ON public.branches FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete branches" ON public.branches FOR DELETE USING (is_admin());

-- expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Admin delete expenses" ON public.expenses;
CREATE POLICY "Staff read expenses" ON public.expenses FOR SELECT USING (is_staff());
CREATE POLICY "Admin insert expenses" ON public.expenses FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin update expenses" ON public.expenses FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin delete expenses" ON public.expenses FOR DELETE USING (is_admin());

-- expense_categories
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Admin manage categories" ON public.expense_categories;
CREATE POLICY "Staff read categories" ON public.expense_categories FOR SELECT USING (is_staff());
CREATE POLICY "Admin manage categories" ON public.expense_categories FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff insert attendance" ON public.attendance;
CREATE POLICY "Anyone read attendance" ON public.attendance FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Anyone can check in" ON public.attendance FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Anyone delete attendance" ON public.attendance FOR DELETE USING (auth.role() = 'authenticated');

-- settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read settings" ON public.settings;
DROP POLICY IF EXISTS "Admin manage settings" ON public.settings;
CREATE POLICY "Anyone read settings" ON public.settings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin manage settings" ON public.settings FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- service_assignments
ALTER TABLE public.service_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read assignments" ON public.service_assignments;
DROP POLICY IF EXISTS "Admin manage assignments" ON public.service_assignments;
CREATE POLICY "Staff read assignments" ON public.service_assignments FOR SELECT USING (is_staff());
CREATE POLICY "Admin manage assignments" ON public.service_assignments FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- freeze_logs
ALTER TABLE public.freeze_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff read freeze_logs" ON public.freeze_logs;
DROP POLICY IF EXISTS "Admin manage freeze_logs" ON public.freeze_logs;
CREATE POLICY "Staff read freeze_logs" ON public.freeze_logs FOR SELECT USING (is_staff());
CREATE POLICY "Admin manage freeze_logs" ON public.freeze_logs FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- ============================================================
-- Storage bucket policy (member-photos)
-- ============================================================
-- In Supabase Dashboard > Storage > member-photos > Policies:
-- SELECT: true (avatars are public)
-- INSERT: authenticated AND (bucket_id = 'member-photos')
-- UPDATE: authenticated AND (bucket_id = 'member-photos')
-- DELETE: authenticated AND (bucket_id = 'member-photos')
-- For stricter control, limit to admin:
-- INSERT: (auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'admin'))
