import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { LeadRow } from "@/types/lead";

export type FetchLeadsResult = {
  data: LeadRow[];
  error: string | null;
  count: number;
};

/** PostgREST returns an array; coerce a single object to a one-element array. */
export function normalizeLeadRows(data: unknown): LeadRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as LeadRow[];
  if (typeof data === "object") return [data as LeadRow];
  return [];
}

export async function fetchLeads(workspaceId?: string): Promise<LeadRow[]> {
  const result = await fetchLeadsWithMeta(workspaceId);
  return result.data;
}

export async function fetchLeadsWithMeta(workspaceId?: string): Promise<FetchLeadsResult> {
  if (!workspaceId) {
    return { data: [], error: "workspace_id is missing", count: 0 };
  }
  if (!isSupabaseConfigured()) {
    return { data: [], error: "Supabase is not configured", count: 0 };
  }
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb
      .from("leads")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[leadsService] fetch error", error);
      return { data: [], error: error.message, count: 0 };
    }

    const rows = normalizeLeadRows(data);
    console.log("[leadsService] fetched", rows.length, "rows for workspace", workspaceId);
    return { data: rows, error: null, count: rows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[leadsService] unexpected", e);
    return { data: [], error: msg, count: 0 };
  }
}

export async function fetchProfileByUserId(userId: string): Promise<{
  workspace_id: string | null;
  error: string | null;
}> {
  if (!isSupabaseConfigured()) {
    return { workspace_id: null, error: "Supabase is not configured" };
  }
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) {
      console.error("[leadsService] profile fetch error", error);
      return { workspace_id: null, error: error.message };
    }
    const row = data as { workspace_id?: string | null } | null;
    return { workspace_id: row?.workspace_id ?? null, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { workspace_id: null, error: msg };
  }
}

export async function fetchWorkspaceIdFromMember(userId: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", userId);
    if (error || !data?.length) return null;
    const first = data[0] as { workspace_id?: string };
    return first?.workspace_id ?? null;
  } catch {
    return null;
  }
}

export async function createLead(workspaceId: string | undefined, lead: Partial<LeadRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const payload = { workspace_id: workspaceId, ...lead };
    const { data, error } = await sb.from("leads").insert(payload).select();
    if (error) throw error;
    const rows = normalizeLeadRows(data);
    return rows[0] ?? null;
  } catch (e) {
    console.error("[leadsService] create error", e);
    throw e;
  }
}

export async function updateLead(id: string, updates: Partial<LeadRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("leads").update(updates).eq("id", id).select();
    if (error) throw error;
    const rows = normalizeLeadRows(data);
    return rows[0] ?? null;
  } catch (e) {
    console.error("[leadsService] update error", e);
    throw e;
  }
}

export async function deleteLead(id: string) {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const sb = getSupabase()!;
    const { error } = await sb.from("leads").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[leadsService] delete error", e);
    throw e;
  }
}

export function subscribeToLeadUpdates(workspaceId: string | undefined, cb: (payload: unknown) => void) {
  if (!isSupabaseConfigured() || !workspaceId) {
    return () => {};
  }
  const sb = getSupabase()!;
  const chan = sb.channel(`public:leads:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "leads", filter: `workspace_id=eq.${workspaceId}` },
    (payload) => cb(payload),
  );
  void chan.subscribe();
  return () => {
    void chan.unsubscribe();
  };
}
