-- ============================================================
-- GYMOS: Add user role script
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Show all registered users (to find your UUID)
SELECT id, email, created_at FROM auth.users ORDER BY created_at;

-- ============================================================
-- 2. Insert your user as admin
--    Replace 'your-email@example.com' with your actual email
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify the role was added
SELECT * FROM public.user_roles;
