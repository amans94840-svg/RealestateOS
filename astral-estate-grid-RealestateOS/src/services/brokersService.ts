import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { BrokerRow } from "@/types/broker";

export async function fetchBrokers(workspaceId?: string): Promise<BrokerRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("brokers").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) {
      console.error("[brokersService] fetch error", error);
      return [];
    }
    return (data ?? []) as BrokerRow[];
  } catch (e) {
    console.error("[brokersService] unexpected", e);
    return [];
  }
}

export async function createBroker(workspaceId: string | undefined, b: Partial<BrokerRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("brokers").insert({ workspace_id: workspaceId, ...b }).select().maybeSingle();
    if (error) throw error;
    return data as BrokerRow;
  } catch (e) {
    console.error("[brokersService] create error", e);
    throw e;
  }
}

export async function updateBroker(id: string, updates: Partial<BrokerRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("brokers").update(updates).eq("id", id).select().maybeSingle();
    if (error) throw error;
    return data as BrokerRow;
  } catch (e) {
    console.error("[brokersService] update error", e);
    throw e;
  }
}

export async function deleteBroker(id: string) {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const sb = getSupabase()!;
    const { error } = await sb.from("brokers").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[brokersService] delete error", e);
    throw e;
  }
}

export function subscribeToBrokerUpdates(workspaceId: string | undefined, cb: (payload: any) => void) {
  if (!isSupabaseConfigured()) {
    const id = setInterval(() => {}, 60000);
    return () => clearInterval(id);
  }
  const sb = getSupabase()!;
  const chan = sb.channel(`public:brokers:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "brokers", filter: `workspace_id=eq.${workspaceId}` },
    (payload) => cb(payload),
  );
  void chan.subscribe();
  return () => void chan.unsubscribe();
}

