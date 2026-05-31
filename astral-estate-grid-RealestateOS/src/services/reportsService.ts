import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { ReportRow } from "@/types/report";

export async function fetchReports(workspaceId?: string): Promise<ReportRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("reports").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) {
      console.error("[reportsService] fetch error", error);
      return [];
    }
    return (data ?? []) as ReportRow[];
  } catch (e) {
    console.error("[reportsService] unexpected", e);
    return [];
  }
}

export async function createReport(workspaceId: string | undefined, r: Partial<ReportRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("reports").insert({ workspace_id: workspaceId, ...r }).select().maybeSingle();
    if (error) throw error;
    return data as ReportRow;
  } catch (e) {
    console.error("[reportsService] create error", e);
    throw e;
  }
}

export async function updateReport(id: string, updates: Partial<ReportRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("reports").update(updates).eq("id", id).select().maybeSingle();
    if (error) throw error;
    return data as ReportRow;
  } catch (e) {
    console.error("[reportsService] update error", e);
    throw e;
  }
}

export async function deleteReport(id: string) {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const sb = getSupabase()!;
    const { error } = await sb.from("reports").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[reportsService] delete error", e);
    throw e;
  }
}

export function subscribeToReportUpdates(workspaceId: string | undefined, cb: (payload: any) => void) {
  if (!isSupabaseConfigured()) {
    const id = setInterval(() => {}, 60000);
    return () => clearInterval(id);
  }
  const sb = getSupabase()!;
  const chan = sb.channel(`public:reports:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "reports", filter: `workspace_id=eq.${workspaceId}` },
    (payload) => cb(payload),
  );
  void chan.subscribe();
  return () => void chan.unsubscribe();
}

