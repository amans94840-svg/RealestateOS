import { SEED_APPTS, SEED_BROKERS, SEED_LEADS } from "@/lib/dashboard-data";

export type BrokerMarketCountry = "India" | "UAE" | "USA" | "UK" | "Canada" | "Singapore" | "Australia" | "Germany" | "France" | "Other";
export type BrokerDurationKey = "today" | "last7d" | "last30d" | "last90d" | "thisYear" | "custom";

export type BrokerStatusFilter = "All" | "Active" | "On Hold" | "Inactive";
export type PerformanceLevelFilter = "All" | "Strong" | "Balanced" | "At Risk";

export type BrokerBadge = "Top Closer" | "Fast Responder" | "High Revenue" | "Needs Improvement" | "Follow-up Risk" | "Rising Performer";

export type BrokerPerformanceRow = {
  id: string;
  brokerId: string;
  brokerName: string;
  role: "Lead Broker" | "Senior Broker" | "Broker" | "Associate";
  region: string;
  status: "Active" | "On Hold" | "Inactive";

  leadsAssigned: number;
  hotLeadsHandled: number;
  followUpsCompleted: number;
  missedFollowUps: number;

  siteVisitsBooked: number;
  closedDeals: number;

  revenueClosed: number;
  commissionEarned: number;

  conversionRate: number; // 0-100
  responseTimeMins: number;

  performanceScore: number; // 0-100
  rank: number;
  badges: BrokerBadge[];
  reviewed?: boolean;

  // For detail modal
  revenueHistory: number[];
  profitContribution: number;
  lostOpportunitiesValue: number;
  aiSummary: { what: string; why: string; action: string };
  weakAreas: string[];
};

export type BrokerAssignedLeadRow = {
  id: string;
  name: string;
  country: string;
  city: string;
  budget: string;
  aiScore: number;
  urgency: string;
  source: string;
  status: "Offer" | "Site Visit" | "Pending" | "Qualified";
  isHot: boolean;
};

