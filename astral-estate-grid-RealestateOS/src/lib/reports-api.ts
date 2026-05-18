import { getSupabase, isSupabaseConfigured } from "./supabase-client";
import { SEED_BROKERS, SEED_LEADS, SEED_PROPERTIES, SEED_APPTS } from "./dashboard-data";

export type ReportType =
  | "Lead Report"
  | "Revenue Report"
  | "Broker Performance Report"
  | "Property Report"
  | "Appointment Report"
  | "Trust Verification Report"
  | "AI Forecast Report"
  | "Global Market Report";

export type ReportStatus = "Draft" | "Ready" | "Running" | "Failed" | "Archived";

export type ReportRecord = {
  report_id: string;
  title: string;
  type: ReportType;
  description: string;
  status: ReportStatus;
  date_range: string;
  country: string;
  created_by: string;
  last_updated: number;
  data_count: number;
  download_url: string | null;
  created_at: number;
  updated_at: number;
};

export type ReportFilters = {
  type: "All" | ReportType;
  country: "All" | string;
  status: "All" | ReportStatus;
  createdBy: "All" | string;
  dateRange: { startDate: string; endDate: string };
};

const MOCK_CREATED_BY = ["System", "Aman Singh", "Priya Nair", "Broker Team", "Revenue Squad"];

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

let memory: ReportRecord[] | null = null;

function buildSeedReports(): ReportRecord[] {
  const now = Date.now();
  const base: ReportRecord[] = [
    {
      report_id: "rpt-leads-30d",
      title: "Lead Report · Last 30 Days",
      type: "Lead Report",
      description: "Performance of global lead funnel with AI scores and urgency mix.",
      status: "Ready",
      date_range: "Last 30 Days",
      country: "Global",
      created_by: "System",
      last_updated: now - 15 * 60_000,
      data_count: SEED_LEADS.length,
      download_url: null,
      created_at: now - 7 * 24 * 60_60_000,
      updated_at: now - 15 * 60_000,
    },
    {
      report_id: "rpt-revenue-qtd",
      title: "Revenue Report · QTD",
      type: "Revenue Report",
      description: "Quarter-to-date revenue with region and broker split.",
      status: "Ready",
      date_range: "This Quarter",
      country: "Global",
      created_by: "Revenue Squad",
      last_updated: now - 30 * 60_000,
      data_count: SEED_BROKERS.length,
      download_url: null,
      created_at: now - 10 * 24 * 60_60_000,
      updated_at: now - 30 * 60_000,
    },
    {
      report_id: "rpt-brokers-performance",
      title: "Broker Performance Report · Global",
      type: "Broker Performance Report",
      description: "Broker performance, response times, and conversion with risk flags.",
      status: "Ready",
      date_range: "Last 90 Days",
      country: "Global",
      created_by: "Aman Singh",
      last_updated: now - 60 * 60_000,
      data_count: SEED_BROKERS.length,
      download_url: null,
      created_at: now - 20 * 24 * 60_60_000,
      updated_at: now - 60 * 60_000,
    },
    {
      report_id: "rpt-properties-inventory",
      title: "Property Report · Active Inventory",
      type: "Property Report",
      description: "Active and hot inventory across priority micro-markets.",
      status: "Ready",
      date_range: "This Month",
      country: "Global",
      created_by: "Priya Nair",
      last_updated: now - 45 * 60_000,
      data_count: SEED_PROPERTIES.length,
      download_url: null,
      created_at: now - 5 * 24 * 60_60_000,
      updated_at: now - 45 * 60_000,
    },
    {
      report_id: "rpt-appointments-site-visits",
      title: "Appointment Report · Site Visits",
      type: "Appointment Report",
      description: "Site visit pipeline and attendance with broker mapping.",
      status: "Ready",
      date_range: "Last 30 Days",
      country: "Global",
      created_by: "System",
      last_updated: now - 20 * 60_000,
      data_count: SEED_APPTS.length,
      download_url: null,
      created_at: now - 8 * 24 * 60_60_000,
      updated_at: now - 20 * 60_000,
    },
    {
      report_id: "rpt-trust-verification",
      title: "Trust Verification Report · Global",
      type: "Trust Verification Report",
      description: "Ownership, KYC, and fraud signal checks across markets.",
      status: "Ready",
      date_range: "Last 60 Days",
      country: "Global",
      created_by: "Trust Engine",
      last_updated: now - 50 * 60_000,
      data_count: 120,
      download_url: null,
      created_at: now - 12 * 24 * 60_60_000,
      updated_at: now - 50 * 60_000,
    },
    {
      report_id: "rpt-ai-forecast",
      title: "AI Forecast Report · Multi-market",
      type: "AI Forecast Report",
      description: "Forward-looking revenue, demand, and risk signals.",
      status: "Ready",
      date_range: "Next 90 Days",
      country: "Global",
      created_by: "AI Engine",
      last_updated: now - 10 * 60_000,
      data_count: 48,
      download_url: null,
      created_at: now - 3 * 24 * 60_60_000,
      updated_at: now - 10 * 60_000,
    },
    {
      report_id: "rpt-global-market",
      title: "Global Market Report · Macro",
      type: "Global Market Report",
      description: "Macro-level demand, pricing, and liquidity across regions.",
      status: "Draft",
      date_range: "This Year",
      country: "Global",
      created_by: "Market Intelligence",
      last_updated: now - 120 * 60_000,
      data_count: 0,
      download_url: null,
      created_at: now - 30 * 24 * 60_60_000,
      updated_at: now - 120 * 60_000,
    },
  ];

  // Normalize creators into known list
  for (const r of base) {
    if (!MOCK_CREATED_BY.includes(r.created_by)) {
      r.created_by = "System";
    }
  }

  return base;
}

