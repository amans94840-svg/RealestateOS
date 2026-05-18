import { SEED_BROKERS, SEED_LEADS, SEED_PROPERTIES } from "@/lib/dashboard-data";
import { getCurrencyRuleForCountry, formatRevenue } from "./revenue-utils";

export type AiInsightStatus = "New" | "In Progress" | "Resolved" | "Ignored";
export type AiInsightCategory =
  | "Lead Conversion"
  | "Revenue Opportunity"
  | "Market Demand"
  | "Broker Performance"
  | "Investor Signal"
  | "Risk Warning"
  | "Follow-up Reminder"
  | "Property Opportunity";

export type AiInsightPriority = "Low" | "Medium" | "High" | "Critical";
export type AiRiskLevel = "Low" | "Medium" | "High";

export type AiInsightRecord = {
  insight_id: string;
  country: string;
  city: string;
  category: AiInsightCategory;
  priority: AiInsightPriority;
  title: string;
  summary: string;

  confidence_score: number; // 0..100
  impact_score: number; // 0..100
  revenue_impact: number; // numeric value used by formatRevenue

  risk_level: AiRiskLevel;
  risk_if_ignored: string;
  recommended_action: string;

  business_impact: string;
  why_it_matters: string;
  supporting_data: string[];

  // Related objects by id (lead/property/broker)
  related_leads: string[];
  related_properties: string[];
  related_brokers: string[];

  status: AiInsightStatus;
  created_at: number;
  updated_at: number;
};

export type AiInsightFilters = {
  country: string;
  category: "All" | AiInsightCategory;
  priority: "All" | AiInsightPriority;
  status: "All" | AiInsightStatus;
  confidenceMin: number; // 0..100
  riskLevel: "All" | AiRiskLevel;
  dateRange: { startDate: string; endDate: string };
};

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

const CATEGORIES: AiInsightCategory[] = [
  "Lead Conversion",
  "Revenue Opportunity",
  "Market Demand",
  "Broker Performance",
  "Investor Signal",
  "Risk Warning",
  "Follow-up Reminder",
  "Property Opportunity",
];

const PRIORITIES: AiInsightPriority[] = ["Low", "Medium", "High", "Critical"];
const STATUS: AiInsightStatus[] = ["New", "In Progress", "Resolved", "Ignored"];
const RISK: AiRiskLevel[] = ["Low", "Medium", "High"];

const CITIES_BY_COUNTRY: Record<string, string[]> = {
  India: ["Mumbai", "Delhi NCR", "Gurugram", "Noida", "Bengaluru"],
  UAE: ["Dubai", "Abu Dhabi", "Sharjah"],
  USA: ["New York", "Los Angeles", "Miami", "San Francisco"],
  UK: ["London", "Manchester", "Birmingham"],
  Canada: ["Toronto", "Vancouver", "Calgary"],
  Singapore: ["Singapore"],
  Australia: ["Sydney", "Melbourne", "Brisbane"],
  Germany: ["Berlin", "Munich"],
  France: ["Paris", "Lyon"],
  "Saudi Arabia": ["Riyadh", "Jeddah"],
  Other: ["Global"],
};

const DEFAULT_DATE_WINDOW_DAYS = 21;

let memoryByCountry: Record<string, AiInsightRecord[]> | null = null;