export type BrokerPerformanceAnalytics = {
  duration: BrokerDurationKey;
  country: BrokerMarketCountry;

  kpis: {
    totalBrokers: number;
    activeBrokers: number;
    leadsAssigned: number;
    leadsConverted: number;
    siteVisitsBooked: number;
    closedDeals: number;
    revenueClosed: number;
    avgResponseTimeMins: number;
    topBrokerName: string;
    underperformingCount: number;
    lostRevenueRiskValue: number;
  };

  brokers: BrokerPerformanceRow[];
  brokerRevenueComparison: { label: string; revenue: number }[];
  brokerConversionChart: { label: string; conversion: number }[];
  responseTimeTrend: { label: string; response: number }[];
  leadsVsClosedChart: { label: string; leads: number; closed: number }[];
  lostOpportunityChart: { label: string; value: number }[];
  commissionChart: { label: string; value: number }[];
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

const DURATION_FACTOR: Record<BrokerDurationKey, number> = {
  today: 0.12,
  last7d: 0.3,
  last30d: 0.65,
  last90d: 0.92,
  thisYear: 1.9,
  custom: 0.9,
};

const BASE_REVENUE_BY_COUNTRY: Record<BrokerMarketCountry, number> = {
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

function makeBrokerRole(idx: number): BrokerPerformanceRow["role"] {
  if (idx === 0) return "Lead Broker";
  if (idx <= 1) return "Senior Broker";
  return idx % 3 === 0 ? "Broker" : "Associate";
}

function makeBrokerStatus(rand: () => number, idx: number): BrokerPerformanceRow["status"] {
  if (idx === 0) return "Active";
  const r = rand();
  if (r < 0.78) return "Active";
  if (r < 0.92) return "On Hold";
  return "Inactive";
}

function generateMockBrokerPerformance(params: { duration: BrokerDurationKey; country: BrokerMarketCountry }): BrokerPerformanceAnalytics {
  const { duration, country } = params;
  const rand = mulberry32(seedFrom(`${country}|${duration}`));

  const baseRevenue = BASE_REVENUE_BY_COUNTRY[country];
  const factor = DURATION_FACTOR[duration] ?? DURATION_FACTOR.custom;
  const noise = 0.85 + rand() * 0.4;
  const totalRevenuePool = Math.round(baseRevenue * factor * noise);

  const totalLeadsPool = Math.round((totalRevenuePool / 200_000) * (0.85 + rand() * 0.4));
  const hotLeadsPool = Math.round(totalLeadsPool * (0.18 + rand() * 0.18));

  const assignedRevenueShareWeights = SEED_BROKERS.map((_, idx) => {
    const w = 0.55 + rand() * 1.2;
    // add more weight to earlier brokers (seed rank)
    return w * (1.08 - idx * 0.08);
  });
  const sumW = assignedRevenueShareWeights.reduce((a, b) => a + b, 0);

  const brokers: BrokerPerformanceRow[] = SEED_BROKERS.map((b, idx) => {
    const w = assignedRevenueShareWeights[idx] ?? 1;
    const revenueClosed = Math.round((totalRevenuePool * w) / sumW);

    const leadsAssigned = Math.max(10, Math.round((totalLeadsPool * w) / sumW));
    const hotLeadsHandled = Math.round(hotLeadsPool * (w / sumW));

    // conversion + response
    const conversionRate = Math.round((18 + rand() * 36) * 10) / 10;
    const responseTimeMins = Math.round((1.8 + rand() * 4.2) * 10) / 10;

    const closedDeals = Math.max(1, Math.round((revenueClosed / Math.max(averageDealValueForCountry(country), 1)) * (0.75 + rand() * 0.5)));

    const commissionEarned = Math.round(revenueClosed * (0.03 + rand() * 0.04));

    const followUpsCompleted = Math.round(leadsAssigned * (0.48 + rand() * 0.32));
    const missedFollowUps = Math.round(leadsAssigned * (0.06 + rand() * 0.22));

    const siteVisitsBooked = Math.max(0, Math.round(closedDeals * (0.8 + rand() * 0.6)));

    const performanceScore = clamp(
      Math.round(
        30 +
          (conversionRate / 100) * 30 +
          (1 - responseTimeMins / 6) * 20 +
          (revenueClosed / Math.max(totalRevenuePool, 1)) * 25 -
          (missedFollowUps / Math.max(leadsAssigned, 1)) * 18,
      ),
      0,
      100,
    );

    const reviewed = rand() < 0.18;

    const role = makeBrokerRole(idx);
    const status = makeBrokerStatus(rand, idx);

    const profitContribution = Math.round(revenueClosed * (0.11 + rand() * 0.18));
    const lostOpportunitiesValue = Math.round(missedFollowUps * (avgLostValue(country) * (0.85 + rand() * 0.3)));

    const revenueHistoryCount = duration === "today" ? 7 : 10;
    const revenueHistory = Array.from({ length: revenueHistoryCount }, (_, i) => {
      const t = 0.72 + i / Math.max(revenueHistoryCount - 1, 1) * 0.55;
      return Math.round(revenueClosed * t * (0.88 + rand() * 0.25));
    });

    const weakAreas = pickWeakAreas(country, rand);
    const aiSummary = buildAiSummary({ brokerName: b.name, country, conversionRate, responseTimeMins, missedFollowUps });

    return {
      id: b.id,
      brokerId: b.id,
      brokerName: b.name,
      role,
      region: b.region,
      status,
      leadsAssigned,
      hotLeadsHandled,
      followUpsCompleted,
      missedFollowUps,
      siteVisitsBooked,
      closedDeals,
      revenueClosed,
      commissionEarned,
      conversionRate,
      responseTimeMins,
      performanceScore,
      rank: 0,
      badges: [],
      reviewed,
      revenueHistory,
      profitContribution,
      lostOpportunitiesValue,
      aiSummary,
      weakAreas,
    };
  }).sort((a, b) => b.revenueClosed - a.revenueClosed);

  // assign rank + badges
  const topRevenue = brokers[0]?.revenueClosed ?? 0;
  const minResponse = Math.min(...brokers.map((x) => x.responseTimeMins), 0.01);
  const avgConversion = brokers.reduce((s, x) => s + x.conversionRate, 0) / Math.max(brokers.length, 1);
  const avgPerf = brokers.reduce((s, x) => s + x.performanceScore, 0) / Math.max(brokers.length, 1);

  const ranked = brokers.map((row, idx) => {
    const badges: BrokerPerformanceRow["badges"] = [];
    const wasTop = idx === 0;
    if (wasTop) badges.push("Top Closer");
    if (row.responseTimeMins <= minResponse + 0.01) badges.push("Fast Responder");
    if (row.revenueClosed >= topRevenue * 0.6) badges.push("High Revenue");
    if (row.performanceScore < Math.max(40, avgPerf - 10)) badges.push("Needs Improvement");
    const followUpRatio = row.missedFollowUps / Math.max(row.followUpsCompleted + row.missedFollowUps, 1);
    if (followUpRatio >= 0.18) badges.push("Follow-up Risk");

    // Rising performer: highest delta between first/last revenueHistory
    const delta = row.revenueHistory.at(-1)! - row.revenueHistory[0];
    // quick heuristic: top 1-2 delta
    if (delta >= Math.max(...brokers.map((x) => x.revenueHistory.at(-1)! - x.revenueHistory[0])) * 0.85) {
      badges.push("Rising Performer");
    }
    if (row.conversionRate >= avgConversion + 7) {
      // add another badge flavor for variety
      if (!badges.includes("High Revenue")) badges.push("High Revenue");
    }
    return { ...row, rank: idx + 1, badges: Array.from(new Set(badges)) };
  });

  const activeBrokers = ranked.filter((b) => b.status === "Active").length;
  const leadsConverted = ranked.reduce((s, b) => s + b.closedDeals, 0);
  const leadsAssigned = ranked.reduce((s, b) => s + b.leadsAssigned, 0);

  const underperformingCount = ranked.filter((b) => b.performanceScore < 45).length;
  const lostRevenueRiskValue = ranked.reduce((s, b) => s + Math.round(b.lostOpportunitiesValue * 0.7), 0);

  const topBrokerName = ranked[0]?.brokerName ?? "—";
  const avgResponseTimeMins = ranked.reduce((s, b) => s + b.responseTimeMins, 0) / Math.max(ranked.length, 1);

  // charts: derived from filtered broker list (caller will slice; we still provide full for current selection)
  const brokerRevenueComparison = ranked.map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, revenue: b.revenueClosed }));
  const brokerConversionChart = ranked.map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, conversion: b.conversionRate }));
  const responseTimeTrend = ranked
    .slice(0, 5)
    .map((b, i) => ({ label: `${b.brokerName.split(" ")[0] ?? "Broker"} ${i + 1}`, response: b.responseTimeMins }));
  const leadsVsClosedChart = ranked.slice(0, 6).map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, leads: b.leadsAssigned, closed: b.closedDeals }));
  const lostOpportunityChart = ranked.slice(0, 6).map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, value: b.lostOpportunitiesValue }));
  const commissionChart = ranked.slice(0, 6).map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, value: b.commissionEarned }));

  return {
    duration,
    country,
    kpis: {
      totalBrokers: ranked.length,
      activeBrokers,
      leadsAssigned,
      leadsConverted,
      siteVisitsBooked: ranked.reduce((s, b) => s + b.siteVisitsBooked, 0),
      closedDeals: ranked.reduce((s, b) => s + b.closedDeals, 0),
      revenueClosed: ranked.reduce((s, b) => s + b.revenueClosed, 0),
      avgResponseTimeMins,
      topBrokerName,
      underperformingCount,
      lostRevenueRiskValue,
    },
    brokers: ranked,
    brokerRevenueComparison,
    brokerConversionChart,
    responseTimeTrend,
    leadsVsClosedChart,
    lostOpportunityChart,
    commissionChart,
  };
}

