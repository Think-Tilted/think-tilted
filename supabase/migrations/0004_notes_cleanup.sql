-- Phase 1.2 — keep the activity log from orphaning.
--
-- notes (0003) is a polymorphic log: it points at a lead/client/project by
-- (entity_type, entity_id) with no foreign key, so a normal ON DELETE CASCADE
-- isn't available. Instead, each parent table gets an AFTER DELETE trigger that
-- removes the notes belonging to the row that just went away.

-- ---------------------------------------------------------------------------
-- Trigger function — delete the departing row's notes
-- ---------------------------------------------------------------------------
-- TG_ARGV[0] carries the entity_type ('lead' | 'client' | 'project') so a
-- single function serves all three tables.
create or replace function public.delete_entity_notes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notes
  where entity_type = tg_argv[0]
    and entity_id = old.id;
  return old;
end;
$$;

comment on function public.delete_entity_notes is
  'AFTER DELETE trigger: clears the activity-log notes for the deleted entity.';

-- ---------------------------------------------------------------------------
-- Wire one trigger per parent table, passing its entity_type
-- ---------------------------------------------------------------------------
create trigger leads_delete_notes
  after delete on public.leads
  for each row execute function public.delete_entity_notes('lead');

create trigger clients_delete_notes
  after delete on public.clients
  for each row execute function public.delete_entity_notes('client');

create trigger projects_delete_notes
  after delete on public.projects
  for each row execute function public.delete_entity_notes('project');
