import { SEED_BROKERS, SEED_APPTS } from "@/lib/dashboard-data";

export type DashboardDurationKey = "today" | "last7d" | "last30d" | "last90d" | "thisYear" | "custom";

export type DashboardCountry =
  | "India"
  | "UAE"
  | "USA"
  | "UK"
  | "Canada"
  | "Singapore"
  | "Australia"
  | "Germany"
  | "France"
  | "Other";

export type DashboardKpiCard = {
  key:
    | "totalLeads"
    | "hotLeads"
    | "newLeadsToday"
    | "siteVisitsBooked"
    | "closedDeals"
    | "totalRevenue"
    | "profit"
    | "loss"
    | "leakage"
    | "pendingPipelineValue"
    | "aiPredictedRevenue"
    | "conversionRate"
    | "averageDealValue";
  title: string;
  icon: "users" | "flame" | "calendar" | "dollar" | "brain" | "trendUp" | "trendDown" | "sparkles";
};

export type RevenueTrendPoint = { label: string; value: number; forecast?: number };
export type FunnelPoint = { stage: string; value: number };
export type ProfitLossPoint = { label: string; profit: number; loss: number };

export type BrokerPerformanceRow = {
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
};

export type CountryRevenueRow = {
  country: string;
  revenue: number;
  closedDeals: number;
  forecast: number;
};

export type AiInsightCard = {
  whatHappened: string;
  whyItMatters: string;
  recommendedAction: string;
};

