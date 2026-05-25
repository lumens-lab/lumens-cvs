-- Extend profiles
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists cover_url text;
create unique index if not exists profiles_username_key on public.profiles ((lower(username))) where username is not null;
create index if not exists profiles_display_name_idx on public.profiles ((lower(display_name)));

-- Allow authenticated users to search/view profiles of other users (name, username, avatar only — RLS keeps emails private via separate select policy)
drop policy if exists "Users view own profile" on public.profiles;
create policy "Authenticated read profiles" on public.profiles for select to authenticated using (true);
create policy "Users view own profile" on public.profiles for select to authenticated using (auth.uid() = id);

-- Cards
create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holder text not null,
  last4 text not null,
  num_enc text,
  exp text not null,
  theme int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cards enable row level security;
create policy "cards owner all" on public.cards for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger cards_touch before update on public.cards for each row execute function public.touch_updated_at();

-- Accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  number_mask text,
  icon text,
  color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
create policy "accounts owner all" on public.accounts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger accounts_touch before update on public.accounts for each row execute function public.touch_updated_at();

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  slug text not null,
  name text not null,
  icon text not null default 'Tag',
  color text not null default '#5eead4',
  budget numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind, slug)
);
alter table public.categories enable row level security;
create policy "cats owner all" on public.categories for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger cats_touch before update on public.categories for each row execute function public.touch_updated_at();

-- Transactions
create table if not exists public.txs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  cat text not null,
  icon text not null default 'Tag',
  ibg text,
  ic text,
  date date not null,
  amt numeric not null,
  merchant text,
  note text,
  receipt text,
  items jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.txs enable row level security;
create policy "txs owner all" on public.txs for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger txs_touch before update on public.txs for each row execute function public.touch_updated_at();
create index if not exists txs_user_date_idx on public.txs (user_id, date desc);

-- Budgets
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null,
  total numeric not null,
  period text not null default 'month',
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key)
);
alter table public.budgets enable row level security;
create policy "budgets owner all" on public.budgets for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger budgets_touch before update on public.budgets for each row execute function public.touch_updated_at();

-- Contacts
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact_user_id uuid references auth.users(id) on delete set null,
  name text not null,
  phone text,
  email text,
  username text,
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.contacts enable row level security;
create policy "contacts owner all" on public.contacts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create trigger contacts_touch before update on public.contacts for each row execute function public.touch_updated_at();

-- Conversations (two-party for now)
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  last_preview text,
  last_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_a, user_b)
);
alter table public.conversations enable row level security;
create policy "conv participants read" on public.conversations for select to authenticated using (auth.uid() in (user_a, user_b));
create policy "conv participants write" on public.conversations for all to authenticated using (auth.uid() in (user_a, user_b)) with check (auth.uid() in (user_a, user_b));

-- Messages (E2EE: server stores ciphertext only)
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  ciphertext text not null,
  nonce text not null,
  kind text not null default 'text',
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "msg party read" on public.messages for select to authenticated using (auth.uid() in (sender_id, recipient_id));
create policy "msg sender insert" on public.messages for insert to authenticated with check (auth.uid() = sender_id);
create index if not exists messages_conv_idx on public.messages (conversation_id, created_at);

-- Calls (encrypted voice calls — signaling/metadata only)
create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  caller_id uuid not null references auth.users(id) on delete cascade,
  callee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'ringing' check (status in ('ringing','accepted','rejected','ended','missed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds int default 0
);
alter table public.calls enable row level security;
create policy "calls party read" on public.calls for select to authenticated using (auth.uid() in (caller_id, callee_id));
create policy "calls party write" on public.calls for all to authenticated using (auth.uid() in (caller_id, callee_id)) with check (auth.uid() in (caller_id, callee_id));

-- Backfill: auto-add username (from email local-part) on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    lower(split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();