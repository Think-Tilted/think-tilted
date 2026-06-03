import type { SupabaseClient } from "@supabase/supabase-js";

// Data access for the back-office CRM (migrations 0002 + 0003). Reads and
// writes here run under RLS: leads accept anon inserts; everything else is
// admin-only. Each helper throws on error so callers can surface one message.
//
// The data forms a chain: a lead converts into a client, a client has
// projects, and any of the three can carry an append-only activity log.


// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------

export const LEAD_STATUSES = ["new", "contacted", "proposal", "won", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface Lead {
  id: string;
  name: string;
  email: string;
  project_type: string;
  message: string;
  status: LeadStatus;
  converted_client_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeadInput {
  name: string;
  email: string;
  project_type: string;
  message: string;
}

/** Submit an inquiry from the public contact form (anon insert). */

export async function submitLead(supabase: SupabaseClient, input: LeadInput): Promise<void> {
  const { error } = await supabase.from("leads").insert(input);
  if (error) throw new Error(`Could not send your message: ${error.message}`);
}

/** All leads, newest first. Admin only. */
export async function listLeads(supabase: SupabaseClient): Promise<Lead[]> {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load leads: ${error.message}`);
  return (data ?? []) as Lead[];
}

/** A single lead by id, or null if it doesn't exist. Admin only. */
export async function getLead(supabase: SupabaseClient, id: string): Promise<Lead | null> {
  const { data, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load lead: ${error.message}`);
  return (data as Lead) ?? null;
}

/** Projects that originated from a given lead. Admin only. */
export async function listProjectsForLead(
  supabase: SupabaseClient,
  leadId: string,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load lead's projects: ${error.message}`);
  return (data ?? []) as Project[];
}


/** Move a lead along the pipeline. Admin only. */
export async function setLeadStatus(
  supabase: SupabaseClient,
  id: string,
  status: LeadStatus,
): Promise<void> {
  const { error } = await supabase.from("leads").update({ status }).eq("id", id);
  if (error) throw new Error(`Failed to update lead: ${error.message}`);
}

/**
 * Turn a lead into a client: create the client from the lead's details, stamp
 * the lead with the new client id, and mark it won. Returns the new client id
 * so the caller can redirect to it. Admin only.
 */
export async function convertLeadToClient(
  supabase: SupabaseClient,
  lead: Lead,
): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .insert({ name: lead.name, contact_email: lead.email, notes: lead.message })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to convert lead: ${error.message}`);

  const clientId = (data as { id: string }).id;
  const { error: stampError } = await supabase
    .from("leads")
    .update({ converted_client_id: clientId, status: "won" })
    .eq("id", lead.id);
  if (stampError) throw new Error(`Client created but lead not linked: ${stampError.message}`);

  return clientId;
}


// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------

export interface Client {
  id: string;
  name: string;
  contact_email: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ClientInput {
  name: string;
  contact_email: string;
  notes: string;
}

/** All clients, alphabetical. Admin only. */
export async function listClients(supabase: SupabaseClient): Promise<Client[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(`Failed to load clients: ${error.message}`);
  return (data ?? []) as Client[];
}

/** A single client by id, or null if it doesn't exist. Admin only. */
export async function getClient(supabase: SupabaseClient, id: string): Promise<Client | null> {
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load client: ${error.message}`);
  return (data as Client) ?? null;
}

/** Create a client. Admin only. */
export async function createClient(supabase: SupabaseClient, input: ClientInput): Promise<void> {
  const { error } = await supabase.from("clients").insert(input);
  if (error) throw new Error(`Failed to add client: ${error.message}`);
}

