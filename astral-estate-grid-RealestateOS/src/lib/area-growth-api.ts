import { getSupabase, isSupabaseConfigured } from "./supabase-client";
import type { AreaGrowthRecord } from "./area-growth-model";
import { SEED_AREA_GROWTH } from "./area-growth-model";

/**
 * Backend-ready area growth helpers.
 *
 * Later connect these to Supabase tables and Supabase Realtime.
 */

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function clone(records: AreaGrowthRecord[]) {
  return records.map((record) => ({ ...record, dataSources: [...record.dataSources], aiRecommendation: { ...record.aiRecommendation, risks: [...record.aiRecommendation.risks] } }));
}

export async function fetchAreaGrowthData(): Promise<AreaGrowthRecord[]> {
  if (!isSupabaseConfigured()) {
    await delay(120);
    return clone(SEED_AREA_GROWTH);
  }

  const sb = getSupabase();
  if (!sb) return clone(SEED_AREA_GROWTH);

  try {
    const { data, error } = await sb.from("area_growth").select("*").order("investment_score", { ascending: false });
    if (error || !data?.length) return clone(SEED_AREA_GROWTH);
    return data as AreaGrowthRecord[];
  } catch {
    return clone(SEED_AREA_GROWTH);
  }
}

export async function createAreaGrowthRecord(record: AreaGrowthRecord): Promise<AreaGrowthRecord> {
  // TODO: later connect this to a Supabase table insert.
  void record;
  return record;
}

export async function updateAreaGrowthRecord(id: string, patch: Partial<AreaGrowthRecord>): Promise<void> {
  // TODO: later connect this to a Supabase table update.
  void id;
  void patch;
}

export async function deleteAreaGrowthRecord(id: string): Promise<void> {
  // TODO: later connect this to a Supabase table delete.
  void id;
}

export function subscribeToAreaGrowthUpdates(onPatch: (records: AreaGrowthRecord[]) => void): () => void {
  // TODO: later connect to Supabase Realtime channel on `area_growth`.
  const sb = getSupabase();
  void sb;
  if (!isSupabaseConfigured()) {
    return () => {};
  }
  void onPatch;
  return () => {};
}

