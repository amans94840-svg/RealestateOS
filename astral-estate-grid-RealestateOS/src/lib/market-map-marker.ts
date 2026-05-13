import type { MarketZone, MarkerCategory } from "./market-map-types";

/** Marker color tier: green / blue / yellow / red — used by map and UI badges. */
export function markerCategory(z: MarketZone): MarkerCategory {
  if (z.riskScore >= 55 || z.status === "at-risk") return "high-risk";
  if (z.opportunityScore >= 82) return "high-opportunity";
  if (z.opportunityScore >= 72 && z.priceGrowthForecast >= 7) return "emerging";
  return "stable";
}

export const MARKER_CATEGORY_LABEL: Record<MarkerCategory, string> = {
  "high-opportunity": "High opportunity",
  emerging: "Emerging growth",
  stable: "Stable market",
  "high-risk": "High risk",
};