/** Update a client's editable fields. Admin only. */
export async function updateClient(
  supabase: SupabaseClient,
  id: string,
  input: ClientInput,
): Promise<void> {
  const { error } = await supabase.from("clients").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update client: ${error.message}`);
}

/** Delete a client (their projects' client_id is nulled, not deleted). Admin only. */
export async function deleteClient(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(`Failed to remove client: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const PROJECT_STATUSES = ["lead", "building", "live", "archived"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface Project {
  id: string;
  client_id: string | null;
  lead_id: string | null;
  name: string;
  tier: 1 | 2;
  status: ProjectStatus;
  build_price: number | null;
  care_plan: string;
  repo_url: string;
  site_url: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  client_id: string | null;
  lead_id: string | null;
  name: string;
  tier: 1 | 2;
  status: ProjectStatus;
  build_price: number | null;
  care_plan: string;
  repo_url: string;
  site_url: string;
}


/** All projects, newest first. Admin only. */
export async function listProjects(supabase: SupabaseClient): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load projects: ${error.message}`);
  return (data ?? []) as Project[];
}

/** A single project by id, or null if it doesn't exist. Admin only. */
export async function getProject(supabase: SupabaseClient, id: string): Promise<Project | null> {
  const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load project: ${error.message}`);
  return (data as Project) ?? null;
}

/** Projects belonging to a given client, newest first. Admin only. */
export async function listProjectsForClient(
  supabase: SupabaseClient,
  clientId: string,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load client's projects: ${error.message}`);
  return (data ?? []) as Project[];
}

/** Create a project. Admin only. */
export async function createProject(supabase: SupabaseClient, input: ProjectInput): Promise<void> {
  const { error } = await supabase.from("projects").insert(input);
  if (error) throw new Error(`Failed to add project: ${error.message}`);
}


/** Move a project to a new status. Admin only. */
export async function setProjectStatus(
  supabase: SupabaseClient,
  id: string,
  status: ProjectStatus,
): Promise<void> {
  const { error } = await supabase.from("projects").update({ status }).eq("id", id);
  if (error) throw new Error(`Failed to update project: ${error.message}`);
}

/** Update a project's editable fields. Admin only. */
export async function updateProject(
  supabase: SupabaseClient,
  id: string,
  input: ProjectInput,
): Promise<void> {
  const { error } = await supabase.from("projects").update(input).eq("id", id);
  if (error) throw new Error(`Failed to update project: ${error.message}`);
}

/** Delete a project. Admin only. */
export async function deleteProject(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);
  if (error) throw new Error(`Failed to remove project: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Activity log (notes)
// ---------------------------------------------------------------------------

export const NOTE_ENTITIES = ["lead", "client", "project"] as const;
export type NoteEntity = (typeof NOTE_ENTITIES)[number];

export interface Note {
  id: string;
  entity_type: NoteEntity;
  entity_id: string;
  body: string;
  created_at: string;
}

/** The activity log for one entity, newest first. Admin only. */
export async function listNotes(
  supabase: SupabaseClient,
  entityType: NoteEntity,
  entityId: string,
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Failed to load activity: ${error.message}`);
  return (data ?? []) as Note[];
}

/** Append a note to an entity's activity log. Admin only. */
export async function addNote(
  supabase: SupabaseClient,
  entityType: NoteEntity,
  entityId: string,
  body: string,
): Promise<void> {
  const { error } = await supabase
    .from("notes")
    .insert({ entity_type: entityType, entity_id: entityId, body });
  if (error) throw new Error(`Failed to add note: ${error.message}`);
}

/** Remove a single note from the log. Admin only. */
export async function deleteNote(supabase: SupabaseClient, id: string): Promise<void> {
  const { error } = await supabase.from("notes").delete().eq("id", id);
  if (error) throw new Error(`Failed to remove note: ${error.message}`);
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** Human label for a contact-form project_type value. */
const PROJECT_TYPE_LABELS: Record<string, string> = {
  brand: "Brand identity",
  web: "Website",
  both: "Brand + website",
  other: "Something else",
};

export function projectTypeLabel(value: string): string {
  return PROJECT_TYPE_LABELS[value] ?? value;
}

/** Whole-dollar currency, or an em dash when unset. */
export function formatPrice(amount: number | null): string {
  if (amount == null) return "—";
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/** "Mar 4, 2026" from an ISO timestamp. */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Mar 4, 2026, 2:15 PM" from an ISO timestamp — for activity entries. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
