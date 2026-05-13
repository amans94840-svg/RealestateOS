import type { MarketZone } from "./market-map-types";
import { SEED_MARKET_ZONES } from "./market-map-seed";

/**
 * Fetch all market zones from persistence.
 * TODO (Supabase): replace with:
 *   const { data, error } = await supabase.from('market_zones').select('*').order('area_name');
 *   if (error) throw error;
 *   return data as MarketZone[];
 */
export async function fetchMarketZones(): Promise<MarketZone[]> {
  return Promise.resolve(SEED_MARKET_ZONES.map(z => ({ ...z, lastUpdated: Date.now() })));
}

export type MarketZonesSubscriber = (zones: MarketZone[]) => void;

/**
 * Subscribe to realtime market zone updates.
 * TODO (Supabase): replace with Realtime channel, e.g.:
 *   const channel = supabase
 *     .channel('market_zones')
 *     .on('postgres_changes', { event: '*', schema: 'public', table: 'market_zones' }, payload => {
 *       // merge payload.new / payload.old into local state
 *       callback(nextZones);
 *     })
 *     .subscribe();
 *   return () => { supabase.removeChannel(channel); };
 */
export function subscribeToMarketZones(_subscriber: MarketZonesSubscriber): () => void {
  void _subscriber;
  return () => {
    /* no-op until Supabase wired */
  };
}

/**
 * Push a partial zone update (simulates server write + broadcast).
 * TODO (Supabase): replace with:
 *   await supabase.from('market_zones').update(patch).eq('id', id);
 *   // Realtime will echo to subscribers
 */
export async function updateMarketZoneRealtime(
  id: string,
  patch: Partial<MarketZone>,
): Promise<Partial<MarketZone>> {
  void id;
  return Promise.resolve(patch);
}
