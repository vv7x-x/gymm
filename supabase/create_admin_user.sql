-- ============================================================
-- GYMOS: Create admin user with password + role
-- Run this ONCE in Supabase SQL Editor
-- غير الإيميل والباسورد قبل التشغيل
-- ============================================================

-- 1. Create user in auth.users (confirmed + active)
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, confirmation_sent_at,
  raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token,
  email_change, email_change_token_new, recovery_token
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@gymos.com',                                        -- ★ غيّر الإيميل
  crypt('Admin@123456', gen_salt('bf')),                    -- ★ غيّر الباسورد
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Admin"}',
  now(),
  now(),
  '', '', '', ''
);

-- 2. Assign admin role
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin@gymos.com'                             -- ★ نفس الإيميل أعلاه
ON CONFLICT (user_id) DO NOTHING;

-- 3. Confirm everything
SELECT u.id, u.email, r.role, u.created_at
FROM auth.users u
LEFT JOIN public.user_roles r ON r.user_id = u.id
WHERE u.email = 'admin@gymos.com';                          -- ★ نفس الإيميل أعلاه
