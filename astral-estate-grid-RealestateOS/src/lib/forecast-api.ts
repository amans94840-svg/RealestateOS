import { SEED_BROKERS } from "@/lib/dashboard-data";
import { formatRevenue, getCurrencyRuleForCountry } from "./revenue-utils";

export type ForecastStatus = "New" | "In Progress" | "Reviewed" | "Ignored";
export type ForecastRiskLevel = "Low" | "Medium" | "High";
export type ForecastScenario = "best" | "base" | "worst";

export type ForecastType =
  | "revenue_monthly"
  | "lead_conversion"
  | "area_growth"
  | "rental_demand"
  | "property_price_movement"
  | "investor_activity"
  | "risk_forecast"
  | "broker_performance";

export type ForecastTimeHorizon = "1m" | "3m" | "6m" | "12m";

export type ForecastFilters = {
  country: string;
  city: string;
  property_type: string;
  investment_goal: string;
  risk_appetite: "Low" | "Medium" | "High";
  time_horizon: ForecastTimeHorizon;
  currency: string;
  confidence_level: number; // min confidence 0..100
  scenario: ForecastScenario;
};

export type SignalScore = {
  label:
    | "Lead Demand"
    | "Search Interest"
    | "Rental Demand"
    | "Price Movement"
    | "Investor Activity"
    | "Infrastructure Signal"
    | "Liquidity Signal"
    | "Risk Signal";
  score: number; // 0..100
};

export type ForecastDetail = {
  forecast_id: string;
  forecast_type: ForecastType;
  title: string;
  summary: string;

  country: string;
  city: string;
  property_type: string;
  currency: string; // symbol prefix (₹, $, AED, £, €...)
  forecast_value: number;
  risk_level: ForecastRiskLevel;
  confidence_score: number;
  time_horizon: ForecastTimeHorizon;
  last_updated: number;

  supporting_signals: SignalScore[];
  assumptions: string[];
  risks: string[];

  recommended_action: string;
  best_buyer_type: string;
  best_property_type: string;
  broker_next_steps: string;
  confidence_explanation: string;

  status: ForecastStatus;
};

