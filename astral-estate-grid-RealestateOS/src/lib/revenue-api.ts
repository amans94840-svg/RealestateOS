import { SEED_BROKERS } from "@/lib/dashboard-data";

import { getCurrencyRuleForCountry } from "./revenue-utils";

export type RevenueDurationKey = "today" | "last7d" | "last30d" | "last90d" | "thisYear" | "custom";

export type RevenueRiskLevel = "Low" | "Medium" | "High";

export type RevenueRisk = {
  level: RevenueRiskLevel;
  explanation: string;
};

export type RevenueTrendPoint = {
  label: string;
  value: number;
  forecast?: number;
};

export type RevenueBarPoint = {
  label: string;
  value: number;
};

export type RevenueFunnelPoint = {
  stage: string;
  value: number;
};

export type BrokerRevenueRow = {
  id: string;
  brokerName: string;
  region: string;
  leadsHandled: number;
  closedDeals: number;
  revenueClosed: number;
  commissionEarned: number;
  conversionRate: number; // 0-100
  responseTimeMins: number;
  badges: Array<"Top Closer" | "Fast Responder" | "High Revenue" | "Needs Follow-up">;
  revenueHistory: number[]; // last N points (mock)
  bestLeadSource: string;
  weakArea: string;
};

export type CountryRevenueRow = {
  country: string;
  currency: string; // symbol +/or code prefix
  revenue: number;
  closedDeals: number;
  avgDealValue: number;
  growthPercent: number;
  forecast: number;
  topBroker: string;
};

export type RevenueAIReport = {
  predictedRevenue: number;
  confidencePercent: number;
  whyForecastChanged: string;
  bestOpportunity: { country: string; city: string };
  riskWarning: string;
  recommendedBrokerAction: string;
};

export type RevenueAnalytics = {
  duration: RevenueDurationKey;
  country: string;
  currency: string;
  totalRevenue: number;
  comparedToPreviousPercent: number;
  closedDeals: number;
  closedDealsComparedToPreviousPercent: number;
  averageDealValue: number;
  averageDealValueComparedToPreviousPercent: number;
  predictedRevenue: number;
  predictionConfidencePercent: number;
  pendingPipelineValue: number;
  pendingPipelineComparedToPreviousPercent: number;
  commissionEarned: number;
  commissionComparedToPreviousPercent: number;
  conversionRatePercent: number;
  conversionComparedToPreviousPercent: number;
  revenueRisk: RevenueRisk;
  trend: RevenueTrendPoint[];
  bar: RevenueBarPoint[];
  funnel: RevenueFunnelPoint[];
  brokerLeaderboard: BrokerRevenueRow[];
  countryBreakdown: CountryRevenueRow[];
  aiReport: RevenueAIReport;
};

type CustomRange = { startDate: string; endDate: string };

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

const DURATION_FACTOR: Record<RevenueDurationKey, number> = {
  today: 0.08,
  last7d: 0.25,
  last30d: 0.55,
  last90d: 0.85,
  thisYear: 1.8,
  custom: 0.9,
};

const BASE_REVENUE_BY_COUNTRY: Record<string, number> = {
  India: 12_000_000, // 1.2Cr
  UAE: 1_500_000, // AED 1.5M
  USA: 1_200_000, // $1.2M
  UK: 950_000, // £950K
  Canada: 720_000,
  Singapore: 610_000,
  Australia: 680_000,
  Germany: 850_000,
  France: 790_000,
  "Saudi Arabia": 740_000,
  Qatar: 420_000,
  "Other": 1_000_000,
};

