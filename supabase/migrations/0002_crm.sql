-- Phase 1 back-office CRM for running the agency itself (not website content).
-- Three tables — leads, clients, projects — all gated by the admin allowlist
-- established in 0001 (public.admins + public.is_admin()).
--
-- Access model:
--   * leads     : anon may INSERT (the public /contact form). Admin reads/edits.
--   * clients   : admin only.
--   * projects  : admin only.
-- Nothing here is publicly readable — this is internal business data.

-- ---------------------------------------------------------------------------
-- Leads — inbound inquiries from the contact form
-- ---------------------------------------------------------------------------
create table if not exists public.leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  project_type text not null default 'other',
  message      text not null default '',
  -- new -> contacted -> proposal -> won | lost
  status       text not null default 'new'
                 check (status in ('new', 'contacted', 'proposal', 'won', 'lost')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.leads is
  'Inbound contact-form inquiries. Anon insert; admin read/manage.';

-- ---------------------------------------------------------------------------
-- Clients — people/businesses we work with
-- ---------------------------------------------------------------------------
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  contact_email text not null default '',
  notes         text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.clients is 'Agency clients. Admin only.';

-- ---------------------------------------------------------------------------
-- Projects — a piece of work for a client (maps to a built site)
-- ---------------------------------------------------------------------------
create table if not exists public.projects (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid references public.clients(id) on delete set null,
  name         text not null,
  tier         smallint not null default 1 check (tier in (1, 2)),
  -- lead -> building -> live -> archived
  status       text not null default 'building'
                 check (status in ('lead', 'building', 'live', 'archived')),
  build_price  numeric(10, 2),
  care_plan    text not null default '',
  repo_url     text not null default '',
  site_url     text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.projects is 'Client projects / built sites. Admin only.';

-- ---------------------------------------------------------------------------
-- updated_at triggers (set_updated_at() defined in 0001)
-- ---------------------------------------------------------------------------
create trigger leads_set_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

create trigger clients_set_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.leads    enable row level security;
alter table public.clients  enable row level security;
alter table public.projects enable row level security;

-- Leads: the public contact form (anon) may submit; only admins may read/manage.
create policy "anon_submit_lead" on public.leads
  for insert to anon, authenticated
  with check (true);

create policy "admin_manage_leads" on public.leads
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Clients & projects: admin only, full stop.
create policy "admin_manage_clients" on public.clients
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_manage_projects" on public.projects
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
