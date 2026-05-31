import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";

export async function fetchAiInsights(workspaceId?: string) {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("ai_insights").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) {
      console.error("[aiInsightsService] fetch error", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("[aiInsightsService] unexpected", e);
    return [];
  }
}

