import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import {
  BadgeCheck,
  Bookmark,
  CheckCircle2,
  Clipboard,
  Copy,
  Download,
  Mail,
  Plus,
  RefreshCcw,
  Share2,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Wallet,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { formatRevenue, getCurrencyRuleForCountry } from "@/lib/revenue-utils";
import {
  exportRevenueCSV,
  fetchCountryRevenue,
  fetchRevenueAnalytics,
  fetchBrokerRevenue,
  syncRevenueFromSupabase,
  subscribeToRevenueUpdates,
  type BrokerRevenueRow,
  type CountryRevenueRow,
  type RevenueAnalytics,
  type RevenueDurationKey,
} from "@/lib/revenue-api";

import { GlowCard, Mini, SectionHeader } from "../utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CardHeader } from "@/components/ui/card";

const DURATION_OPTIONS: Array<{ key: RevenueDurationKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "last7d", label: "Last 7 Days" },
  { key: "last30d", label: "Last 30 Days" },
  { key: "last90d", label: "Last 90 Days" },
  { key: "thisYear", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

function durationLabel(key: RevenueDurationKey, customRange: { startDate: string; endDate: string }) {
  if (key !== "custom") return DURATION_OPTIONS.find((o) => o.key === key)?.label ?? "Custom";
  if (!customRange.startDate || !customRange.endDate) return "Custom Range";
  return `${customRange.startDate} -> ${customRange.endDate}`;
}

type KpiKey =
  | "totalRevenue"
  | "closedDeals"
  | "averageDealValue"
  | "predictedRevenue"
  | "pendingPipelineValue"
  | "commissionEarned"
  | "conversionRatePercent"
  | "revenueRisk";

const KPI_ORDER: Array<{ key: KpiKey; title: string; icon: JSX.Element }> = [
  { key: "totalRevenue", title: "Total Revenue", icon: <Wallet className="h-4 w-4" /> },
  { key: "closedDeals", title: "Closed Deals", icon: <CheckCircle2 className="h-4 w-4" /> },
  { key: "averageDealValue", title: "Avg Deal Value", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "predictedRevenue", title: "AI Predicted Revenue", icon: <Sparkles className="h-4 w-4" /> },
  { key: "pendingPipelineValue", title: "Pending Pipeline", icon: <Plus className="h-4 w-4" /> },
  { key: "commissionEarned", title: "Commission Earned", icon: <BadgeCheck className="h-4 w-4" /> },
  { key: "conversionRatePercent", title: "Conversion Rate", icon: <UserCheck className="h-4 w-4" /> },
  { key: "revenueRisk", title: "Revenue Risk", icon: <TrendingDown className="h-4 w-4" /> },
];

function riskTone(level: "Low" | "Medium" | "High") {
  if (level === "Low") return "text-emerald-300";
  if (level === "Medium") return "text-yellow-200";
  return "text-red-300";
}

export function RevenueCommandCenter() {
  const { pushActivity } = useDashboard();

  const [selectedCountry, setSelectedCountry] = useState<string>("India");
  const currencyRule = useMemo(() => getCurrencyRuleForCountry(selectedCountry), [selectedCountry]);

  const [selectedDuration, setSelectedDuration] = useState<RevenueDurationKey>("last30d");
  const [customRange, setCustomRange] = useState<{ startDate: string; endDate: string }>({
    startDate: "",
    endDate: "",
  });
  const [customModalOpen, setCustomModalOpen] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);
  const [analytics, setAnalytics] = useState<RevenueAnalytics | null>(null);

  const [kpiDetailOpen, setKpiDetailOpen] = useState(false);
  const [activeKpi, setActiveKpi] = useState<KpiKey>("totalRevenue");

  const [brokerDetail, setBrokerDetail] = useState<BrokerRevenueRow | null>(null);
  const [forecastDetailOpen, setForecastDetailOpen] = useState(false);
  const [forecastReviewed, setForecastReviewed] = useState(false);

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const currencySymbolForUi = currencyRule.symbol;

  const countries = useMemo(
    () => ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France"],
    [],
  );

  const updateAnalytics = async (opts?: { reason?: string }) => {
    if (!selectedCountry) return;
    setIsUpdating(true);
    const toastId = toast.loading("Updating revenue analytics...");
    try {
      await syncRevenueFromSupabase();
      const data = await fetchRevenueAnalytics(
        selectedDuration,
        selectedCountry,
        selectedDuration === "custom" ? customRange : null,
      );
      setAnalytics(data);

      pushActivity(
        `Revenue analytics updated: ${selectedCountry} · ${durationLabel(selectedDuration, customRange)}`,
        "deal",
        "revenue",
      );
      toast.success("Revenue data updated for selected period", { id: toastId });
    } catch (e) {
      toast.error("Failed to update revenue analytics", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    // Realtime-feeling: apply updates only for current selection.
    const unsubscribe = subscribeToRevenueUpdates(({ analytics: next }) => {
      if (next.country === selectedCountry && next.duration === selectedDuration) {
        setAnalytics(next);
      }
    });
    return unsubscribe;
  }, [selectedCountry, selectedDuration]);

  useEffect(() => {
    // Initial + selection-driven refresh (skip custom until applied).
    if (selectedDuration === "custom") return;
    void updateAnalytics({ reason: "selection" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCountry, selectedDuration]);

  const analyticsOrEmpty = analytics ?? null;

  const kpis = useMemo(() => {
    if (!analyticsOrEmpty) return null;

    const a = analyticsOrEmpty;
    const totalRevenueStr = formatRevenue(a.totalRevenue, a.country, currencySymbolForUi);
    const predictedRevenueStr = formatRevenue(a.predictedRevenue, a.country, currencySymbolForUi);
    const avgDealValueStr = formatRevenue(a.averageDealValue, a.country, currencySymbolForUi);
    const pendingStr = formatRevenue(a.pendingPipelineValue, a.country, currencySymbolForUi);
    const commissionStr = formatRevenue(a.commissionEarned, a.country, currencySymbolForUi);

    const totalGrowth = a.comparedToPreviousPercent;

    return {
      totalRevenueStr,
      predictedRevenueStr,
      avgDealValueStr,
      pendingStr,
      commissionStr,
      totalGrowth,
      revenueRisk: a.revenueRisk,
      conversionRate: a.conversionRatePercent,
    };
  }, [analyticsOrEmpty, currencySymbolForUi]);

  const kpiCardValue = (key: KpiKey) => {
    if (!analyticsOrEmpty || !kpis) return "—";
    const a = analyticsOrEmpty;
    switch (key) {
      case "totalRevenue":
        return kpis.totalRevenueStr;
      case "closedDeals":
        return String(a.closedDeals);
      case "averageDealValue":
        return kpis.avgDealValueStr;
      case "predictedRevenue":
        return kpis.predictedRevenueStr;
      case "pendingPipelineValue":
        return kpis.pendingStr;
      case "commissionEarned":
        return kpis.commissionStr;
      case "conversionRatePercent":
        return `${a.conversionRatePercent.toFixed(1)}%`;
      case "revenueRisk":
        return a.revenueRisk.level;
      default:
        return "—";
    }
  };

  const openKpi = (key: KpiKey) => {
    setActiveKpi(key);
    setKpiDetailOpen(true);
  };

  const kpiDetail = useMemo(() => {
    if (!analyticsOrEmpty) return null;
    const a = analyticsOrEmpty;
    const base = {
      title: KPI_ORDER.find((k) => k.key === activeKpi)?.title ?? "KPI",
      calculatedOn: `${durationLabel(selectedDuration, customRange)}`,
      howCalculated: "",
      whatChanged: "",
      recommendedAction: "",
    };

    switch (activeKpi) {
      case "totalRevenue":
        return {
          ...base,
          howCalculated: "Total revenue = sum of closed deals across broker segments, adjusted by deal velocity and conversion quality.",
          whatChanged: `Revenue is ${a.comparedToPreviousPercent >= 0 ? "up" : "down"} ${Math.abs(a.comparedToPreviousPercent)}% vs the previous period.`,
          recommendedAction: "Double down on the top broker segments and accelerate offers for leads showing high buyer readiness.",
        };
      case "closedDeals":
        return {
          ...base,
          howCalculated: "Closed deals = deals that reached Offer-to-Closure within the selected window.",
          whatChanged: `Closed deals shifted due to pipeline conversion and average closing time.`,
          recommendedAction: "Prioritize Site Visit scheduling for qualified leads; keep follow-ups within 4-6 hours.",
        };
      case "averageDealValue":
        return {
          ...base,
          howCalculated: "Average deal value = total revenue divided by closed deals in the selected period.",
          whatChanged: "Mix of property segments changed in the selected market, lifting/lowering average ticket size.",
          recommendedAction: "Target segments where deal value is trending upward and avoid spreading broker capacity too thin.",
        };
      case "predictedRevenue":
        return {
          ...base,
          howCalculated: "AI predicted revenue blends trend momentum, funnel velocity, and lead quality signals.",
          whatChanged: `Prediction confidence is ${a.predictionConfidencePercent}%. Forecast reflects recent improvements in broker response and lead quality.`,
          recommendedAction: "Create a focus list for high-intent leads and schedule broker check-ins at 24-hour intervals.",
        };
      case "pendingPipelineValue":
        return {
          ...base,
          howCalculated: "Pending pipeline value = weighted expected deals not yet closed, based on funnel stage and conversion probability.",
          whatChanged: "Pipeline quality improved where qualified leads increased; risk increases where conversion dipped.",
          recommendedAction: "Run a follow-up sprint on Offer-stage leads and confirm buyer readiness immediately.",
        };
      case "commissionEarned":
        return {
          ...base,
          howCalculated: "Commission earned = closed deal revenue multiplied by broker/company commission rates.",
          whatChanged: "Commission shifted with closure mix and average deal values.",
          recommendedAction: "Offer broker incentives for top sources and fast response lanes.",
        };
      case "conversionRatePercent":
        return {
          ...base,
          howCalculated: "Conversion rate = closed deals / qualified leads (expressed as a percent).",
          whatChanged: `Conversion is ${a.conversionRatePercent.toFixed(1)}% for this period.`,
          recommendedAction: "Reduce drop-off by speeding up Site Visits and improving buyer qualification notes.",
        };
      case "revenueRisk":
        return {
          ...base,
          howCalculated: "Revenue risk is derived from funnel leakage, velocity volatility, and forecast vs actual drift.",
          whatChanged: `Risk level: ${a.revenueRisk.level}. ${a.revenueRisk.explanation}`,
          recommendedAction: a.revenueRisk.level === "High" ? "Activate follow-up playbook for leads in Offer stage." : "Continue the current outreach strategy and monitor drift.",
        };
      default:
        return base;
    }
  }, [analyticsOrEmpty, activeKpi, selectedDuration, customRange]);

  const liveSummaryText = analyticsOrEmpty
    ? `${formatRevenue(analyticsOrEmpty.totalRevenue, analyticsOrEmpty.country, currencySymbolForUi)} closed · AI confidence ${analyticsOrEmpty.predictionConfidencePercent}%`
    : "Connecting to realtime revenue signals…";

  const aiSummary = analyticsOrEmpty?.aiReport;

  const handleDownloadCsv = () => {
    if (!analyticsOrEmpty) return;
    const csv = exportRevenueCSV(analyticsOrEmpty);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue_${analyticsOrEmpty.country}_${analyticsOrEmpty.duration}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV downloaded");
  };

  const shareSummary = () => {
    if (!analyticsOrEmpty) return "";
    const total = formatRevenue(analyticsOrEmpty.totalRevenue, analyticsOrEmpty.country, currencySymbolForUi);
    const predicted = formatRevenue(analyticsOrEmpty.predictedRevenue, analyticsOrEmpty.country, currencySymbolForUi);
    return `Revenue Command Center\nCountry: ${analyticsOrEmpty.country}\nPeriod: ${durationLabel(selectedDuration, customRange)}\nClosed: ${total}\nAI Forecast: ${predicted} (confidence ${analyticsOrEmpty.predictionConfidencePercent}%)`;
  };

  const handleWhatsAppShare = () => {
    if (!analyticsOrEmpty) return;
    const text = shareSummary();
    if (typeof window !== "undefined") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
    }
    toast.success("WhatsApp share opened");
  };

  const handleEmailShare = () => {
    if (!analyticsOrEmpty) return;
    const text = shareSummary();
    if (typeof window !== "undefined") {
      window.location.href = `mailto:?subject=${encodeURIComponent("Revenue Command Center")}&body=${encodeURIComponent(text)}`;
    }
    toast.success("Email draft opened");
  };

  const handleCopyLink = async () => {
    if (!analyticsOrEmpty) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/revenue/${analyticsOrEmpty.country}?duration=${analyticsOrEmpty.duration}` : "";
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
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

  const handleCreateRevenueReport = () => {
    setExportModalOpen(true);
  };

  const handleMarkForecastReviewed = () => {
    setForecastReviewed(true);
    if (analyticsOrEmpty) {
      pushActivity(`Revenue forecast marked reviewed: ${analyticsOrEmpty.country}`, "eye", "revenue");
    }
    toast.success("Forecast marked as reviewed");
  };

  const brokerBadgesSummary = (row: BrokerRevenueRow) => row.badges.join(", ");

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Revenue Command Center"
        subtitle="Track revenue, closed deals, broker performance, AI forecast, and country-wise business growth in real time."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleWhatsAppShare}>
            <Share2 className="mr-2 h-4 w-4" />
            WhatsApp
          </Button>
          <Button variant="outline" size="sm" onClick={handleEmailShare}>
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Copy className="mr-2 h-4 w-4" />
            {shareCopied ? "Copied" : "Copy Link"}
          </Button>
        </div>
      </SectionHeader>

      <GlowCard className="!p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_var(--neon)]" />
            <div className="text-sm text-slate-300">{liveSummaryText}</div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={selectedCountry} onValueChange={(v) => setSelectedCountry(v)}>
              <SelectTrigger className="w-[180px] border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="w-[180px]">
              <Select value={currencySymbolForUi} disabled>
                <SelectTrigger className="border-white/10 bg-black/30 text-white">
                  <SelectValue placeholder="Currency" />
                </SelectTrigger>
                <SelectContent className="bg-slate-950 text-white border-white/10">
                  <SelectItem value={currencySymbolForUi}>{currencySymbolForUi}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select
              value={selectedDuration}
              onValueChange={(v) => {
                const key = v as RevenueDurationKey;
                if (key === "custom") {
                  setCustomModalOpen(true);
                  return;
                }
                setSelectedDuration(key);
              }}
            >
              <SelectTrigger className="w-[190px] border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Duration" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {DURATION_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
                  <SelectItem key={o.key} value={o.key}>
                    {o.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={() => void updateAnalytics({ reason: "manual" })} disabled={isUpdating}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </GlowCard>

      {isUpdating && (
        <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--neon)] animate-pulse" />
            <div className="text-sm text-slate-300">Updating revenue analytics...</div>
          </div>
          <Badge variant="outline" className="border-white/10 text-slate-200">
            Live fetch
          </Badge>
        </div>
      )}

      <div className={cn("grid gap-4", analyticsOrEmpty ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1")}>
        {KPI_ORDER.map((k) => (
          <GlowCard
            key={k.key}
            className="!p-4 min-h-[120px]"
            onClick={() => openKpi(k.key)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {k.icon}
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.title}</div>
              </div>
              {k.key === "totalRevenue" ? (
                <Badge variant="outline" className={cn("border-white/10", analyticsOrEmpty?.comparedToPreviousPercent && analyticsOrEmpty.comparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300")}>
                  {analyticsOrEmpty ? `${analyticsOrEmpty.comparedToPreviousPercent >= 0 ? "+" : ""}${analyticsOrEmpty.comparedToPreviousPercent}%` : "—"}
                </Badge>
              ) : null}
            </div>
            <div className="mt-3 text-xl font-semibold">{kpiCardValue(k.key)}</div>
            {k.key === "predictedRevenue" && analyticsOrEmpty ? (
              <div className="mt-2 text-xs text-slate-300">Confidence: {analyticsOrEmpty.predictionConfidencePercent}%</div>
            ) : null}
            {analyticsOrEmpty && k.key !== "totalRevenue" && k.key !== "predictedRevenue" && k.key !== "revenueRisk" ? (
              <div
                className={cn(
                  "mt-2 text-xs",
                  ((): string => {
                    if (k.key === "closedDeals") return analyticsOrEmpty.closedDealsComparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300";
                    if (k.key === "averageDealValue") return analyticsOrEmpty.averageDealValueComparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300";
                    if (k.key === "pendingPipelineValue") return analyticsOrEmpty.pendingPipelineComparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300";
                    if (k.key === "commissionEarned") return analyticsOrEmpty.commissionComparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300";
                    if (k.key === "conversionRatePercent") return analyticsOrEmpty.conversionComparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300";
                    return "text-slate-300";
                  })(),
                )}
              >
                Compared to previous:{" "}
                {(() => {
                  if (k.key === "closedDeals") return `${analyticsOrEmpty.closedDealsComparedToPreviousPercent >= 0 ? "+" : ""}${analyticsOrEmpty.closedDealsComparedToPreviousPercent}%`;
                  if (k.key === "averageDealValue") return `${analyticsOrEmpty.averageDealValueComparedToPreviousPercent >= 0 ? "+" : ""}${analyticsOrEmpty.averageDealValueComparedToPreviousPercent}%`;
                  if (k.key === "pendingPipelineValue") return `${analyticsOrEmpty.pendingPipelineComparedToPreviousPercent >= 0 ? "+" : ""}${analyticsOrEmpty.pendingPipelineComparedToPreviousPercent}%`;
                  if (k.key === "commissionEarned") return `${analyticsOrEmpty.commissionComparedToPreviousPercent >= 0 ? "+" : ""}${analyticsOrEmpty.commissionComparedToPreviousPercent}%`;
                  if (k.key === "conversionRatePercent") return `${analyticsOrEmpty.conversionComparedToPreviousPercent >= 0 ? "+" : ""}${analyticsOrEmpty.conversionComparedToPreviousPercent}%`;
                  return "—";
                })()}
              </div>
            ) : null}
            {k.key === "revenueRisk" && analyticsOrEmpty ? (
              <div className={cn("mt-2 text-xs", riskTone(analyticsOrEmpty.revenueRisk.level))}>{analyticsOrEmpty.revenueRisk.explanation}</div>
            ) : null}
          </GlowCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <GlowCard className="!p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Revenue Trend</div>
                <div className="text-xs text-muted-foreground">Currency-aware chart · updates with country and duration</div>
              </div>
              <Badge variant="outline" className="border-white/10">
                {analyticsOrEmpty ? analyticsOrEmpty.country : "Loading"}
              </Badge>
            </div>
            <div className="mt-3 h-80">
              {analyticsOrEmpty ? (
                <ResponsiveContainer>
                  <LineChart data={analyticsOrEmpty.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={11} />
                    <YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} tickFormatter={(v) => formatRevenue(v, analyticsOrEmpty.country, currencySymbolForUi)} />
                    <RTooltip />
                    <Legend />
                    <Line dataKey="value" name="Actual" stroke="var(--neon)" strokeWidth={2} dot={false} />
                    <Line dataKey="forecast" name="Forecast" stroke="oklch(0.85 0.18 200)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">No revenue data yet</div>
              )}
            </div>
          </GlowCard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlowCard className="!p-4">
              <div className="text-sm font-semibold">Daily/Monthly Revenue</div>
              <div className="text-xs text-muted-foreground">Bar chart with dynamic granularity</div>
              <div className="mt-3 h-72">
                {analyticsOrEmpty ? (
                  <ResponsiveContainer>
                    <BarChart data={analyticsOrEmpty.bar}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                      <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} interval="preserveStartEnd" />
                      <YAxis tickFormatter={(v) => formatRevenue(v, analyticsOrEmpty.country, currencySymbolForUi)} />
                      <RTooltip />
                      <Bar dataKey="value" fill="var(--neon)" radius={8}>
                        {(analyticsOrEmpty.bar as any[]).map((_, idx) => (
                          <Cell key={idx} fill={idx % 2 === 0 ? "var(--neon)" : "oklch(0.85 0.18 200)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">No data</div>
                )}
              </div>
            </GlowCard>

            <GlowCard className="!p-4">
              <div className="text-sm font-semibold">Lead-to-Deal Funnel</div>
              <div className="text-xs text-muted-foreground">Conversion stages (interactive on refresh)</div>
              <div className="mt-3 h-72">
                {analyticsOrEmpty ? (
                  <ResponsiveContainer>
                    <BarChart data={analyticsOrEmpty.funnel} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                      <XAxis type="number" stroke="oklch(0.7 0.03 255)" fontSize={11} />
                      <YAxis dataKey="stage" type="category" stroke="oklch(0.7 0.03 255)" fontSize={11} width={120} />
                      <RTooltip />
                      <Bar dataKey="value" fill="var(--neon)" radius={8} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">No data</div>
                )}
              </div>
            </GlowCard>
          </div>

          <GlowCard className="!p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Broker Performance</div>
                <div className="text-xs text-muted-foreground">Ranked by closed revenue</div>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Broker table is interactive")}>
                Broker Insights
              </Button>
            </div>
            <div className="mt-3 h-80">
              {analyticsOrEmpty ? (
                <ResponsiveContainer>
                  <BarChart data={analyticsOrEmpty.brokerLeaderboard}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="brokerName" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} tickFormatter={(v) => formatRevenue(v, analyticsOrEmpty.country, currencySymbolForUi)} />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="revenueClosed" fill="oklch(0.7 0.25 300)" radius={10} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">No data</div>
              )}
            </div>

            {analyticsOrEmpty ? (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Broker leaderboard</div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rank</TableHead>
                        <TableHead>Broker</TableHead>
                        <TableHead>Region</TableHead>
                        <TableHead>Leads</TableHead>
                        <TableHead>Closed</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Commission</TableHead>
                        <TableHead>Conversion</TableHead>
                        <TableHead>Response</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsOrEmpty.brokerLeaderboard.map((b, idx) => (
                        <TableRow key={b.id} className="cursor-pointer hover:bg-white/5" onClick={() => setBrokerDetail(b)}>
                          <TableCell className="font-semibold">#{idx + 1}</TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_var(--neon)]" />
                              {b.brokerName}
                            </div>
                            {b.badges.length ? (
                              <div className="mt-1">
                                {b.badges.slice(0, 2).map((bd) => (
                                  <Badge key={bd} variant="outline" className="mr-1 border-white/10">
                                    {bd}
                                  </Badge>
                                ))}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell>{b.region}</TableCell>
                          <TableCell>{b.leadsHandled}</TableCell>
                          <TableCell>{b.closedDeals}</TableCell>
                          <TableCell>{formatRevenue(b.revenueClosed, analyticsOrEmpty.country, currencySymbolForUi)}</TableCell>
                          <TableCell>{formatRevenue(b.commissionEarned, analyticsOrEmpty.country, currencySymbolForUi)}</TableCell>
                          <TableCell>{b.conversionRate.toFixed(1)}%</TableCell>
                          <TableCell>{b.responseTimeMins.toFixed(1)} min</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : null}
          </GlowCard>
        </div>

        <div className="space-y-4">
          <GlowCard className="!p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">AI Forecast Panel</div>
                <div className="text-xs text-muted-foreground">Action-ready broker insights</div>
              </div>
              {analyticsOrEmpty ? (
                <Badge variant="outline" className={cn("border-white/10", riskTone(analyticsOrEmpty.revenueRisk.level))}>
                  Risk: {analyticsOrEmpty.revenueRisk.level}
                </Badge>
              ) : null}
            </div>

            {analyticsOrEmpty ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Predicted</div>
                    <div className="mt-1 text-base font-semibold">{formatRevenue(aiSummary?.predictedRevenue ?? 0, analyticsOrEmpty.country, currencySymbolForUi)}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500">Confidence</div>
                    <div className="mt-1 text-base font-semibold">{analyticsOrEmpty.predictionConfidencePercent}%</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Why forecast changed</div>
                  <div className="mt-2 text-sm text-slate-300">{aiSummary?.whyForecastChanged}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Best opportunity</div>
                  <div className="mt-2 text-sm">
                    {aiSummary?.bestOpportunity.city} · {aiSummary?.bestOpportunity.country}
                  </div>
                  <div className="mt-2 text-xs text-yellow-200">{aiSummary?.riskWarning}</div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Recommended action</div>
                  <div className="mt-2 text-sm text-slate-300">{aiSummary?.recommendedBrokerAction}</div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <Button onClick={() => setForecastDetailOpen(true)}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    View Forecast Details
                  </Button>
                  <Button variant="outline" onClick={handleCreateRevenueReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Create Revenue Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleMarkForecastReviewed}
                    disabled={forecastReviewed}
                  >
                    <BadgeCheck className="mr-2 h-4 w-4" />
                    {forecastReviewed ? "Reviewed" : "Mark Reviewed"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 mt-6 text-sm">Select a duration/country to see AI forecast.</div>
            )}
          </GlowCard>

          <GlowCard className="!p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Country-wise Revenue</div>
                <div className="text-xs text-muted-foreground">Donut mix + click to switch market</div>
              </div>
              <Badge variant="outline" className="border-white/10">
                {analyticsOrEmpty ? analyticsOrEmpty.country : "Loading"}
              </Badge>
            </div>

            {analyticsOrEmpty ? (
              <div className="mt-3 grid grid-cols-1 gap-4">
                <div className="h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={analyticsOrEmpty.countryBreakdown.slice(0, 6).map((r) => ({ name: r.country, v: r.revenue }))}
                        dataKey="v"
                        nameKey="name"
                        outerRadius={95}
                        innerRadius={55}
                        paddingAngle={3}
                      >
                        {analyticsOrEmpty.countryBreakdown.slice(0, 6).map((_, idx) => (
                          <Cell
                            key={idx}
                            fill={[
                              "var(--neon)",
                              "oklch(0.85 0.18 200)",
                              "oklch(0.7 0.25 300)",
                              "oklch(0.8 0.2 150)",
                              "oklch(0.75 0.18 100)",
                              "oklch(0.65 0.24 22)",
                            ][idx % 6]}
                          />
                        ))}
                      </Pie>
                      <RTooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Country</TableHead>
                        <TableHead>Currency</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Closed Deals</TableHead>
                        <TableHead>Avg Deal Value</TableHead>
                        <TableHead>Growth %</TableHead>
                        <TableHead>Forecast</TableHead>
                        <TableHead>Top Broker</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analyticsOrEmpty.countryBreakdown.map((c) => (
                        <TableRow
                          key={c.country}
                          className={cn("cursor-pointer hover:bg-white/5", c.country === analyticsOrEmpty.country ? "bg-white/5" : "")}
                          onClick={() => setSelectedCountry(c.country)}
                        >
                          <TableCell className="font-medium">{c.country}</TableCell>
                          <TableCell className="text-slate-300">{getCurrencyRuleForCountry(c.country).symbol}</TableCell>
                          <TableCell>{formatRevenue(c.revenue, c.country, getCurrencyRuleForCountry(c.country).symbol)}</TableCell>
                          <TableCell>{c.closedDeals}</TableCell>
                          <TableCell>{formatRevenue(c.avgDealValue, c.country, getCurrencyRuleForCountry(c.country).symbol)}</TableCell>
                          <TableCell className={cn(c.growthPercent >= 0 ? "text-emerald-300" : "text-red-300")}>
                            {c.growthPercent >= 0 ? "+" : ""}
                            {c.growthPercent}%
                          </TableCell>
                          <TableCell>{formatRevenue(c.forecast, c.country, getCurrencyRuleForCountry(c.country).symbol)}</TableCell>
                          <TableCell className="text-slate-200">{c.topBroker}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-sm mt-3">No country data available.</div>
            )}
          </GlowCard>
        </div>
      </div>

      <Dialog open={kpiDetailOpen} onOpenChange={(o) => !o && setKpiDetailOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-2xl">
          {analyticsOrEmpty ? (
            <>
              <DialogHeader>
                <DialogTitle>{kpiDetail?.title ?? "KPI Detail"}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Calculated for {kpiDetail?.calculatedOn}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-3">
                <div className="space-y-4">
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Value</div>
                    <div className="mt-2 text-2xl font-semibold">{kpiCardValue(activeKpi)}</div>
                    {activeKpi === "totalRevenue" ? (
                      <div className={cn("mt-1 text-sm", analyticsOrEmpty.comparedToPreviousPercent >= 0 ? "text-emerald-300" : "text-red-300")}>
                        Compared to previous: {analyticsOrEmpty.comparedToPreviousPercent >= 0 ? "+" : ""}
                        {analyticsOrEmpty.comparedToPreviousPercent}%
                      </div>
                    ) : null}
                  </GlowCard>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <GlowCard className="!p-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">How it is calculated</div>
                      <div className="mt-2 text-sm text-slate-300">{kpiDetail?.howCalculated}</div>
                    </GlowCard>
                    <GlowCard className="!p-4">
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">What changed</div>
                      <div className="mt-2 text-sm text-slate-300">{kpiDetail?.whatChanged}</div>
                    </GlowCard>
                  </div>

                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommended action</div>
                    <div className="mt-2 text-sm text-slate-300">{kpiDetail?.recommendedAction}</div>
                  </GlowCard>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!brokerDetail} onOpenChange={(o) => !o && setBrokerDetail(null)}>
        <DialogContent className="glass-strong border-white/10 max-w-3xl">
          {brokerDetail ? (
            <>
              <DialogHeader>
                <DialogTitle>{brokerDetail.brokerName}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  Region: {brokerDetail.region} · Badges: {brokerBadgesSummary(brokerDetail)}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-3">
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
                      {analyticsOrEmpty ? formatRevenue(brokerDetail.revenueClosed, analyticsOrEmpty.country, currencySymbolForUi) : brokerDetail.revenueClosed}
                    </div>
                  </GlowCard>
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Commission</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {analyticsOrEmpty ? formatRevenue(brokerDetail.commissionEarned, analyticsOrEmpty.country, currencySymbolForUi) : brokerDetail.commissionEarned}
                    </div>
                  </GlowCard>

                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Best lead source</div>
                    <div className="mt-2 text-sm text-slate-100">{brokerDetail.bestLeadSource}</div>
                    <div className="mt-2 text-xs text-slate-400">Use this source to scale outreach quickly.</div>
                  </GlowCard>

                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Weak area</div>
                    <div className="mt-2 text-sm text-slate-100">{brokerDetail.weakArea}</div>
                    <div className="mt-2 text-xs text-slate-400">Target coaching to reduce leakage.</div>
                  </GlowCard>
                </div>

                <GlowCard className="!p-4 mt-3">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">AI recommendation</div>
                  <div className="mt-2 text-sm text-slate-300">
                    {forecastReviewed ? "Reviewed - keep the playbook stable." : "Focus on the best-performing lead source and tighten follow-ups to reduce offer leakage."}
                  </div>
                </GlowCard>

                <GlowCard className="!p-4 mt-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground">Revenue history</div>
                      <div className="mt-1 text-sm text-slate-300">Mock trend points based on selected duration.</div>
                    </div>
                    <Badge variant="outline" className="border-white/10">{brokerDetail.responseTimeMins.toFixed(1)} min response</Badge>
                  </div>
                  <div className="mt-3 h-72">
                    <ResponsiveContainer>
                      <LineChart
                        data={brokerDetail.revenueHistory.map((v, i) => ({ i, v }))}
                        margin={{ left: 4, right: 4, top: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                        <XAxis dataKey="i" stroke="oklch(0.7 0.03 255)" fontSize={11} tickFormatter={(v) => String(Number(v) + 1)} />
                        <YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} tickFormatter={(v) => analyticsOrEmpty ? formatRevenue(v, analyticsOrEmpty.country, currencySymbolForUi) : String(v)} />
                        <RTooltip />
                        <Legend />
                        <Line dataKey="v" name="Revenue" stroke="var(--neon)" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </GlowCard>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={forecastDetailOpen} onOpenChange={(o) => !o && setForecastDetailOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-3xl">
          {analyticsOrEmpty && aiSummary ? (
            <>
              <DialogHeader>
                <DialogTitle>View Forecast Details</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {analyticsOrEmpty.country} · {durationLabel(selectedDuration, customRange)}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[70vh] pr-3">
                <div className="space-y-3">
                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Predicted revenue</div>
                    <div className="mt-2 text-2xl font-semibold">
                      {formatRevenue(aiSummary.predictedRevenue, analyticsOrEmpty.country, currencySymbolForUi)}
                    </div>
                    <div className="mt-1 text-sm text-slate-300">Confidence: {aiSummary.confidencePercent}%</div>
                  </GlowCard>

                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Why forecast changed</div>
                    <div className="mt-2 text-sm text-slate-300">{aiSummary.whyForecastChanged}</div>
                  </GlowCard>

                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Demand signals</div>
                    <div className="mt-2 text-sm text-slate-300">{aiSummary.bestOpportunity.city} is showing momentum across similar listings.</div>
                    <div className="mt-2 text-xs text-yellow-200">{aiSummary.riskWarning}</div>
                  </GlowCard>

                  <GlowCard className="!p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Recommended broker action</div>
                    <div className="mt-2 text-sm text-slate-300">{aiSummary.recommendedBrokerAction}</div>
                  </GlowCard>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={customModalOpen} onOpenChange={(o) => !o && setCustomModalOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Date Range</DialogTitle>
            <DialogDescription className="text-slate-400">Pick a valid range for revenue analytics.</DialogDescription>
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
                toast.success("Custom range applied");
                void updateAnalytics({ reason: "custom" });
              }}
            >
              Apply
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={exportModalOpen} onOpenChange={(o) => !o && setExportModalOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Revenue Report</DialogTitle>
            <DialogDescription className="text-slate-400">Preview and export broker-ready analytics.</DialogDescription>
          </DialogHeader>
          {analyticsOrEmpty ? (
            <div className="space-y-3">
              <GlowCard className="!p-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Report summary</div>
                <Textarea readOnly className="mt-2" value={shareSummary()} />
              </GlowCard>
              <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
                <Button variant="outline" onClick={handleDownloadCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
                <Button
                  onClick={() => {
                    toast.success("Report created (mock)");
                    setExportModalOpen(false);
                  }}
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-slate-400 text-sm">No revenue data available yet.</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

