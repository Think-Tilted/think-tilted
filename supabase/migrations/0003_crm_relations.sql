-- Phase 1.1 — relationship plumbing for the back-office CRM.
-- Builds on 0002 (leads, clients, projects) to make the lead -> client ->
-- project chain explicit, and adds an append-only activity log.
--
-- Access model is unchanged: everything here is admin-only, gated by the
-- public.is_admin() allowlist from 0001. Nothing is publicly readable.

-- ---------------------------------------------------------------------------
-- Relationship columns
-- ---------------------------------------------------------------------------

-- Trace a project back to the client it belongs to is already covered by
-- projects.client_id (0002). Add the originating-lead trail in both directions.

alter table public.projects
  add column if not exists lead_id uuid references public.leads(id) on delete set null;

comment on column public.projects.lead_id is
  'The inbound lead this project originated from, if any.';

-- When a lead is converted into a client, stamp the resulting client so the
-- lead row can show "became Client X".
alter table public.leads
  add column if not exists converted_client_id uuid references public.clients(id) on delete set null;

comment on column public.leads.converted_client_id is
  'Set when a lead is converted into a client; links to that client.';

-- ---------------------------------------------------------------------------
-- Activity log — append-only timestamped notes attached to any CRM entity
-- ---------------------------------------------------------------------------
create table if not exists public.notes (
  id          uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('lead', 'client', 'project')),
  entity_id   uuid not null,
  body        text not null,
  created_at  timestamptz not null default now()
);

comment on table public.notes is
  'Append-only activity log. One row per logged note against a lead/client/project.';

-- Fast lookups of a single entity's timeline.
create index if not exists notes_entity_idx
  on public.notes (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security — admin only, same pattern as 0002
-- ---------------------------------------------------------------------------
alter table public.notes enable row level security;

create policy "admin_manage_notes" on public.notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