function ensureMemory(): ReportRecord[] {
  if (!memory) {
    memory = buildSeedReports();
  }
  return memory;
}

export async function fetchReports(filters?: Partial<ReportFilters>): Promise<ReportRecord[]> {
  // Later: connect to Supabase `reports` table with optional filters.
  await delay(260 + Math.random() * 220);

  const items = ensureMemory();
  if (!filters) return [...items];

  const f: ReportFilters = {
    type: filters.type ?? "All",
    country: filters.country ?? "All",
    status: filters.status ?? "All",
    createdBy: filters.createdBy ?? "All",
    dateRange: filters.dateRange ?? { startDate: "", endDate: "" },
  };

  const start = f.dateRange.startDate ? new Date(f.dateRange.startDate).getTime() : null;
  const end = f.dateRange.endDate ? new Date(f.dateRange.endDate).getTime() : null;

  return items.filter((r) => {
    if (f.type !== "All" && r.type !== f.type) return false;
    if (f.country !== "All" && r.country !== f.country) return false;
    if (f.status !== "All" && r.status !== f.status) return false;
    if (f.createdBy !== "All" && r.created_by !== f.createdBy) return false;
    if (start && r.created_at < start) return false;
    if (end && r.created_at > end) return false;
    return true;
  });
}

export async function fetchReportById(reportId: string): Promise<ReportRecord | null> {
  // Later: connect to Supabase `reports` table by primary key.
  await delay(180 + Math.random() * 180);
  const items = ensureMemory();
  return items.find((r) => r.report_id === reportId) ?? null;
}

export async function createReport(partial: Omit<ReportRecord, "report_id" | "created_at" | "updated_at" | "last_updated">): Promise<ReportRecord> {
  // Later: insert into Supabase `reports` and create activity in `report_activity`.
  await delay(220 + Math.random() * 200);
  const items = ensureMemory();
  const now = Date.now();
  const id = `rpt-${items.length + 1}-${Math.floor(Math.random() * 9999)}`;
  const record: ReportRecord = {
    ...partial,
    report_id: id,
    created_at: now,
    updated_at: now,
    last_updated: now,
  };
  items.unshift(record);
  return record;
}

export async function updateReport(reportId: string, patch: Partial<ReportRecord>): Promise<ReportRecord | null> {
  // Later: update Supabase `reports` and push entry into `report_activity`.
  await delay(200 + Math.random() * 160);
  const items = ensureMemory();
  const idx = items.findIndex((r) => r.report_id === reportId);
  if (idx === -1) return null;
  const now = Date.now();
  const merged = { ...items[idx], ...patch, updated_at: now, last_updated: now };
  items[idx] = merged;
  return merged;
}

export async function deleteReport(reportId: string): Promise<boolean> {
  // Later: soft delete in Supabase `reports` and log into `report_activity`.
  await delay(200 + Math.random() * 160);
  const items = ensureMemory();
  const before = items.length;
  memory = items.filter((r) => r.report_id !== reportId);
  return (memory?.length ?? 0) < before;
}

export async function downloadReportCSV(reportId: string): Promise<string> {
  // Later: join `reports` with `report_exports` and stream CSV from storage.
  await delay(240 + Math.random() * 200);
  const items = ensureMemory();
  const report = items.find((r) => r.report_id === reportId);
  const headers = ["report_id", "title", "type", "status", "date_range", "country", "created_by", "data_count"];
  const row = report
    ? [report.report_id, report.title, report.type, report.status, report.date_range, report.country, report.created_by, String(report.data_count)]
    : [reportId, "Unknown", "Unknown", "Failed", "", "", "", "0"];
  return [headers.join(","), row.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")].join("\n");
}

export function subscribeToReportsUpdates(onTick: (record: ReportRecord) => void): () => void {
  // Later: hook into Supabase Realtime on `reports` and `report_activity`.
  const sb = getSupabase();
  void sb;

  const items = ensureMemory();
  if (!isSupabaseConfigured() || !items.length) {
    return () => {};
  }

  const interval = setInterval(() => {
    const idx = Math.floor(Math.random() * items.length);
    const now = Date.now();
    const statusCycle: ReportStatus[] = ["Ready", "Running", "Failed", "Archived"];
    const nextStatus = statusCycle[(statusCycle.indexOf(items[idx].status) + 1) % statusCycle.length] ?? "Ready";
    items[idx] = { ...items[idx], status: nextStatus, last_updated: now, updated_at: now };
    onTick(items[idx]);
  }, 45_000);

  return () => clearInterval(interval);
}

