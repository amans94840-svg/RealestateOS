import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader } from "../utils";
import { ActivityFeed } from "../ActivityFeed";
import { cn } from "@/lib/utils";
import {
  AreaChart as AreaChartIcon,
  Brain,
  Calendar,
  Clipboard,
  Copy,
  DollarSign,
  Download,
  Filter,
  FilterX,
  Flame,
  Globe,
  RefreshCcw,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatRevenue, getCurrencyRuleForCountry } from "@/lib/revenue-utils";
import {
  exportDashboardCSV,
  fetchDashboardMetrics,
  subscribeToDashboardUpdates,
  type DashboardCountry,
  type DashboardDurationKey,
  type DashboardMetrics,
  type BrokerPerformanceRow,
} from "@/lib/dashboard-overview-api";

const DEFAULT_COUNTRY: DashboardCountry = "India";
const DEFAULT_DURATION: DashboardDurationKey = "last30d";
const COUNTRY_OPTIONS: DashboardCountry[] = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France", "Other"];

const DURATION_OPTIONS: Array<{ key: DashboardDurationKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "last7d", label: "Last 7 Days" },
  { key: "last30d", label: "Last 30 Days" },
  { key: "last90d", label: "Last 90 Days" },
  { key: "thisYear", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

function durationLabel(key: DashboardDurationKey) {
  const m = new Map(DURATION_OPTIONS.map((d) => [d.key, d.label]));
  return m.get(key) ?? "Custom Range";
}

function currencySymbol(country: DashboardCountry) {
  return getCurrencyRuleForCountry(country).symbol;
}

function kpiBadgeText(n: number, positiveText: string, negativeText: string) {
  if (!Number.isFinite(n)) return "—";
  return n >= 0 ? positiveText : negativeText;
}

export function DashboardSection() {
  const { setActive, setLeadFilters, pushActivity } = useDashboard();

  const [selectedCountry, setSelectedCountry] = useState<DashboardCountry>(DEFAULT_COUNTRY);
  const [selectedDuration, setSelectedDuration] = useState<DashboardDurationKey>(DEFAULT_DURATION);

  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string }>({
    startDate: "",
    endDate: "",
  });
  const [customModalOpen, setCustomModalOpen] = useState(false);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);

  const [brokerModalOpen, setBrokerModalOpen] = useState(false);
  const [brokerDetail, setBrokerDetail] = useState<BrokerPerformanceRow | null>(null);

  const updateMetrics = async (opts?: { reason?: string }) => {
    setIsUpdating(true);
    const toastId = toast.loading("Updating dashboard metrics…");
    try {
      const data = await fetchDashboardMetrics(selectedCountry, selectedDuration, selectedDuration === "custom" ? customRange : null);
      setMetrics(data);
      pushActivity(
        `Dashboard updated: ${selectedCountry} · ${durationLabel(selectedDuration)}`,
        "activity",
        "revenue",
      );
      toast.success("Revenue data updated for selected period", { id: toastId });
    } catch {
      toast.error("Failed to update dashboard metrics", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    void updateMetrics({ reason: "initial" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedDuration === "custom") return;
    void updateMetrics({ reason: "selection" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, selectedDuration]);

  useEffect(() => {
    const unsubscribe = subscribeToDashboardUpdates(({ country, duration, metrics: next }) => {
      if (country === selectedCountry && duration === selectedDuration) {
        setMetrics(next);
      }
    });
    return unsubscribe;
  }, [selectedCountry, selectedDuration]);

  const cSym = currencySymbol(selectedCountry);

  const profitBadge = metrics?.profit - metrics?.loss >= 0 ? "text-emerald-300" : "text-red-300";

  const shareSummaryText = useMemo(() => {
    if (!metrics) return "";
    const revenue = formatRevenue(metrics.totalRevenue, selectedCountry, cSym);
    const profit = formatRevenue(metrics.profit, selectedCountry, cSym);
    const loss = formatRevenue(metrics.loss, selectedCountry, cSym);
    return [
      "Business Command Center",
      `Country: ${selectedCountry}`,
      `Duration: ${metrics.duration}`,
      `Revenue: ${revenue}`,
      `Profit: ${profit}`,
      `Loss/Leakage: ${loss} (leakage ${formatRevenue(metrics.leakage, selectedCountry, cSym)})`,
      `AI Forecast: ${formatRevenue(metrics.aiPredictedRevenue, selectedCountry, cSym)} (confidence ${metrics.aiConfidencePercent}%)`,
    ].join("\n");
  }, [metrics, selectedCountry, cSym]);

  const handleShareWhatsApp = () => {
    if (!metrics) return;
    if (typeof window !== "undefined") {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareSummaryText)}`, "_blank", "noopener,noreferrer");
    }
    toast.success("WhatsApp share opened");
  };

  const handleShareEmail = () => {
    if (!metrics) return;
    if (typeof window !== "undefined") {
      window.location.href = `mailto:?subject=${encodeURIComponent("Business Command Center")}&body=${encodeURIComponent(shareSummaryText)}`;
    }
    toast.success("Email draft opened");
  };

  const handleCopyLink = async () => {
    if (!metrics) return;
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/dashboard?country=${encodeURIComponent(selectedCountry)}&duration=${encodeURIComponent(selectedDuration)}`
        : "";
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        toast.error("Clipboard not available");
        return;
      }
      setShareCopied(true);
      toast.success("Report link copied");
      setTimeout(() => setShareCopied(false), 1200);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleExportCSV = async () => {
    if (!metrics) return;
    const csv = await exportDashboardCSV(metrics);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard_${selectedCountry}_${selectedDuration}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Dashboard CSV exported");
  };

  const openBrokerModal = (b: BrokerPerformanceRow) => {
    setBrokerDetail(b);
    setBrokerModalOpen(true);
  };

  const kpiCards = useMemo(() => {
    if (!metrics) return [];

    return [
      {
        label: "Total Leads",
        value: metrics.totalLeads,
        sub: "All markets · broker-ready",
        icon: <Users className="h-4.5 w-4.5" />,
        click: () => setActive("leads"),
        color: "var(--neon)",
      },
      {
        label: "Hot Leads",
        value: metrics.hotLeads,
        sub: "High AI score · urgent follow-up",
        icon: <Flame className="h-4.5 w-4.5" />,
        click: () => {
          setLeadFilters({ hot: true });
          setActive("leads");
        },
        color: "oklch(0.78 0.2 30)",
      },
      {
        label: "New Leads Today",
        value: metrics.newLeadsToday,
        sub: "Fresh momentum window",
        icon: <Calendar className="h-4.5 w-4.5" />,
        click: () => setActive("leads"),
        color: "oklch(0.85 0.18 200)",
      },
      {
        label: "Site Visits Booked",
        value: metrics.siteVisitsBooked,
        sub: "Upcoming schedules",
        icon: <Calendar className="h-4.5 w-4.5" />,
        click: () => setActive("appointments"),
        color: "oklch(0.82 0.2 150)",
      },
      {
        label: "Closed Deals",
        value: metrics.closedDeals,
        sub: "Offer → closure",
        icon: <DollarSign className="h-4.5 w-4.5" />,
        click: () => setActive("revenue"),
        color: "var(--neon)",
      },
      {
        label: "Total Revenue",
        value: formatRevenue(metrics.totalRevenue, selectedCountry, cSym),
        sub: `${metrics.comparedToPreviousPercent >= 0 ? "+" : ""}${metrics.comparedToPreviousPercent}% vs previous`,
        icon: <Wallet className="h-4.5 w-4.5" />,
        click: () => setActive("revenue"),
        color: "var(--neon)",
      },
      {
        label: "Profit",
        value: formatRevenue(metrics.profit, selectedCountry, cSym),
        sub: profitBadge,
        icon: <TrendingUp className="h-4.5 w-4.5" />,
        click: () => setActive("revenue"),
        color: "oklch(0.82 0.2 150)",
      },
      {
        label: "Loss / Leakage",
        value: formatRevenue(metrics.loss + metrics.leakage, selectedCountry, cSym),
        sub: metrics.leakage >= metrics.loss ? "Leakage risk" : "Loss impact",
        icon: <TrendingDown className="h-4.5 w-4.5" />,
        click: () => setActive("ai-insights"),
        color: "oklch(0.65 0.24 22)",
      },
      {
        label: "Pending Pipeline Value",
        value: formatRevenue(metrics.pendingPipelineValue, selectedCountry, cSym),
        sub: "At-risk conversion",
        icon: <Sparkles className="h-4.5 w-4.5" />,
        click: () => setActive("leads"),
        color: "oklch(0.85 0.18 200)",
      },
      {
        label: "AI Predicted Revenue",
        value: formatRevenue(metrics.aiPredictedRevenue, selectedCountry, cSym),
        sub: `Confidence ${metrics.aiConfidencePercent}%`,
        icon: <Brain className="h-4.5 w-4.5" />,
        click: () => setActive("forecast"),
        color: "var(--neon)",
      },
      {
        label: "Conversion Rate",
        value: `${metrics.conversionRatePercent.toFixed(1)}%`,
        sub: "Leads → closure",
        icon: <Brain className="h-4.5 w-4.5" />,
        click: () => setActive("ai-insights"),
        color: "oklch(0.78 0.2 30)",
      },
      {
        label: "Average Deal Value",
        value: formatRevenue(metrics.averageDealValue, selectedCountry, cSym),
        sub: "Best segment mix",
        icon: <DollarSign className="h-4.5 w-4.5" />,
        click: () => setActive("revenue"),
        color: "var(--neon)",
      },
    ];
  }, [metrics, setActive, setLeadFilters, selectedCountry, cSym, profitBadge]);

  const emptyState = (
    <div className="glass rounded-2xl p-6 text-slate-300">
      No dashboard metrics loaded. Refresh to fetch mock data.
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Business Command Center"
        subtitle="Track profit, growth, loss, leads, hot leads, revenue, pipeline, appointments, broker performance, and AI recommendations."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setShareOpen(true)} disabled={!metrics}>
            <Share2 className="mr-2 h-4 w-4" />
            Share Summary
          </Button>
          <Button variant="outline" size="sm" onClick={() => setExportOpen(true)} disabled={!metrics}>
            <Download className="mr-2 h-4 w-4" />
            Export Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void updateMetrics({ reason: "manual-refresh" })}
            disabled={isUpdating}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void updateMetrics({ reason: "apply-filters" })}
            disabled={isUpdating}
          >
            <Filter className="mr-2 h-4 w-4" />
            Apply Filters
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedCountry(DEFAULT_COUNTRY);
              setSelectedDuration(DEFAULT_DURATION);
              setCustomRange({ startDate: "", endDate: "" });
              toast.success("Filters cleared");
              void updateMetrics({ reason: "clear-filters" });
            }}
            disabled={isUpdating}
          >
            <FilterX className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        </div>
      </SectionHeader>

      <GlowCard className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Country
            </div>
            <Select value={selectedCountry} onValueChange={(v) => setSelectedCountry(v as DashboardCountry)}>
              <SelectTrigger className="w-[190px] border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {COUNTRY_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <AreaChartIcon className="h-4 w-4 text-primary" />
              Duration
            </div>
            <Select
              value={selectedDuration}
              onValueChange={(v) => {
                const key = v as DashboardDurationKey;
                if (key === "custom") {
                  setCustomModalOpen(true);
                  return;
                }
                setSelectedDuration(key);
              }}
            >
              <SelectTrigger className="w-[205px] border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {DURATION_OPTIONS.filter((d) => d.key !== "custom").map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            {isUpdating ? (
              <Badge variant="outline" className="border-white/10 text-slate-200">
                Updating…
              </Badge>
            ) : (
              <Badge variant="outline" className="border-white/10 text-slate-200">
                {durationLabel(selectedDuration)}
              </Badge>
            )}
          </div>
        </div>
      </GlowCard>

      {isUpdating && !metrics ? (
        <div className="glass rounded-2xl p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--neon)] animate-pulse" />
            <div className="text-sm text-slate-300">Loading dashboard command center…</div>
          </div>
          <Badge variant="outline" className="border-white/10">Realtime mock</Badge>
        </div>
      ) : null}

      {!metrics ? emptyState : null}

      {metrics ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpiCards.map((k) => (
              <GlowCard
                key={k.label}
                onClick={k.click}
                className="!p-4 cursor-pointer hover:neon-border transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="h-10 w-10 rounded-xl flex items-center justify-center"
                    style={{
                      background: `color-mix(in oklab, ${k.color} 15%, transparent)`,
                      border: `1px solid color-mix(in oklab, ${k.color} 35%, transparent)`,
                    }}
                  >
                    {k.icon}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                    {k.label === "Profit" || k.label === "Loss / Leakage" ? k.sub : metrics ? k.sub : ""}
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-3xl font-bold tracking-tight">{k.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <Badge variant="outline" className={cn("border-white/10 text-xs", k.label === "Profit" ? "text-emerald-300" : "")}>
                    {k.label === "Profit" ? kpiBadgeText(metrics.profit - metrics.loss, "Up", "Down") : "Live"}
                  </Badge>
                  <Badge variant="outline" className="border-white/10 text-xs">{selectedCountry}</Badge>
                </div>
              </GlowCard>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlowCard className="!p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Revenue Growth</div>
                      <div className="text-xs text-muted-foreground">Actual vs forecast · currency-aware</div>
                    </div>
                    <Badge variant="outline" className="border-white/10">{selectedCountry}</Badge>
                  </div>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={metrics.revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                        <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                        <YAxis
                          stroke="oklch(0.7 0.03 255)"
                          fontSize={10}
                          tickFormatter={(v) => formatRevenue(v, selectedCountry, cSym)}
                        />
                        <RTooltip />
                        <Legend />
                        <Line dataKey="value" name="Actual" stroke="var(--neon)" strokeWidth={2} dot={false} />
                        <Line dataKey="forecast" name="Forecast" stroke="oklch(0.85 0.18 200)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlowCard>

                <GlowCard className="!p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Lead Conversion Funnel</div>
                      <div className="text-xs text-muted-foreground">Leads → closure</div>
                    </div>
                    <Badge variant="outline" className="border-white/10">{selectedDuration}</Badge>
                  </div>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.funnel} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                        <XAxis type="number" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                        <YAxis dataKey="stage" type="category" stroke="oklch(0.7 0.03 255)" fontSize={10} width={130} />
                        <RTooltip />
                        <Bar dataKey="value" fill="var(--neon)" radius={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlowCard>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <GlowCard className="!p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Profit vs Loss</div>
                      <div className="text-xs text-muted-foreground">Broker velocity impacts leakage</div>
                    </div>
                    <Badge variant="outline" className="border-white/10">
                      <span className={profitBadge}>{metrics.profit >= metrics.loss ? "Profit zone" : "Leakage zone"}</span>
                    </Badge>
                  </div>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.profitLoss}>
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                        <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                        <YAxis stroke="oklch(0.7 0.03 255)" fontSize={10} tickFormatter={(v) => formatRevenue(v, selectedCountry, cSym)} />
                        <RTooltip />
                        <Legend />
                        <Bar dataKey="profit" name="Profit" fill="oklch(0.82 0.2 150)" radius={8} />
                        <Bar dataKey="loss" name="Loss" fill="oklch(0.65 0.24 22)" radius={8} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </GlowCard>

                <GlowCard className="!p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Country-wise Revenue</div>
                      <div className="text-xs text-muted-foreground">Market mix for the selected period</div>
                    </div>
                    <Badge variant="outline" className="border-white/10">Donut mix</Badge>
                  </div>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.countryRevenue.map((r) => ({ name: r.country, value: r.revenue, forecast: r.forecast }))}
                          dataKey="value"
                          nameKey="name"
                          outerRadius={110}
                          innerRadius={55}
                          paddingAngle={3}
                          labelLine={false}
                        >
                          {metrics.countryRevenue.map((_, idx) => (
                            <Cell
                              key={idx}
                              fill={idx === 0 ? "var(--neon)" : idx === 1 ? "oklch(0.85 0.18 200)" : idx === 2 ? "oklch(0.82 0.2 150)" : "oklch(0.7 0.25 300)"}
                            />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Click a country KPI to rebase formatting + charts.
                  </div>
                </GlowCard>
              </div>

              <GlowCard className="!p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold">Broker Performance</div>
                    <div className="text-xs text-muted-foreground">Ranked by revenue closed</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => toast.success("Broker panel is interactive")}>
                    Broker Insights
                  </Button>
                </div>
                <div className="mt-3 h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.brokerPerformance}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                      <XAxis dataKey="brokerName" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                      <YAxis stroke="oklch(0.7 0.03 255)" fontSize={10} tickFormatter={(v) => formatRevenue(v, selectedCountry, cSym)} />
                      <RTooltip />
                      <Bar dataKey="revenueClosed" fill="var(--neon)" radius={10} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </GlowCard>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <GlowCard className="!p-4 lg:col-span-2">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">AI Insight Cards</div>
                      <div className="text-xs text-muted-foreground">What happened · why it matters · recommended action</div>
                    </div>
                    <Badge variant="outline" className="border-white/10">{metrics.aiInsights.length} insights</Badge>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    {metrics.aiInsights.map((ins, idx) => (
                      <Card key={idx} className="glass border-white/10 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            Insight
                          </div>
                          <Badge variant="outline" className="border-white/10">{idx + 1}</Badge>
                        </div>
                        <div className="mt-2 text-sm font-semibold">{ins.whatHappened}</div>
                        <div className="mt-2 text-sm text-slate-300">{ins.whyItMatters}</div>
                        <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Action</div>
                        <div className="mt-1 text-sm text-slate-200 neon-text">{ins.recommendedAction}</div>
                      </Card>
                    ))}
                  </div>
                </GlowCard>

                <GlowCard className="!p-4">
                  <div className="text-sm font-semibold">Hot Opportunities</div>
                  <div className="text-xs text-muted-foreground">Fast response boosts closure velocity</div>
                  <div className="mt-3 space-y-3">
                    {metrics.hotOpportunities.map((o, idx) => (
                      <div key={idx} className="glass rounded-xl border-white/10 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold">{o.title}</div>
                          <Badge variant="outline" className="border-white/10">{o.country}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">{o.city}</div>
                        <div className="mt-2 text-sm text-slate-300">{o.note}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button variant="outline" size="sm" onClick={() => setActive("leads")}>
                      View Leads
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActive("revenue")}>
                      View Revenue
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setActive("appointments")}>
                      View Appointments
                    </Button>
                  </div>
                </GlowCard>
              </div>
            </div>

            <div className="space-y-4">
              <ActivityFeed />

              <GlowCard className="!p-4">
                <div className="text-sm font-semibold">Broker Friendly Panels</div>
                <div className="text-xs text-muted-foreground">Action-ready lists for the next 4–6 hours</div>

                <div className="mt-4 space-y-4">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Top Performing Brokers</div>
                    <div className="space-y-2">
                      {metrics.topBrokers.map((b) => (
                        <div key={b.id} className="flex items-center justify-between gap-3 glass rounded-xl border-white/10 p-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                              <div className="font-semibold truncate">{b.brokerName}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">{b.region}</div>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => openBrokerModal(b)}>
                            View Broker Report
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Leads Needing Follow-up</div>
                    <div className="space-y-2">
                      {metrics.leadsNeedingFollowUp.map((l, idx) => (
                        <div key={idx} className="glass rounded-xl border-white/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{l.name}</div>
                              <div className="text-xs text-muted-foreground">{l.country}</div>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn("border-white/10", l.urgency === "Critical" ? "text-red-300" : l.urgency === "High" ? "text-yellow-200" : "text-slate-200")}
                            >
                              {l.urgency}
                            </Badge>
                          </div>
                          <div className="mt-2 text-sm text-slate-300">{l.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Lost Revenue Reasons</div>
                    <div className="flex flex-wrap gap-2">
                      {metrics.lostRevenueReasons.map((r, idx) => (
                        <Badge key={idx} variant="outline" className="border-white/10">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Upcoming Site Visits</div>
                    <div className="space-y-2">
                      {metrics.upcomingSiteVisits.map((v, idx) => (
                        <div key={idx} className="glass rounded-xl border-white/10 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate">{v.lead}</div>
                              <div className="text-xs text-muted-foreground">{v.broker}</div>
                            </div>
                            <Badge variant="outline" className="border-white/10">
                              {v.date} · {v.time}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">AI Recommended Actions</div>
                    <div className="space-y-2">
                      {metrics.aiRecommendedActions.map((a, idx) => (
                        <div key={idx} className="glass rounded-xl border-white/10 p-3">
                          <div className="text-sm text-slate-200 neon-text">{a}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlowCard>
            </div>
          </div>
        </>
      ) : null}

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={(o) => !o && setShareOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Share Dashboard Summary</DialogTitle>
            <DialogDescription className="text-slate-400">WhatsApp / Email / Copy Link</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button onClick={handleShareWhatsApp} disabled={!metrics} className="w-full">
              <Share2 className="mr-2 h-4 w-4" />
              Share via WhatsApp
            </Button>
            <Button variant="outline" onClick={handleShareEmail} disabled={!metrics} className="w-full">
              <Sparkles className="mr-2 h-4 w-4" />
              Share via Email
            </Button>
            <Button variant="outline" onClick={() => void handleCopyLink()} disabled={!metrics} className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              {shareCopied ? "Link Copied" : "Copy Report Link"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Modal */}
      <Dialog open={exportOpen} onOpenChange={(o) => !o && setExportOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Export Dashboard</DialogTitle>
            <DialogDescription className="text-slate-400">Download a CSV snapshot using mock local data</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="glass rounded-xl border-white/10 p-3">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Country</div>
              <div className="text-sm font-semibold mt-1">{selectedCountry}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-2">Duration</div>
              <div className="text-sm font-semibold mt-1">{durationLabel(selectedDuration)}</div>
            </div>
            <Button onClick={() => void handleExportCSV()} className="w-full" disabled={!metrics}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Broker Modal */}
      <Dialog open={brokerModalOpen} onOpenChange={(o) => !o && setBrokerModalOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-3xl">
          <DialogHeader>
            <DialogTitle>{brokerDetail?.brokerName ?? "Broker"} Report</DialogTitle>
            <DialogDescription className="text-slate-400">
              Region: {brokerDetail?.region ?? "—"} · Badges: {brokerDetail?.badges?.join(", ") ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-3">
            {brokerDetail && metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Leads handled</div>
                    <div className="mt-2 text-2xl font-semibold">{brokerDetail.leadsHandled}</div>
                  </GlowCard>
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Closed deals</div>
                    <div className="mt-2 text-2xl font-semibold">{brokerDetail.closedDeals}</div>
                  </GlowCard>
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Revenue closed</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatRevenue(brokerDetail.revenueClosed, selectedCountry, cSym)}
                    </div>
                  </GlowCard>
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Commission earned</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatRevenue(brokerDetail.commissionEarned, selectedCountry, cSym)}
                    </div>
                  </GlowCard>
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Conversion rate</div>
                    <div className="mt-2 text-2xl font-semibold">{brokerDetail.conversionRate.toFixed(1)}%</div>
                  </GlowCard>
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Response time</div>
                    <div className="mt-2 text-2xl font-semibold">{brokerDetail.responseTimeMins.toFixed(1)} min</div>
                  </GlowCard>
                </div>

                <GlowCard className="!p-4">
                  <div className="text-sm font-semibold">Recommended action</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {brokerDetail.badges.includes("Needs Follow-up")
                      ? "Improve follow-up cadence and tighten qualification notes to reduce Offer leakage."
                      : "Scale what’s working: maintain fast response SLA and prioritize the top closing lead sources."}
                  </div>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button variant="outline" onClick={() => setActive("leads")}>
                      View Leads
                    </Button>
                    <Button variant="outline" onClick={() => setActive("revenue")}>
                      View Revenue
                    </Button>
                    <Button variant="outline" onClick={() => setActive("appointments")}>
                      View Appointments
                    </Button>
                  </div>
                </GlowCard>
              </div>
            ) : (
              <div className="text-slate-300">No broker selected.</div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Custom Range Modal */}
      <Dialog open={customModalOpen} onOpenChange={(o) => !o && setCustomModalOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-md max-sm:w-[100vw] max-sm:max-w-none max-sm:h-[100dvh] max-sm:rounded-none">
          <DialogHeader>
            <DialogTitle>Custom Range</DialogTitle>
            <DialogDescription className="text-slate-400">Select dates to apply the dashboard metrics window.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Start date</div>
              <Input type="date" value={customRange.startDate} onChange={(e) => setCustomRange((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">End date</div>
              <Input type="date" value={customRange.endDate} onChange={(e) => setCustomRange((p) => ({ ...p, endDate: e.target.value }))} />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                const { startDate, endDate } = customRange;
                if (!startDate || !endDate) {
                  toast.error("Please select start and end dates");
                  return;
                }
                const s = new Date(startDate);
                const e = new Date(endDate);
                if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || s > e) {
                  toast.error("Invalid date range");
                  return;
                }
                setSelectedDuration("custom");
                setCustomModalOpen(false);
                void updateMetrics({ reason: "custom-range" });
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
