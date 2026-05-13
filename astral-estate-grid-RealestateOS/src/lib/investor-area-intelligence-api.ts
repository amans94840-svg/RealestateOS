/**
 * Investor / area intelligence — backend-ready stubs.
 *
 * Later:
 * - `fetchAreaIntelligence` → Supabase RPC or REST aggregating CRM + listings + macro feeds
 * - `subscribeToAreaUpdates` → Supabase Realtime / WebSocket channel
 * - `fetchGoogleAreaSignals` → Google Trends / Places / Maps demand proxies (server-side only)
 * - `syncInfrastructureUpdates` → government & developer infrastructure feeds via n8n
 * - `updateAreaScoreRealtime` → edge function recomputing scores from fresh signals
 */

import type { AreaIntelligence } from "./investor-area-intelligence-model";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchAreaIntelligence(): Promise<AreaIntelligence[]> {
  await delay(140);
  return [];
}

/** Returns unsubscribe. Production: WebSocket / Supabase channel. */
export function subscribeToAreaUpdates(_onPatch: (areas: AreaIntelligence[]) => void): () => void {
  void _onPatch;
  return () => {};
}

export async function fetchGoogleAreaSignals(_areaId: string): Promise<Record<string, unknown>> {
  await delay(80);
  void _areaId;
  return {};
}

export async function syncInfrastructureUpdates(_areaId: string): Promise<{ ok: boolean }> {
  await delay(90);
  void _areaId;
  return { ok: true };
}

export async function updateAreaScoreRealtime(_areaId: string): Promise<Partial<AreaIntelligence> | null> {
  await delay(70);
  void _areaId;
  return null;
}