let memory: Record<string, ForecastDetail[]> = {};

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFrom(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function horizonFactor(h: ForecastTimeHorizon) {
  if (h === "1m") return 0.45;
  if (h === "3m") return 0.9;
  if (h === "6m") return 1.15;
  return 1.35;
}

function scenarioFactor(s: ForecastScenario) {
  if (s === "best") return { value: 1.16, confidence: 1.05, risk: -0.12 };
  if (s === "worst") return { value: 0.86, confidence: 0.9, risk: 0.18 };
  return { value: 1.0, confidence: 1.0, risk: 0.0 };
}

function riskFromScore(riskScore: number): ForecastRiskLevel {
  // Higher riskScore means worse risk.
  if (riskScore < 35) return "Low";
  if (riskScore < 60) return "Medium";
  return "High";
}

function currencyForCountry(country: string) {
  const rule = getCurrencyRuleForCountry(country);
  return rule.symbol;
}

function buildSignalScores(params: { country: string; city: string; riskAppetite: string; scenario: ForecastScenario }) {
  const { country, city, riskAppetite, scenario } = params;
  const rand = mulberry32(seedFrom(`sig|${country}|${city}|${riskAppetite}|${scenario}`));
  const base = 48 + rand() * 18; // 48..66
  const riskBias = riskAppetite === "Low" ? -8 : riskAppetite === "High" ? 10 : 2;
  const scenBias = scenario === "best" ? -12 : scenario === "worst" ? 14 : 0;

  const lead = base + rand() * 18;
  const search = base + (rand() * 14 - 7);
  const rental = base + (rand() * 16 - 6);
  const price = base + (rand() * 22 - 10);
  const investor = base + (rand() * 18 - 8);
  const infra = base + (rand() * 16 - 7);
  const liquidity = base + (rand() * 16 - 7);
  const riskSignal = 30 + rand() * 45 + riskBias + scenBias; // 30..75+

  const clamp = (x: number) => Math.max(0, Math.min(100, Math.round(x)));
  return [
    { label: "Lead Demand", score: clamp(lead) },
    { label: "Search Interest", score: clamp(search) },
    { label: "Rental Demand", score: clamp(rental) },
    { label: "Price Movement", score: clamp(price) },
    { label: "Investor Activity", score: clamp(investor) },
    { label: "Infrastructure Signal", score: clamp(infra) },
    { label: "Liquidity Signal", score: clamp(liquidity) },
    { label: "Risk Signal", score: clamp(riskSignal) },
  ] as SignalScore[];
}

function titleForType(type: ForecastType) {
  switch (type) {
    case "revenue_monthly":
      return "Predicted Monthly Revenue";
    case "lead_conversion":
      return "Lead Conversion Forecast";
    case "area_growth":
      return "Area Growth Forecast";
    case "rental_demand":
      return "Rental Demand Forecast";
    case "property_price_movement":
      return "Property Price Movement";
    case "investor_activity":
      return "Investor Activity Forecast";
    case "risk_forecast":
      return "Risk Forecast";
    case "broker_performance":
      return "Broker Performance Forecast";
    default:
      return "Forecast";
  }
}

function recommendedActionForType(type: ForecastType, city: string) {
  switch (type) {
    case "revenue_monthly":
      return `Escalate hot leads in ${city} and convert at least 2 offers faster using broker follow-up SLA.`;
    case "lead_conversion":
      return `Tighten qualification notes for ${city} and schedule next-touch within 4 hours for high-confidence leads.`;
    case "area_growth":
      return `Prioritize listings in the fastest-growing ${city} corridors and align broker outreach with the growth stage.`;
    case "rental_demand":
      return `Target rental-ready buyer segments in ${city} and refresh site-visit availability windows.`;
    case "property_price_movement":
      return `Run price readiness checks in ${city}; adjust offers based on price movement volatility.`;
    case "investor_activity":
      return `Scale investor outreach in ${city} and package deal assumptions for top conversion channels.`;
    case "risk_forecast":
      return `Mitigate risk in ${city}: validate offer details and enforce response cadence to prevent leakage.`;
    case "broker_performance":
      return `Coach brokers assigned to ${city}: reduce missed follow-ups and accelerate closure on top segments.`;
    default:
      return `Act on the highest-confidence opportunities in ${city}.`;
  }
}

function bestBuyerForType(type: ForecastType) {
  switch (type) {
    case "lead_conversion":
      return "Investor with verified budget + fast decision behavior";
    case "risk_forecast":
      return "Risk-aware buyer ready to underwrite quickly";
    case "broker_performance":
      return "Broker-optimized buyers who respond to short SLAs";
    default:
      return "High-intent investors and end-users aligned with the current cycle";
  }
}

function bestPropertyForType(type: ForecastType, propertyType: string) {
  switch (type) {
    case "rental_demand":
      return propertyType ? `${propertyType} rental-ready inventory` : "Rental-ready inventory";
    case "area_growth":
      return propertyType ? `${propertyType} in growth corridors` : "Growth-corridor inventory";
    case "property_price_movement":
      return propertyType ? `${propertyType} with stable price signals` : "Stable price-signal inventory";
    default:
      return propertyType ? `${propertyType} aligned with forecast strength` : "Inventory aligned with forecast strength";
  }
}

function generateForecastSet(filters: ForecastFilters): ForecastDetail[] {
  const rand = mulberry32(seedFrom(`fset|${filters.country}|${filters.city}|${filters.property_type}|${filters.investment_goal}|${filters.risk_appetite}|${filters.time_horizon}|${filters.currency}|${filters.confidence_level}|${filters.scenario}`));

  const scenario = scenarioFactor(filters.scenario);
  const hFactor = horizonFactor(filters.time_horizon);

  const signals = buildSignalScores({ country: filters.country, city: filters.city, riskAppetite: filters.risk_appetite, scenario: filters.scenario });
  const riskSignal = signals.find((s) => s.label === "Risk Signal")?.score ?? 55;
  const riskLevel = riskFromScore(riskSignal * (1 + scenario.risk));

  // Base numeric multipliers from key signals
  const leadDemand = signals.find((s) => s.label === "Lead Demand")?.score ?? 55;
  const searchInterest = signals.find((s) => s.label === "Search Interest")?.score ?? 55;
  const rentalDemand = signals.find((s) => s.label === "Rental Demand")?.score ?? 55;
  const priceMove = signals.find((s) => s.label === "Price Movement")?.score ?? 50;
  const investorActivity = signals.find((s) => s.label === "Investor Activity")?.score ?? 55;
  const liquidity = signals.find((s) => s.label === "Liquidity Signal")?.score ?? 50;
  const infra = signals.find((s) => s.label === "Infrastructure Signal")?.score ?? 50;

  const confidenceBase = 60 + (leadDemand + searchInterest + liquidity) / 10 - (riskSignal / 8);
  const confidenceScore = Math.max(20, Math.min(99, Math.round(confidenceBase * scenario.confidence)));
  const clippedConfidence = Math.max(filters.confidence_level, confidenceScore);

  const citySeed = seedFrom(`${filters.city}|${filters.country}|${filters.time_horizon}`);
  const lastUpdated = Date.now() - Math.round((rand() * 60 + 5) * 60_000);

  const currencySymbol = filters.currency || currencyForCountry(filters.country);

  const types: ForecastType[] = [
    "revenue_monthly",
    "lead_conversion",
    "area_growth",
    "rental_demand",
    "property_price_movement",
    "investor_activity",
    "risk_forecast",
    "broker_performance",
  ];

  const baseRevenue = (() => {
    const c = filters.country;
    const raw =
      c === "India"
        ? 12_000_000
        : c === "UAE"
          ? 1_500_000
          : c === "USA"
            ? 1_200_000
            : c === "UK"
              ? 950_000
              : c === "Canada"
                ? 720_000
                : c === "Singapore"
                  ? 610_000
                  : c === "Australia"
                    ? 680_000
                    : c === "Germany" || c === "France"
                      ? 790_000
                      : 1_000_000;
    return Math.round(raw * hFactor * (0.88 + rand() * 0.38));
  })();

  const revenueValue = Math.round(baseRevenue * scenario.value * (0.85 + (rentalDemand / 100) * 0.35));
  const valueByType: Record<ForecastType, number> = {
    revenue_monthly: revenueValue,
    lead_conversion: Math.round((0.18 + leadDemand / 520) * 1000) / 10,
    area_growth: Math.round((10 + infra / 10 + (priceMove - 50) / 4) * 10) / 10,
    rental_demand: Math.round((0.12 + rentalDemand / 540) * 1000) / 10,
    property_price_movement: Math.round((priceMove - 50) * 0.9 * 10) / 10,
    investor_activity: Math.round((investorActivity / 100) * 1000) / 10,
    risk_forecast: Math.round((riskSignal / 100) * 1000) / 10,
    broker_performance: Math.round((liquidity / 100) * 1000) / 10,
  };

  return types.map((type, idx) => {
    const forecast_id = `f_${filters.country}_${filters.city}_${type}_${filters.time_horizon}_${filters.scenario}_${idx}`;
    const value = valueByType[type];

    const assumptions = [
      `Market signals from ${filters.city} reflect stable broker response and lead quality (mock).`,
      `Confidence assumes no major policy shock and no sudden liquidity disruption.`,
      `Time horizon scaling uses ${filters.time_horizon} multipliers adjusted by scenario.`,
    ];

    const risks = [
      `Scenario volatility could shift conversion and price movement in ${filters.city}.`,
      `Delayed follow-up may increase leakage, lowering realized revenue.`,
      `Unexpected supply/liquidity constraints could worsen the risk signal.`,
    ];

    const bestBuyerType = bestBuyerForType(type);
    const bestPropertyType = bestPropertyForType(type, filters.property_type);

    const broker_next_steps = `Assign broker lane for ${type.replaceAll("_", " ")} in ${filters.city}, enforce <4h response for hot leads, and run weekly signal checkpoints.`;

    const typeSpecificSummary = (() => {
      if (type === "revenue_monthly") return `Revenue may rise to ${formatRevenue(value, filters.country, currencySymbol)} with scenario ${filters.scenario}.`;
      if (type === "lead_conversion") return `Conversion forecast: ~${value}% expected closure efficiency under ${filters.risk_appetite} appetite.`;
      if (type === "area_growth") return `Area growth expected: ~${value}% stage acceleration (mock).`;
      if (type === "rental_demand") return `Rental demand forecast: ~${value}% improvement in rental-ready buyer interest.`;
      if (type === "property_price_movement") return `Price movement signal: ${value}% bias vs baseline; adjust offers accordingly.`;
      if (type === "investor_activity") return `Investor activity forecast: +${value}% momentum in high-intent segments.`;
      if (type === "risk_forecast") return `Risk forecast signal: ${value}% probability of leakage risk increasing.`;
      return `Broker performance forecast: ${value}% readiness signal based on response + liquidity strength.`;
    })();

    const confidenceExplanation = `Confidence driven by ${filters.city} lead demand (${leadDemand}), search interest (${searchInterest}), liquidity (${liquidity}) and risk signal (${riskSignal}). Scenario "${filters.scenario}" adjusts forecast value and confidence.`;

    const recommended_action = recommendedActionForType(type, filters.city);

    const status: ForecastStatus = idx % 7 === 0 ? "New" : idx % 5 === 0 ? "In Progress" : idx % 9 === 0 ? "Ignored" : "Reviewed";

    return {
      forecast_id,
      forecast_type: type,
      title: titleForType(type),
      summary: typeSpecificSummary,
      country: filters.country,
      city: filters.city,
      property_type: filters.property_type,
      currency: currencySymbol,
      forecast_value: value,
      risk_level: type === "risk_forecast" ? riskLevel : riskLevel,
      confidence_score: clippedConfidence,
      time_horizon: filters.time_horizon,
      last_updated: lastUpdated,
      supporting_signals: signals,
      assumptions,
      risks,
      recommended_action,
      best_buyer_type: bestBuyerType,
      best_property_type: bestPropertyType,
      broker_next_steps,
      confidence_explanation: confidenceExplanation,
      status,
    };
  });
}

export async function fetchForecasts(filters: ForecastFilters): Promise<ForecastDetail[]> {
  // Placeholder: later connect to Supabase.
  await new Promise((r) => setTimeout(r, 320 + Math.random() * 240));
  const key = JSON.stringify(filters);
  if (!memory[key]) {
    memory[key] = generateForecastSet(filters);
  }
  return memory[key];
}

export async function fetchForecastById(forecastId: string, filters?: Partial<ForecastFilters>): Promise<ForecastDetail | null> {
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 120));
  const all = Object.values(memory).flat();
  return all.find((f) => f.forecast_id === forecastId) ?? null;
}

