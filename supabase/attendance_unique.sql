-- Create attendance table + uniqueness constraint (TOCTOU race condition fix)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in_time TIME NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.attendance
ADD CONSTRAINT unique_member_checkin UNIQUE (member_id, check_in_date);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff read attendance" ON public.attendance
  FOR SELECT USING (is_staff());

CREATE POLICY "Staff insert attendance" ON public.attendance
  FOR INSERT WITH CHECK (is_staff());
