import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { PropertyRow } from "@/types/property";

export type FetchPropertiesResult = {
  data: PropertyRow[];
  error: string | null;
};

function normalizePropertyRows(data: unknown): PropertyRow[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as PropertyRow[];
  if (typeof data === "object") return [data as PropertyRow];
  return [];
}

const OPTIONAL_COLUMNS = [
  "developer_name",
  "possession_status",
  "furnishing",
  "parking",
  "facing",
  "floor",
  "total_floors",
  "balconies",
  "maintenance_charges",
  "booking_amount",
  "payment_plan",
  "rental_yield",
  "roi_score",
  "appreciation_forecast",
  "ownership_type",
  "rera_status",
  "trust_score",
  "risk_level",
  "amenities",
  "nearby_places",
  "tags",
  "ai_investment_note",
] as const;

function getMissingColumn(message: string): string | null {
  const match =
    message.match(/Could not find the '([^']+)' column/i) ??
    message.match(/column \"?([a-zA-Z0-9_]+)\"? .*does not exist/i);
  return match?.[1] ?? null;
}

function omitColumn<T extends Record<string, unknown>>(input: T, column: string): T {
  const next = { ...input };
  delete next[column];
  return next;
}

async function writeWithMissingColumnFallback(
  operation: "insert" | "update",
  tablePayload: Record<string, unknown>,
  id?: string,
): Promise<PropertyRow | null> {
  // TODO: Add the optional columns listed in OPTIONAL_COLUMNS to public.properties
  // in Supabase. Until then, retry without missing columns so the UI does not crash.
  const sb = getSupabase()!;
  let payload = tablePayload;

  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt += 1) {
    const query =
      operation === "insert"
        ? sb.from("properties").insert(payload).select()
        : sb.from("properties").update(payload).eq("id", id!).select();

    const { data, error } = await query;
    if (!error) return normalizePropertyRows(data)[0] ?? null;

    const missing = getMissingColumn(error.message);
    if (!missing || !(OPTIONAL_COLUMNS as readonly string[]).includes(missing) || !(missing in payload)) {
      throw error;
    }

    console.warn(`[propertiesService] public.properties missing column '${missing}'. Retrying without it.`);
    payload = omitColumn(payload, missing);
  }

  return null;
}

export async function fetchProperties(workspaceId?: string): Promise<PropertyRow[]> {
  const result = await fetchPropertiesWithMeta(workspaceId);
  return result.data;
}

export async function fetchPropertiesWithMeta(workspaceId?: string): Promise<FetchPropertiesResult> {
  if (!workspaceId) return { data: [], error: "workspace_id is missing" };
  if (!isSupabaseConfigured()) return { data: [], error: "Supabase is not configured" };
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb
      .from("properties")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    if (error) {
      console.error("[propertiesService] fetch error", error);
      return { data: [], error: error.message };
    }
    return { data: normalizePropertyRows(data), error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[propertiesService] unexpected", e);
    return { data: [], error: msg };
  }
}

export async function createProperty(workspaceId: string | undefined, p: Partial<PropertyRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    return await writeWithMissingColumnFallback("insert", { workspace_id: workspaceId, ...p });
  } catch (e) {
    console.error("[propertiesService] create error", e);
    throw e;
  }
}

export async function updateProperty(id: string, updates: Partial<PropertyRow>) {
  if (!isSupabaseConfigured()) return null;
  try {
    return await writeWithMissingColumnFallback("update", updates as Record<string, unknown>, id);
  } catch (e) {
    console.error("[propertiesService] update error", e);
    throw e;
  }
}

export async function deleteProperty(id: string) {
  if (!isSupabaseConfigured()) return { ok: true };
  try {
    const sb = getSupabase()!;
    const { error } = await sb.from("properties").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (e) {
    console.error("[propertiesService] delete error", e);
    throw e;
  }
}

export function subscribeToPropertyUpdates(workspaceId: string | undefined, cb: (payload: unknown) => void) {
  if (!isSupabaseConfigured() || !workspaceId) {
    return () => {};
  }
  const sb = getSupabase()!;
  const chan = sb.channel(`public:properties:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "properties", filter: `workspace_id=eq.${workspaceId}` },
    (payload) => cb(payload),
  );
  void chan.subscribe();
  return () => void chan.unsubscribe();
}

