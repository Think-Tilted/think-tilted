-- Tier 2 schema: an `events` table (client-editable content) plus an `admins`
-- allowlist that gates writes. RLS is the real security boundary — see SECURITY.md.
--
-- Model:
--   * Anyone (anon) may READ this client's events  -> public /events page.
--   * Only ADMINS may INSERT/UPDATE/DELETE          -> /admin/events editor.
-- "Admin" = the caller's auth email is present in public.admins. Being merely
-- authenticated is NOT enough (authenticated != authorized).

-- ---------------------------------------------------------------------------
-- Admin allowlist
-- ---------------------------------------------------------------------------
-- One row per admin, keyed by the auth email. Seeded with the admin created by
-- the scaffold. RLS is enabled with NO policies, so this table is invisible to
-- the Data API (anon/authenticated cannot read or write it). The is_admin()
-- function below reads it via SECURITY DEFINER, bypassing that lockdown.
create table if not exists public.admins (
  email      text primary key,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

insert into public.admins (email) values ('trevadelman@gmail.com')
  on conflict (email) do nothing;

-- True when the current caller's auth email is in the admin allowlist.
-- SECURITY DEFINER so the lookup is not blocked by admins' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- ---------------------------------------------------------------------------
-- Events
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  client_id   text not null default 'think-tilted',
  title       text not null,
  event_date  date not null,
  description text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.events is
  'Client-editable content. Public read (this client); admin write.';

-- Keep updated_at honest on every write.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger events_set_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.events enable row level security;

-- Anyone may read this client's events.
create policy "anon_read_events" on public.events
  for select using (client_id = 'think-tilted');

-- Only admins may write, and only within this client's scope.
create policy "admin_write_events" on public.events
  for all to authenticated
  using (client_id = 'think-tilted' and public.is_admin())
  with check (client_id = 'think-tilted' and public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed data (so the page has something to show immediately)
-- ---------------------------------------------------------------------------
insert into public.events (title, event_date, description) values
  ('Welcome',        current_date + 14, 'Your first event — edit or delete it from /admin/events.'),
  ('Coming Soon',    current_date + 28, 'Replace this with real content.');
