import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";

export async function fetchForecasts(workspaceId?: string) {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("forecasts").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) {
      console.error("[forecastingService] fetch error", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("[forecastingService] unexpected", e);
    return [];
  }
}

