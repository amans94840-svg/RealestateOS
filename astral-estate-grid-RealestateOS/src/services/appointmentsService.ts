import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { AppointmentRow } from "@/types/appointment";

export type FetchAppointmentsResult = {
  data: AppointmentRow[];
  error: string | null;
};

function normalizeAppointmentRows(data: unknown): AppointmentRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as AppointmentRow[];
  if (typeof data === "object") return [data as AppointmentRow];
  return [];
}

export async function fetchAppointments(workspaceId?: string): Promise<AppointmentRow[]> {
  const result = await fetchAppointmentsWithMeta(workspaceId);
  return result.data;
}

export async function fetchAppointmentsWithMeta(workspaceId?: string): Promise<FetchAppointmentsResult> {
  if (!workspaceId) return { data: [], error: "workspace_id is missing" };
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase is not configured" };
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb
      .from("appointments")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[appointmentsService] fetch error", error);
      return { data: [], error: error.message };
    }
    return { data: normalizeAppointmentRows(data), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[appointmentsService] unexpected", e);
    return { data: [], error: msg };
  }
}

export async function createAppointment(workspaceId: string | undefined, a: Partial<AppointmentRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("appointments").insert({ workspace_id: workspaceId, ...a }).select();
    if (error) throw error;
    return normalizeAppointmentRows(data)[0] ?? null;
  } catch (e) {
    console.error("[appointmentsService] create error", e);
    throw e;
  }
}

export async function updateAppointment(id: string, updates: Partial<AppointmentRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("appointments").update(updates).eq("id", id).select();
    if (error) throw error;
    return normalizeAppointmentRows(data)[0] ?? null;
  } catch (e) {
    console.error("[appointmentsService] update error", e);
    throw e;
  }
}

export async function deleteAppointment(id: string) {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const sb = getSupabase()!;
    const { error } = await sb.from("appointments").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[appointmentsService] delete error", e);
    throw e;
  }
}

export function subscribeToAppointmentUpdates(workspaceId: string | undefined, cb: (payload: unknown) => void) {
  if (!isSupabaseConfigured() || !workspaceId) {
    return () => {};
  }
  const sb = getSupabase()!;
  const chan = sb.channel(`public:appointments:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "appointments", filter: `workspace_id=eq.${workspaceId}` },
    (payload) => cb(payload),
  );
  void chan.subscribe();
  return () => void chan.unsubscribe();
}