function generateMockAnalytics(params: {
  duration: RevenueDurationKey;
  country: string;
  customRange?: CustomRange | null;
}): RevenueAnalytics {
  const { duration, country } = params;
  const resolvedCountry = country === "All" ? "Other" : country;
  const currencyRule = getCurrencyRuleForCountry(resolvedCountry);
  const currency = currencyRule.country === "Other" ? "$" : currencyRule.symbol;

  const rand = mulberry32(seedFrom(`${resolvedCountry}|${duration}|${params.customRange?.startDate ?? ""}|${params.customRange?.endDate ?? ""}`));
  const base = BASE_REVENUE_BY_COUNTRY[resolvedCountry] ?? BASE_REVENUE_BY_COUNTRY.Other;
  const factor = DURATION_FACTOR[duration] ?? DURATION_FACTOR.custom;
  const noise = 0.86 + rand() * 0.35; // 0.86..1.21
  const totalRevenue = Math.round(base * factor * noise);

  const comparedToPreviousPercent = Math.round((-6 + rand() * 24) * 10) / 10; // -6..+18
  const closedDealsComparedToPreviousPercent = Math.round((-5 + rand() * 22) * 10) / 10; // -5..+17
  const conversionRatePercent = Math.round((18 + rand() * 36) * 10) / 10; // 18..54
  const averageDealValueComparedToPreviousPercent = Math.round((-4 + rand() * 20) * 10) / 10; // -4..+16

  const avgDealBase =
    resolvedCountry === "India" ? 250_000 : resolvedCountry === "UK" ? 180_000 : resolvedCountry === "UAE" ? 210_000 : 190_000;
  const averageDealValue = Math.round(avgDealBase * (0.85 + rand() * 0.5));
  const closedDeals = Math.max(1, Math.round(totalRevenue / Math.max(averageDealValue, 1)));

  const pendingPipelineValue = Math.round(totalRevenue * (1.22 + rand() * 0.65));
  const commissionEarned = Math.round(totalRevenue * (0.03 + rand() * 0.03));
  const pendingPipelineComparedToPreviousPercent = Math.round((-6 + rand() * 26) * 10) / 10;
  const commissionComparedToPreviousPercent = Math.round((-4 + rand() * 20) * 10) / 10;
  const conversionComparedToPreviousPercent = Math.round((-4 + rand() * 16) * 10) / 10;

  const confidence = Math.round(70 + rand() * 24); // 70..94
  const predictedRevenue = Math.round(totalRevenue * (1 + (rand() * 0.22 - 0.05))); // -5..+17

  const riskLevel: RevenueRiskLevel = predictedRevenue >= totalRevenue * 1.02 ? "Low" : comparedToPreviousPercent < -2 ? "High" : "Medium";
  const revenueRisk: RevenueRisk = {
    level: riskLevel,
    explanation:
      riskLevel === "Low"
        ? "Signals remain stable: pipeline quality is steady and broker response times are improving."
        : riskLevel === "High"
          ? "Volatility increased: deal velocity slowed and conversion dipped vs. previous period."
          : "Mixed signals: some markets are strong, while a few segments are underperforming.",
  };

  // Trend + bar data
  const trendPoints = (() => {
    const count = duration === "today" ? 12 : duration === "last7d" ? 7 : duration === "last30d" ? 12 : 12;
    const labels: string[] = [];
    for (let i = 0; i < count; i++) {
      labels.push(
        duration === "today"
          ? `${String(i + 1).padStart(2, "0")}:00`
          : duration === "last7d"
            ? `Day ${i + 1}`
            : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(i + 2) % 12],
      );
    }
    return labels.map((label, i) => {
      const t = 0.75 + i / Math.max(count - 1, 1) * 0.7;
      const basePoint = totalRevenue / count;
      const value = Math.round(basePoint * t * (0.9 + rand() * 0.25));
      const forecast = Math.round(value * (0.95 + rand() * 0.18));
      return { label, value, forecast };
    });
  })();

  const barPoints = (() => {
    if (duration === "today" || duration === "last7d") {
      const count = duration === "today" ? 6 : 7;
      return Array.from({ length: count }, (_, i) => ({
        label: duration === "today" ? `Hr ${i + 1}` : `D${i + 1}`,
        value: Math.round((totalRevenue / count) * (0.9 + rand() * 0.35)),
      }));
    }
    if (duration === "last30d") {
      return Array.from({ length: 10 }, (_, i) => ({
        label: `W${i + 1}`,
        value: Math.round((totalRevenue / 10) * (0.88 + rand() * 0.4)),
      }));
    }
    // 3..6 months style
    const count = duration === "last90d" ? 6 : 8;
    return Array.from({ length: count }, (_, i) => ({
      label: duration === "last90d" ? `M${i + 1}` : `Q${i + 1}`,
      value: Math.round((totalRevenue / count) * (0.82 + rand() * 0.42)),
    }));
  })();

  const leads = Math.round(closedDeals * (9 + rand() * 10)); // 9..19x
  const qualified = Math.round(leads * (0.55 + rand() * 0.18));
  const siteVisits = Math.round(qualified * (0.42 + rand() * 0.18));
  const offers = Math.round(siteVisits * (0.36 + rand() * 0.16));
  const funnel: RevenueFunnelPoint[] = [
    { stage: "Leads", value: leads },
    { stage: "Qualified", value: qualified },
    { stage: "Site Visits", value: siteVisits },
    { stage: "Offers", value: offers },
    { stage: "Closed", value: closedDeals },
  ];

  // Broker leaderboard
  const brokers: BrokerRevenueRow[] = SEED_BROKERS.map((b) => {
    const w = 0.6 + rand() * 0.8;
    const revenueShare = 0.2 + rand() * 0.8;
    const revenueClosed = Math.round((totalRevenue * revenueShare * w) / (SEED_BROKERS.length * 0.75));
    const commissionEarned = Math.round(revenueClosed * (0.02 + rand() * 0.05));
    const leadsHandled = Math.round((leads / SEED_BROKERS.length) * (0.65 + rand() * 0.85));
    const conv = Math.max(8, Math.min(70, (revenueShare * 40 + rand() * 12)));
    const responseTimeMins = Math.round((2 + rand() * 4) * 10) / 10;
    const sources = ["Website", "WhatsApp", "Referral", "LinkedIn", "Google Ads", "Facebook Ads"] as const;
    const weakAreas = ["Slow follow-ups", "Offer leakage", "Lead qualification gaps", "Response delay", "Low show rate"] as const;
    const bestLeadSource = sources[Math.floor(rand() * sources.length)]!;
    const weakArea = weakAreas[Math.floor(rand() * weakAreas.length)]!;
    const historyCount = duration === "today" ? 7 : 10;
    const revenueHistory = Array.from({ length: historyCount }, (_, i) => {
      const t = 0.85 + i / Math.max(historyCount - 1, 1) * 0.45;
      const v = Math.round(revenueClosed * t * (0.9 + rand() * 0.25));
      return v;
    });
    return {
      id: b.id,
      brokerName: b.name,
      region: b.region,
      leadsHandled,
      closedDeals: Math.max(1, Math.round(closedDeals * (0.18 + rand() * 0.55) * w * 0.6)),
      revenueClosed,
      commissionEarned,
      conversionRate: Math.round(conv * 10) / 10,
      responseTimeMins,
      badges: [],
      revenueHistory,
      bestLeadSource,
      weakArea,
    };
  }).sort((a, b) => b.revenueClosed - a.revenueClosed);

  const maxRevenue = Math.max(...brokers.map((x) => x.revenueClosed), 1);
  const minResponse = Math.min(...brokers.map((x) => x.responseTimeMins), 0.01);

  const leaderboard = brokers.map((row, idx) => {
    const badges: BrokerRevenueRow["badges"] = [];
    if (idx === 0) badges.push("Top Closer");
    if (row.responseTimeMins === minResponse) badges.push("Fast Responder");
    if (row.revenueClosed >= maxRevenue * 0.6) badges.push("High Revenue");
    const lowConv = row.conversionRate < 28;
    const needsFollowUp = lowConv || row.responseTimeMins > 4.2;
    if (needsFollowUp) badges.push("Needs Follow-up");
    // De-dup
    return { ...row, badges: Array.from(new Set(badges)) };
  });

  // Country breakdown (multi-market)
  const allCountries = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France"];
  const countryBreakdown: CountryRevenueRow[] = allCountries.map((c) => {
    const cur = getCurrencyRuleForCountry(c).symbol;
    const cBase = BASE_REVENUE_BY_COUNTRY[c] ?? BASE_REVENUE_BY_COUNTRY.Other;
    const cNoise = 0.88 + rand() * 0.42;
    const cTotal = Math.round(cBase * factor * cNoise);
    const cClosed = Math.max(1, Math.round(cTotal / Math.max(avgDealBase * 0.9, 1)));
    const cAvg = Math.round(cTotal / cClosed);
    const growthPercent = Math.round((-4 + rand() * 26) * 10) / 10;
    const forecast = Math.round(cTotal * (1 + (rand() * 0.22 - 0.05)));
    const topBroker = leaderboard[Math.floor(rand() * leaderboard.length)]?.brokerName ?? "—";
    return {
      country: c,
      currency: cur,
      revenue: cTotal,
      closedDeals: cClosed,
      avgDealValue: cAvg,
      growthPercent,
      forecast,
      topBroker,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  // AI report
  const cities = ["Dubai Marina", "Noida Sector 150", "Gurugram Golf Course Road", "Downtown Dubai", "Manhattan", "London Mayfair", "Toronto Yorkville"];
  const bestOpportunity = {
    country: countryBreakdown[Math.floor(rand() * countryBreakdown.length)]?.country ?? resolvedCountry,
    city: cities[Math.floor(rand() * cities.length)],
  };

  const aiReport: RevenueAIReport = {
    predictedRevenue,
    confidencePercent: confidence,
    whyForecastChanged: `Hot deal velocity signals improved in ${bestOpportunity.city}, while broker response time shortened across high-intent leads.`,
    bestOpportunity,
    riskWarning:
      riskLevel === "High"
        ? "Watch for conversion drop: slow follow-up may reduce closed deals."
        : riskLevel === "Low"
          ? "Momentum remains positive: consider doubling outreach in the top opportunity segment."
          : "Proceed with diligence: monitor offers and keep pipeline warm on weaker segments.",
    recommendedBrokerAction:
      riskLevel === "High"
        ? "Prioritize follow-ups for leads in Offer stage; schedule rapid site visits for top AI-scored leads."
        : "Focus on best-converting lead sources; confirm buyer readiness and accelerate closure on top deals.",
  };

  return {
    duration,
    country: resolvedCountry,
    currency,
    totalRevenue,
    comparedToPreviousPercent,
    closedDeals,
    closedDealsComparedToPreviousPercent,
    averageDealValue,
    averageDealValueComparedToPreviousPercent,
    predictedRevenue,
    predictionConfidencePercent: confidence,
    pendingPipelineValue,
    pendingPipelineComparedToPreviousPercent,
    commissionEarned,
    commissionComparedToPreviousPercent,
    conversionRatePercent,
    conversionComparedToPreviousPercent,
    revenueRisk,
    trend: trendPoints,
    bar: barPoints,
    funnel,
    brokerLeaderboard: leaderboard,
    countryBreakdown,
    aiReport,
  };
}

export async function fetchRevenueAnalytics(duration: RevenueDurationKey, country: string, customRange?: CustomRange | null): Promise<RevenueAnalytics> {
  // Later connect to Supabase revenue/deals/leads tables.
  // eslint-disable-next-line no-void
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
  return generateMockAnalytics({ duration, country, customRange });
}

export function subscribeToRevenueUpdates(
  onUpdate: (update: { country: string; duration: RevenueDurationKey; analytics: RevenueAnalytics }) => void,
): () => void {
  const interval = setInterval(() => {
    // Emit a lightweight update; UI will choose to apply if it matches selection.
    const duration: RevenueDurationKey = (["today", "last7d", "last30d", "last90d", "thisYear"] as const)[
      Math.floor(Math.random() * 5)
    ];
    const country = (["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France"] as const)[
      Math.floor(Math.random() * 9)
    ];
    const analytics = generateMockAnalytics({ duration, country });
    onUpdate({ country, duration, analytics });
  }, 25_000);

  return () => clearInterval(interval);
}

export async function fetchBrokerRevenue(duration: RevenueDurationKey, country: string): Promise<BrokerRevenueRow[]> {
  const analytics = await fetchRevenueAnalytics(duration, country);
  return analytics.brokerLeaderboard;
}

export async function fetchCountryRevenue(duration: RevenueDurationKey): Promise<CountryRevenueRow[]> {
  // country is ignored here; breakdown is multi-market.
  const analytics = await fetchRevenueAnalytics(duration, "Other");
  return analytics.countryBreakdown;
}

export function exportRevenueCSV(analytics: RevenueAnalytics) {
  // Placeholder: later wire to backend export.
  const rows: Array<Record<string, string | number>> = [];
  rows.push({
    duration: analytics.duration,
    country: analytics.country,
    totalRevenue: analytics.totalRevenue,
    closedDeals: analytics.closedDeals,
    averageDealValue: analytics.averageDealValue,
    predictedRevenue: analytics.predictedRevenue,
    commissionEarned: analytics.commissionEarned,
    conversionRatePercent: analytics.conversionRatePercent,
    riskLevel: analytics.revenueRisk.level,
    confidencePercent: analytics.predictionConfidencePercent,
  });

  rows.push(
    ...analytics.brokerLeaderboard.map((b) => ({
      brokerName: b.brokerName,
      region: b.region,
      leadsHandled: b.leadsHandled,
      closedDeals: b.closedDeals,
      revenueClosed: b.revenueClosed,
      commissionEarned: b.commissionEarned,
      conversionRatePercent: b.conversionRate,
      responseTimeMins: b.responseTimeMins,
    })),
  );

  const headers = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r)).filter((h) => !["undefined"].includes(h))),
  );
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(","))].join("\n");
  return csv;
}

export async function syncRevenueFromSupabase(): Promise<void> {
  // Later connect to Supabase sync. For now: simulate quick sync.
  await new Promise((r) => setTimeout(r, 180));
}

