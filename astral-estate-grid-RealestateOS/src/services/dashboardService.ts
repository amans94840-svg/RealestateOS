import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { DashboardMetricsRow } from "@/types/dashboard";

export async function fetchDashboardMetrics(workspaceId?: string, country?: string, duration?: string): Promise<DashboardMetricsRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const q = sb.from("dashboard_metrics").select("*").eq("workspace_id", workspaceId);
    if (country) q.eq("country", country);
    if (duration) q.eq("duration", duration);
    const { data, error } = await q.limit(1).maybeSingle();
    if (error) {
      console.error("[dashboardService] fetch error", error);
      return null;
    }
    return (data ?? null) as DashboardMetricsRow | null;
  } catch (e) {
    console.error("[dashboardService] unexpected", e);
    return null;
  }
}

export async function refreshDashboardMetrics(workspaceId?: string) {
  // TODO: implement server-side aggregation; for now fetch existing row
  return fetchDashboardMetrics(workspaceId);
}

export function subscribeToDashboardMetrics(workspaceId?: string, country?: string, duration?: string, cb?: (payload: any) => void) {
  if (!isSupabaseConfigured()) {
    const id = setInterval(() => {}, 60000);
    return () => clearInterval(id);
  }
  const sb = getSupabase()!;
  const filterParts = [`workspace_id=eq.${workspaceId}`];
  if (country) filterParts.push(`country=eq.${country}`);
  if (duration) filterParts.push(`duration=eq.${duration}`);
  const filter = filterParts.join(",");
  const chan = sb.channel(`public:dashboard_metrics:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "dashboard_metrics", filter },
    (payload) => cb?.(payload),
  );
  void chan.subscribe();
  return () => void chan.unsubscribe();
}