export async function updateForecastStatus(forecastId: string, status: ForecastStatus): Promise<ForecastDetail | null> {
  const allKeys = Object.keys(memory);
  for (const k of allKeys) {
    const list = memory[k];
    const idx = list.findIndex((x) => x.forecast_id === forecastId);
    if (idx >= 0) {
      const next = { ...list[idx], status, last_updated: Date.now() };
      list[idx] = next;
      return next;
    }
  }
  return null;
}

export async function createInvestorReportFromForecast(_forecastId: string): Promise<{ report_id: string; status: "created" | "failed" }> {
  await new Promise((r) => setTimeout(r, 220 + Math.random() * 120));
  return { report_id: `r_${Math.floor(Math.random() * 9999)}`, status: "created" };
}

export async function assignBrokerToForecast(_forecastId: string, _brokerId: string): Promise<void> {
  await new Promise((r) => setTimeout(r, 200));
}

export async function subscribeToForecastUpdates(
  onUpdate: (next: { forecast_id: string; status: ForecastStatus }) => void,
): Promise<() => void> {
  const interval = setInterval(() => {
    const all = Object.values(memory).flat();
    if (!all.length) return;
    const pick = all[Math.floor(Math.random() * all.length)]!;
    const nextStatus: ForecastStatus =
      pick.status === "New" ? "In Progress" : pick.status === "In Progress" ? "Reviewed" : pick.status === "Reviewed" ? "Ignored" : "New";
    onUpdate({ forecast_id: pick.forecast_id, status: nextStatus });
    // Reflect into memory to keep UI consistent.
    const keys = Object.keys(memory);
    for (const k of keys) {
      const list = memory[k];
      const idx = list.findIndex((x) => x.forecast_id === pick.forecast_id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], status: nextStatus, last_updated: Date.now() };
      }
    }
  }, 30_000);
  return () => clearInterval(interval);
}

export async function exportForecastsCSV(forecasts: ForecastDetail[]): Promise<string> {
  const rows = forecasts.map((f) => ({
    forecast_id: f.forecast_id,
    forecast_type: f.forecast_type,
    country: f.country,
    city: f.city,
    forecast_value: f.forecast_value,
    currency: f.currency,
    confidence_score: f.confidence_score,
    risk_level: f.risk_level,
    time_horizon: f.time_horizon,
    status: f.status,
    updated_at: new Date(f.last_updated).toISOString(),
  }));
  const headers = Object.keys(rows[0] ?? {});
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(","))].join("\n");
  return csv;
}

export async function messageForecastBroker(_forecastId: string, _channel: "whatsapp" | "email"): Promise<void> {
  await new Promise((r) => setTimeout(r, 150));
}

export const __mockBrokerList = SEED_BROKERS;