function averageDealValueForCountry(country: BrokerMarketCountry) {
  if (country === "India") return 250_000;
  if (country === "UK") return 180_000;
  if (country === "UAE") return 210_000;
  return 190_000;
}

function avgLostValue(country: BrokerMarketCountry) {
  if (country === "India") return 42_000;
  if (country === "UK") return 30_000;
  return 28_000;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pickWeakAreas(country: BrokerMarketCountry, rand: () => number) {
  const areas = [
    "Slow follow-ups",
    "Offer leakage",
    "Qualification gaps",
    "Response delay",
    "Low show rate",
    "Price mismatch vs expectations",
    "Delayed site visit confirmation",
    "Long lead aging in pipeline",
  ];
  const count = country === "India" ? 3 : 2;
  return Array.from({ length: count }, () => areas[Math.floor(rand() * areas.length)]!);
}

function buildAiSummary(args: { brokerName: string; country: BrokerMarketCountry; conversionRate: number; responseTimeMins: number; missedFollowUps: number }) {
  const { brokerName, country, conversionRate, responseTimeMins, missedFollowUps } = args;
  const what =
    missedFollowUps >= 25
      ? `${brokerName.split(" ")[0]} missed follow-ups increased; ${missedFollowUps} leads at risk this window.`
      : `${brokerName.split(" ")[0]} maintained steady conversion with improving lead velocity.`;

  const why =
    responseTimeMins >= 4.2
      ? "Slow response windows correlate with Offer leakage and reduced closure probability."
      : conversionRate >= 38
        ? "High conversion indicates strong buyer readiness and faster progression through funnel stages."
        : "Mixed funnel momentum suggests selective segments underperformed but overall signal remains actionable.";

  const action =
    missedFollowUps >= 25
      ? "Run a follow-up sprint: contact all at-risk leads within 4 hours and tighten qualification notes."
      : responseTimeMins >= 4.2
        ? "Improve response SLA and batch site-visit confirmations to prevent delayed offers."
        : "Scale best-performing lead sources and maintain tight deal notes for faster closure.";

  return { what, why: `${why} (${country} market signals)`, action };
}

export async function fetchBrokerPerformance(params: {
  duration: BrokerDurationKey;
  country: BrokerMarketCountry;
  // Filters (optional): caller handles slicing; placeholder still accepts.
}): Promise<BrokerPerformanceAnalytics> {
  await new Promise((r) => setTimeout(r, 280 + Math.random() * 220));
  return generateMockBrokerPerformance(params);
}

export async function fetchBrokerDetails(brokerId: string, params: { duration: BrokerDurationKey; country: BrokerMarketCountry }) {
  const performance = await fetchBrokerPerformance({ duration: params.duration, country: params.country });
  return {
    broker: performance.brokers.find((b) => b.brokerId === brokerId) ?? null,
    assignedLeads: mapAssignedLeadsToBroker(brokerId, params.country),
    appointments: SEED_APPTS.filter((a) => a.broker === (performance.brokers.find((x) => x.brokerId === brokerId)?.brokerName ?? "")),
  };
}

function mapAssignedLeadsToBroker(brokerId: string, country: BrokerMarketCountry): BrokerAssignedLeadRow[] {
  // Round-robin assignment based on brokerId.
  const brokers = SEED_BROKERS.map((b) => b.id);
  const startIdx = brokers.indexOf(brokerId);
  const offset = startIdx >= 0 ? startIdx : 0;

  return SEED_LEADS.slice(0, 18)
    .map((l, i) => ({ l, i }))
    .filter(({ i }) => i % SEED_BROKERS.length === offset % SEED_BROKERS.length)
    .filter(({ l }) => (country === "Other" ? true : l.country === country))
    .map(({ l }) => ({
      id: l.id,
      name: l.name,
      country: l.country,
      city: l.city,
      budget: l.budget,
      aiScore: l.aiScore,
      urgency: l.urgency,
      source: l.source,
      status: l.timeline === "Immediately" ? "Site Visit" : l.timeline === "Within 7 Days" ? "Qualified" : "Pending",
      isHot: l.aiScore >= 75,
    }));
}

export async function assignLeadToBroker(_payload: { leadId: string; brokerId: string }): Promise<void> {
  // Placeholder for backend assignment later.
  await new Promise((r) => setTimeout(r, 250));
}

export async function messageBroker(_payload: { brokerId: string; channel: "whatsapp" | "email"; message: string }): Promise<void> {
  await new Promise((r) => setTimeout(r, 180));
}

export async function exportBrokerReportCSV(analytics: BrokerPerformanceAnalytics): Promise<string> {
  const rows: Array<Record<string, string | number>> = [];
  rows.push({
    duration: analytics.duration,
    country: analytics.country,
    totalRevenue: analytics.kpis.revenueClosed,
    avgResponseTimeMins: analytics.kpis.avgResponseTimeMins,
  });
  rows.push(
    ...analytics.brokers.map((b) => ({
      brokerName: b.brokerName,
      region: b.region,
      status: b.status,
      leadsAssigned: b.leadsAssigned,
      hotLeadsHandled: b.hotLeadsHandled,
      followUpsCompleted: b.followUpsCompleted,
      missedFollowUps: b.missedFollowUps,
      siteVisitsBooked: b.siteVisitsBooked,
      closedDeals: b.closedDeals,
      revenueClosed: b.revenueClosed,
      commissionEarned: b.commissionEarned,
      conversionRate: b.conversionRate,
      responseTimeMins: b.responseTimeMins,
      performanceScore: b.performanceScore,
      rank: b.rank,
      badges: b.badges.join("; "),
      reviewed: b.reviewed ? "yes" : "no",
    })),
  );

  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => escape((r as any)[h])).join(","))].join("\n");
  return csv;
}

export function subscribeToBrokerUpdates(onUpdate: (next: BrokerPerformanceAnalytics) => void): () => void {
  const interval = setInterval(() => {
    // For now, just refresh a random selection; caller will decide how to apply.
    const durations: BrokerDurationKey[] = ["today", "last7d", "last30d", "last90d", "thisYear"];
    const countries: BrokerMarketCountry[] = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France", "Other"];
    const duration = durations[Math.floor(Math.random() * durations.length)]!;
    const country = countries[Math.floor(Math.random() * countries.length)]!;
    // Fire-and-forget: we do local update in UI; keep it lightweight.
    void fetchBrokerPerformance({ duration, country }).then(onUpdate);
  }, 25_000);
  return () => clearInterval(interval);
}

