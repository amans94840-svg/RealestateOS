import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";

export async function fetchRevenueSummary(workspaceId?: string) {
  if (!isSupabaseConfigured()) return { totalRevenue: 0, predictedRevenue: 0 };
  try {
    const sb = getSupabase()!;
    // Placeholder: real logic aggregates deals
    const { data, error } = await sb.from("revenue").select("total_revenue, predicted_revenue").eq("workspace_id", workspaceId).limit(1).maybeSingle();
    if (error) {
      console.error("[revenueService] fetch error", error);
      return { totalRevenue: 0, predictedRevenue: 0 };
    }
    return { totalRevenue: data?.total_revenue ?? 0, predictedRevenue: data?.predicted_revenue ?? 0 };
  } catch (e) {
    console.error("[revenueService] unexpected", e);
    return { totalRevenue: 0, predictedRevenue: 0 };
  }
}

