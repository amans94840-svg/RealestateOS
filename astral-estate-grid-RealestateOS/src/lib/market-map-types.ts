/** Backend-ready market zone model (Supabase row shape). */

export type MarketZoneStatus = "active" | "watch" | "at-risk";

export type PropertyTypeFilter = "Apartment" | "Villa" | "Commercial" | "Mixed-Use";

export type InvestmentGoal = "Rental Yield" | "Capital Growth" | "Balanced";

export type RiskLevel = "Low" | "Medium" | "High";

export type TimeHorizon = "1-3 years" | "3-5 years" | "5-10 years";

export type MarkerCategory = "high-opportunity" | "emerging" | "stable" | "high-risk";

export type MarketZone = {
  id: string;
  areaName: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  opportunityScore: number;
  demandScore: number;
  rentalDemand: number;
  priceGrowthForecast: number;
  investorActivity: number;
  liquidityScore: number;
  riskScore: number;
  averagePrice: number;
  currency: string;
  rentalYield: number;
  bestPropertyType: PropertyTypeFilter;
  bestBuyerType: string;
  aiRecommendation: string;
  lastUpdated: number;
  status: MarketZoneStatus;
  /** Filter dimensions */
  investmentGoal: InvestmentGoal;
  riskLevel: RiskLevel;
  timeHorizon: TimeHorizon;
};

export type MarketSignalType = "demand" | "yield" | "investor" | "risk" | "growth";

export type MarketSignal = {
  id: string;
  area: string;
  zoneId: string;
  type: MarketSignalType;
  headline: string;
  timestamp: number;
  impact: "Low" | "Medium" | "High";
  confidence: number;
  detail: string;
};
