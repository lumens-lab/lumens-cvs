CREATE TABLE public.waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  country text,
  note text,
  created_at timestamptz not null default now()
);
GRANT INSERT ON public.waitlist_signups TO anon, authenticated;
GRANT ALL ON public.waitlist_signups TO service_role;
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can join the waitlist" ON public.waitlist_signups FOR INSERT TO anon, authenticated WITH CHECK (
  length(trim(name)) between 1 and 100
  AND length(email) between 3 and 255
  AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND (phone IS NULL OR length(phone) <= 32)
  AND (country IS NULL OR length(country) <= 64)
  AND (note IS NULL OR length(note) <= 500)
);