export type DashboardMetrics = {
  duration: DashboardDurationKey;
  country: DashboardCountry;

  totalLeads: number;
  hotLeads: number;
  newLeadsToday: number;
  siteVisitsBooked: number;
  closedDeals: number;

  totalRevenue: number;
  profit: number;
  loss: number;
  leakage: number; // pending/at-risk leakage

  pendingPipelineValue: number;
  aiPredictedRevenue: number;
  aiConfidencePercent: number;

  conversionRatePercent: number;
  averageDealValue: number;

  revenueTrend: RevenueTrendPoint[];
  funnel: FunnelPoint[];
  profitLoss: ProfitLossPoint[];
  countryRevenue: CountryRevenueRow[];
  brokerPerformance: BrokerPerformanceRow[];

  topBrokers: BrokerPerformanceRow[];
  leadsNeedingFollowUp: Array<{ name: string; country: string; reason: string; urgency: string }>;
  hotOpportunities: Array<{ title: string; country: string; city: string; note: string }>;
  lostRevenueReasons: Array<string>;
  upcomingSiteVisits: Array<{ lead: string; date: string; time: string; broker: string }>;
  aiRecommendedActions: Array<string>;
  aiInsights: AiInsightCard[];

  // Used by UI to keep an "at-a-glance" reconciliation.
  comparedToPreviousPercent: number;
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

const DURATION_FACTOR: Record<DashboardDurationKey, number> = {
  today: 0.08,
  last7d: 0.3,
  last30d: 0.65,
  last90d: 0.95,
  thisYear: 1.7,
  custom: 0.9,
};

const BASE_REVENUE_BY_COUNTRY: Record<DashboardCountry, number> = {
  India: 12_000_000,
  UAE: 1_500_000,
  USA: 1_200_000,
  UK: 950_000,
  Canada: 720_000,
  Singapore: 610_000,
  Australia: 680_000,
  Germany: 850_000,
  France: 790_000,
  Other: 1_000_000,
};

function generateMockDashboardMetrics(args: { duration: DashboardDurationKey; country: DashboardCountry; customRange?: CustomRange | null }): DashboardMetrics {
  const { duration, country, customRange } = args;
  const rand = mulberry32(seedFrom(`${country}|${duration}|${customRange?.startDate ?? ""}|${customRange?.endDate ?? ""}`));

  const base = BASE_REVENUE_BY_COUNTRY[country];
  const factor = DURATION_FACTOR[duration] ?? DURATION_FACTOR.custom;
  const noise = 0.85 + rand() * 0.4;
  const totalRevenue = Math.round(base * factor * noise);

  const comparedToPreviousPercent = Math.round((-7 + rand() * 28) * 10) / 10; // -7..+21
  const profit = Math.round(totalRevenue * (0.12 + rand() * 0.18));
  const loss = Math.round(totalRevenue * (0.05 + rand() * 0.12));
  const leakage = Math.round(totalRevenue * (0.04 + rand() * 0.08));

  const avgDealBase = country === "India" ? 250_000 : country === "UK" ? 180_000 : country === "UAE" ? 210_000 : 190_000;
  const conversionRatePercent = Math.round((20 + rand() * 30) * 10) / 10;

  const closedDeals = Math.max(1, Math.round(totalRevenue / Math.max(avgDealBase * (0.85 + rand() * 0.5), 1)));
  const averageDealValue = Math.round(totalRevenue / Math.max(closedDeals, 1));
  const pendingPipelineValue = Math.round(totalRevenue * (1.15 + rand() * 0.75));

  const aiConfidencePercent = Math.round(68 + rand() * 25);
  const aiPredictedRevenue = Math.round(totalRevenue * (1 + (rand() * 0.22 - 0.06)));

  const totalLeads = Math.round(closedDeals * (10 + rand() * 13));
  const hotLeads = Math.round(totalLeads * (0.18 + rand() * 0.16));

  const todayFactor = duration === "today" ? 1 : 0.65;
  const newLeadsToday = Math.max(1, Math.round(totalLeads * (0.08 + rand() * 0.08) * todayFactor));

  const siteVisitsBooked = Math.max(1, Math.round(closedDeals * (0.7 + rand() * 1.2)));

  // Revenue trend & forecast
  const pointsCount =
    duration === "today" ? 12 : duration === "last7d" ? 7 : duration === "last30d" ? 12 : duration === "last90d" ? 10 : 12;
  const revenueTrend: RevenueTrendPoint[] = Array.from({ length: pointsCount }, (_, i) => {
    const label =
      duration === "today"
        ? `${String(i + 1).padStart(2, "0")}:00`
        : duration === "last7d"
          ? `D${i + 1}`
          : duration === "last30d"
            ? ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][(i + 1) % 12]
            : duration === "last90d"
              ? `W${i + 1}`
              : `M${i + 1}`;
    const t = 0.7 + (i / Math.max(pointsCount - 1, 1)) * 0.8;
    const value = Math.round((totalRevenue / pointsCount) * t * (0.92 + rand() * 0.25));
    const forecast = Math.round(value * (0.96 + rand() * 0.13));
    return { label, value, forecast };
  });

  const funnel: FunnelPoint[] = (() => {
    const qualified = Math.round(totalLeads * (0.55 + rand() * 0.15));
    const siteVisits = Math.round(qualified * (0.42 + rand() * 0.15));
    const offers = Math.round(siteVisits * (0.36 + rand() * 0.14));
    return [
      { stage: "Leads", value: totalLeads },
      { stage: "Qualified", value: qualified },
      { stage: "Site Visits", value: siteVisits },
      { stage: "Offers", value: offers },
      { stage: "Closed", value: closedDeals },
    ];
  })();

  const profitLoss: ProfitLossPoint[] = (() => {
    const count = Math.min(pointsCount, 8);
    return Array.from({ length: count }, (_, i) => {
      const label = duration === "today" ? `H${i + 1}` : `W${i + 1}`;
      const profitPoint = Math.round((profit / count) * (0.8 + rand() * 0.5));
      const lossPoint = Math.round((loss / count) * (0.8 + rand() * 0.6));
      return { label, profit: profitPoint, loss: lossPoint };
    });
  })();

  const countrySet: DashboardCountry[] = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France", "Other"];
  const countryRevenue: CountryRevenueRow[] = countrySet
    .map((c) => {
      const cNoise = 0.85 + rand() * 0.45;
      const cTotal = Math.round(BASE_REVENUE_BY_COUNTRY[c] * factor * cNoise);
      return {
        country: c,
        revenue: cTotal,
        closedDeals: Math.max(1, Math.round(cTotal / Math.max(avgDealBase * (0.85 + rand() * 0.5), 1))),
        forecast: Math.round(cTotal * (1 + (rand() * 0.22 - 0.06))),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const brokerPerformance: BrokerPerformanceRow[] = SEED_BROKERS.map((b, idx) => {
    const w = 0.55 + rand() * 0.9;
    const revenueShare = 0.18 + rand() * 0.85;
    const revenueClosed = Math.round((totalRevenue * revenueShare * w) / (SEED_BROKERS.length * 0.75));
    const commissionEarned = Math.round(revenueClosed * (0.02 + rand() * 0.045));
    const leadsHandled = Math.round(totalLeads / SEED_BROKERS.length * (0.6 + rand() * 0.9));
    const closed = Math.max(1, Math.round(closedDeals * (0.18 + rand() * 0.6) * w * 0.6));
    const conversionRate = Math.round((18 + rand() * 36) * 10) / 10;
    const responseTimeMins = Math.round((2 + rand() * 4) * 10) / 10;
    const badges: BrokerPerformanceRow["badges"] = [];
    if (idx === 0) badges.push("Top Closer");
    const minResp = Math.min(...SEED_BROKERS.map(() => (2 + rand() * 4)));
    if (responseTimeMins <= 2.3 || responseTimeMins <= minResp + 0.1) badges.push("Fast Responder");
    const maxRev = Math.max(...SEED_BROKERS.map(() => revenueClosed));
    if (revenueClosed >= maxRev * 0.6) badges.push("High Revenue");
    if (conversionRate < 28 || responseTimeMins > 4.2) badges.push("Needs Follow-up");
    return {
      id: b.id,
      brokerName: b.name,
      region: b.region,
      leadsHandled,
      closedDeals: closed,
      revenueClosed,
      commissionEarned,
      conversionRate,
      responseTimeMins,
      badges: Array.from(new Set(badges)),
    };
  }).sort((a, b) => b.revenueClosed - a.revenueClosed);

  const topBrokers = brokerPerformance.slice(0, 3);

  const leadsNeedingFollowUp = Array.from({ length: 4 }, (_, i) => {
    const urgency = ["Critical", "High", "Medium"][Math.floor(rand() * 3)]!;
    const reason = [
      "Delayed follow-up",
      "Offer leakage detected",
      "Qualification gap in notes",
      "Site visit not confirmed",
      "Pricing mismatch vs expectations",
    ][Math.floor(rand() * 5)]!;
    return {
      name: ["Aman Verma", "Priya Sharma", "Mohammed Al-Rashid", "Sarah Chen", "Lukas Müller"][Math.floor(rand() * 5)]!,
      country,
      reason,
      urgency,
    };
  });

  const hotOpportunities = Array.from({ length: 3 }, (_, i) => {
    const city = i === 0 ? "Dubai Marina" : i === 1 ? "Noida Sector 150" : "Gurugram Golf Course Road";
    const note =
      i === 0 ? "AI signals show high conversion likelihood." : i === 1 ? "Leads trending hot after last engagement." : "Broker response time improved vs prior week.";
    return { title: `Hot lead cluster #${i + 1}`, country, city, note };
  });

  const lostRevenueReasons = Array.from({ length: 3 }, () => {
    return ["Slow qualification", "Late follow-ups", "Price sensitivity", "Competition capturing inventory", "Conversion drop in offers"][Math.floor(rand() * 5)]!;
  });

  const upcomingSiteVisits = SEED_APPTS.slice(0, 3).map((a, i) => ({
    lead: a.leadName,
    date: a.date,
    time: a.time,
    broker: a.broker ?? "—",
  }));

  const aiRecommendedActions = [
    `Escalate hot leads in ${country} with a <4h response SLA.`,
    "Schedule micro-site-visit blocks for offers nearing closure.",
    "Prioritize the top converting lead source and run a follow-up playbook.",
  ];

  const aiInsights: AiInsightCard[] = [
    {
      whatHappened: `${hotLeads} hot leads need follow-up today in ${country}.`,
      whyItMatters: "Hot leads convert faster; delayed follow-up reduces closure velocity and increases leakage.",
      recommendedAction: "Assign a dedicated broker lane and run 2-touch outreach within 4 hours.",
    },
    {
      whatHappened: `${country} revenue grew ${Math.max(-9, Math.min(22, comparedToPreviousPercent))}% in the selected window.`,
      whyItMatters: "Revenue growth usually comes from improved funnel velocity and better lead quality.",
      recommendedAction: "Double down on the highest-performing lead sources and keep funnel stages aligned.",
    },
    {
      whatHappened: `₹14L pipeline risk due to delayed follow-up (estimated leakage).`,
      whyItMatters: "Leakage at Offer stage correlates strongly with conversion dips vs previous period.",
      recommendedAction: "Trigger offer-stage follow-ups and tighten deal notes to improve buyer readiness.",
    },
  ];

  return {
    duration,
    country,
    totalLeads,
    hotLeads,
    newLeadsToday,
    siteVisitsBooked,
    closedDeals,
    totalRevenue,
    profit,
    loss,
    leakage,
    pendingPipelineValue,
    aiPredictedRevenue,
    aiConfidencePercent,
    conversionRatePercent: conversionRatePercent,
    averageDealValue,
    revenueTrend,
    funnel,
    profitLoss,
    countryRevenue,
    brokerPerformance,
    topBrokers,
    leadsNeedingFollowUp,
    hotOpportunities,
    lostRevenueReasons,
    upcomingSiteVisits,
    aiRecommendedActions,
    aiInsights,
    comparedToPreviousPercent,
  };
}

export async function fetchDashboardMetrics(country: string, duration: DashboardDurationKey, customRange?: CustomRange | null): Promise<DashboardMetrics> {
  // Placeholder: later connect to Supabase revenue/deals/leads tables.
  await new Promise((r) => setTimeout(r, 350 + Math.random() * 250));
  const resolvedCountry = (country as DashboardCountry) ?? "Other";
  return generateMockDashboardMetrics({ duration, country: resolvedCountry as DashboardCountry, customRange });
}

export async function fetchBrokerPerformance(): Promise<BrokerPerformanceRow[]> {
  const base = generateMockDashboardMetrics({ duration: "last30d", country: "Other" }).brokerPerformance;
  return base;
}

export async function fetchRevenueSummary(): Promise<{ totalRevenue: number; predictedRevenue: number }> {
  const base = generateMockDashboardMetrics({ duration: "last30d", country: "Other" });
  return { totalRevenue: base.totalRevenue, predictedRevenue: base.aiPredictedRevenue };
}

export function subscribeToDashboardUpdates(
  onUpdate: (update: { country: DashboardCountry; duration: DashboardDurationKey; metrics: DashboardMetrics }) => void,
): () => void {
  const interval = setInterval(() => {
    const durations: DashboardDurationKey[] = ["today", "last7d", "last30d", "last90d", "thisYear"];
    const countries: DashboardCountry[] = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France", "Other"];
    const duration = durations[Math.floor(Math.random() * durations.length)]!;
    const country = countries[Math.floor(Math.random() * countries.length)]!;
    const metrics = generateMockDashboardMetrics({ duration, country });
    onUpdate({ country, duration, metrics });
  }, 25_000);

  return () => clearInterval(interval);
}

export async function exportDashboardCSV(metrics: DashboardMetrics): Promise<string> {
  // Later: export from backend. For now: minimal broker + KPI snapshot.
  const csvRows: Array<Record<string, string | number>> = [
    {
      duration: metrics.duration,
      country: metrics.country,
      totalRevenue: metrics.totalRevenue,
      profit: metrics.profit,
      loss: metrics.loss,
      leakage: metrics.leakage,
      pendingPipelineValue: metrics.pendingPipelineValue,
      aiPredictedRevenue: metrics.aiPredictedRevenue,
      conversionRate: metrics.conversionRatePercent,
      averageDealValue: metrics.averageDealValue,
    },
  ];

  csvRows.push(
    ...metrics.brokerPerformance.map((b) => ({
      brokerName: b.brokerName,
      region: b.region,
      leadsHandled: b.leadsHandled,
      closedDeals: b.closedDeals,
      revenueClosed: b.revenueClosed,
      commissionEarned: b.commissionEarned,
      conversionRate: b.conversionRate,
      responseTimeMins: b.responseTimeMins,
    })),
  );

  const headers = Object.keys(csvRows[0] ?? {});
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...csvRows.map((r) => headers.map((h) => escape((r as any)[h])).join(","))].join("\n");
  return csv;
}