function getOrBuildMemory() {
  if (memoryByCountry) return memoryByCountry;

  const allCountries = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France", "Saudi Arabia", "Other"];

  memoryByCountry = {};
  for (const c of allCountries) {
    const rand = mulberry32(seedFrom(`ai|${c}`));
    const cities = CITIES_BY_COUNTRY[c] ?? CITIES_BY_COUNTRY.Other;
    const count = 14;
    const recs: AiInsightRecord[] = Array.from({ length: count }, (_, idx) => {
      const category = CATEGORIES[Math.floor(rand() * CATEGORIES.length)]!;
      const priority = PRIORITIES[Math.floor(rand() * PRIORITIES.length)]!;
      const risk_level = RISK[Math.floor(rand() * RISK.length)]!;
      const confidence_score = Math.round(55 + rand() * 44);
      const impact_score = Math.round(35 + rand() * 60);

      const currencyRule = getCurrencyRuleForCountry(c);
      // numeric revenue impacts (keeps formatRevenue logic in sync)
      const base =
        c === "India"
          ? 14_000_00 // 14L
          : c === "UAE"
            ? 850_000
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
                        : c === "Saudi Arabia"
                          ? 740_000
                          : 1_000_000;

      const revenue_impact = Math.round(base * (0.55 + rand() * 1.05) * (priority === "Critical" ? 1.22 : priority === "High" ? 1.08 : 0.92));

      const title = `${category}: ${cities[Math.floor(rand() * cities.length)]}`;
      const city = cities[Math.floor(rand() * cities.length)]!;

      const related_leads = SEED_LEADS.filter((l) => (c === "Other" ? true : l.country === c)).slice(0, 3 + Math.floor(rand() * 3)).map((l) => l.id);
      const related_properties = SEED_PROPERTIES.filter((p) => (c === "Other" ? true : p.country === c)).slice(0, 2 + Math.floor(rand() * 3)).map((p) => p.id);
      const related_brokers = SEED_BROKERS.map((b) => b.id).slice(0, 1 + Math.floor(rand() * 3));

      const supporting_data = [
        `Confidence model: ${confidence_score}/100 for ${city} funnel signals.`,
        `Funnel delta: ${Math.round(-8 + rand() * 28)}% vs previous period.`,
        `Broker velocity: response time ${Math.round(2 + rand() * 4) / 10}h improved (mock).`,
      ];

      const business_impact =
        c === "India"
          ? `Potential ₹ impact in ${city} if action is taken within 48h.`
          : `Potential ${currencyRule.symbol.trim()} impact in ${city} if action is taken within 48h.`;

      const why_it_matters =
        priority === "Critical"
          ? "Critical priority insights tend to convert late-stage faster when follow-up is executed immediately."
          : "Timely action reduces leakage at Offer/Closure stages and improves conversion velocity.";

      const recommended_action = (() => {
        if (category === "Follow-up Reminder") return `Prioritize follow-ups for ${city} and close the loop within 4 hours.`;
        if (category === "Risk Warning") return `Run a risk check: confirm buyer readiness and verify offer details for ${city}.`;
        if (category === "Revenue Opportunity") return `Escalate highest-intent leads in ${city}; schedule site visits for top AI-scored buyers.`;
        if (category === "Lead Conversion") return `Improve qualification notes and accelerate next-touch for ${city}.`;
        return `Focus on ${city}: align broker action plan with the highest-confidence segments.`;
      })();

      const risk_if_ignored = (() => {
        if (risk_level === "High") return `Ignoring this may cause ${formatRevenue(revenue_impact * 0.35, c, currencyRule.symbol)} leakage risk.`;
        if (risk_level === "Medium") return `Ignoring this may lower conversion by ~${Math.round(6 + rand() * 12)}% in ${city}.`;
        return `Ignoring this will slow progress, reducing expected outcomes in ${city}.`;
      })();

      const status: AiInsightStatus =
        idx % 7 === 0
          ? "Resolved"
          : idx % 5 === 0
            ? "In Progress"
            : idx % 9 === 0
              ? "Ignored"
              : "New";

      const now = Date.now();
      const created_at = now - Math.round((idx + 1) * 1000 * 60 * 60 * 24 * (DEFAULT_DATE_WINDOW_DAYS / count)) * (0.7 + rand());
      const updated_at = created_at + Math.round(rand() * 1000 * 60 * 60 * 12);

      return {
        insight_id: `ins-${c}-${idx}-${Math.floor(rand() * 9999)}`,
        country: c,
        city,
        category,
        priority,
        title,
        summary: `${category} signal detected in ${city} with ${confidence_score}% confidence.`,
        confidence_score,
        impact_score,
        revenue_impact,
        risk_level,
        risk_if_ignored,
        recommended_action,
        business_impact,
        why_it_matters,
        supporting_data,
        related_leads,
        related_properties,
        related_brokers,
        status,
        created_at,
        updated_at,
      };
    });

    memoryByCountry[c] = recs;
  }

  return memoryByCountry;
}

export async function fetchAIInsights(country: string, filters?: Partial<AiInsightFilters>): Promise<AiInsightRecord[]> {
  await new Promise((r) => setTimeout(r, 280 + Math.random() * 200));

  const memory = getOrBuildMemory();
  const resolvedCountry = country || "Other";
  const base = memory[resolvedCountry] ?? [];

  if (!filters) return base;

  const f: AiInsightFilters = {
    country: resolvedCountry,
    category: filters.category ?? "All",
    priority: filters.priority ?? "All",
    status: filters.status ?? "All",
    confidenceMin: filters.confidenceMin ?? 0,
    riskLevel: filters.riskLevel ?? "All",
    dateRange: filters.dateRange ?? { startDate: "", endDate: "" },
  };

  const start = f.dateRange.startDate ? new Date(f.dateRange.startDate).getTime() : null;
  const end = f.dateRange.endDate ? new Date(f.dateRange.endDate).getTime() : null;

  return base.filter((i) => {
    if (f.category !== "All" && i.category !== f.category) return false;
    if (f.priority !== "All" && i.priority !== f.priority) return false;
    if (f.status !== "All" && i.status !== f.status) return false;
    if (i.confidence_score < f.confidenceMin) return false;
    if (f.riskLevel !== "All" && i.risk_level !== f.riskLevel) return false;
    if (start != null && i.created_at < start) return false;
    if (end != null && i.created_at > end) return false;
    return true;
  });
}

export async function fetchInsightById(insightId: string): Promise<AiInsightRecord | null> {
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));
  const memory = getOrBuildMemory();
  for (const country of Object.keys(memory)) {
    const hit = memory[country]?.find((x) => x.insight_id === insightId);
    if (hit) return hit;
  }
  return null;
}

export async function updateInsightStatus(insightId: string, status: AiInsightStatus): Promise<AiInsightRecord | null> {
  await new Promise((r) => setTimeout(r, 180 + Math.random() * 180));
  const memory = getOrBuildMemory();
  for (const country of Object.keys(memory)) {
    const list = memory[country];
    const idx = list?.findIndex((x) => x.insight_id === insightId) ?? -1;
    if (idx >= 0) {
      const next = { ...list[idx], status, updated_at: Date.now() };
      list[idx] = next;
      return next;
    }
  }
  return null;
}

export type FollowUpTask = {
  follow_up_id: string;
  insight_id: string;
  title: string;
  status: "In Progress" | "Done";
  created_at: number;
};

export async function createFollowUpFromInsight(insightId: string): Promise<FollowUpTask | null> {
  const hit = await fetchInsightById(insightId);
  if (!hit) return null;

  await new Promise((r) => setTimeout(r, 180 + Math.random() * 120));
  return {
    follow_up_id: `fu-${insightId}-${Math.floor(Math.random() * 9999)}`,
    insight_id: hit.insight_id,
    title: `Follow-up: ${hit.title}`,
    status: "In Progress",
    created_at: Date.now(),
  };
}

export async function assignBrokerToInsight(_insightId: string, _brokerId: string): Promise<void> {
  // Placeholder: later connect to supabase (insight_broker assignments table)
  await new Promise((r) => setTimeout(r, 200));
}

export async function subscribeToAIInsightsUpdates(
  onUpdate: (next: { insight_id: string; status: AiInsightStatus }) => void,
): Promise<() => void> {
  // Placeholder: later wire to Supabase realtime.
  const interval = setInterval(() => {
    const memory = getOrBuildMemory();
    const countries = Object.keys(memory);
    const c = countries[Math.floor(Math.random() * countries.length)]!;
    const list = memory[c] ?? [];
    if (!list.length) return;
    const pick = list[Math.floor(Math.random() * list.length)]!;
    const nextStatus: AiInsightStatus = pick.status === "New" ? "In Progress" : pick.status === "In Progress" ? "Resolved" : "New";
    onUpdate({ insight_id: pick.insight_id, status: nextStatus });
  }, 30_000);

  return () => clearInterval(interval);
}

