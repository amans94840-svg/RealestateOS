import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDashboard } from "@/lib/dashboard-store";
import { cn } from "@/lib/utils";
import {
  BadgeCheck,
  Bookmark,
  CalendarDays,
  Clipboard,
  Copy,
  DollarSign,
  Download,
  Filter,
  FilterX,
  Globe,
  Loader2,
  Mail,
  MessageSquareText,
  RefreshCcw,
  Share2,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  UserCheck,
} from "lucide-react";

import { formatRevenue, getCurrencyRuleForCountry } from "@/lib/revenue-utils";
import {
  assignBrokerToForecast,
  createInvestorReportFromForecast,
  exportForecastsCSV,
  fetchForecastById,
  fetchForecasts,
  messageForecastBroker,
  subscribeToForecastUpdates,
  updateForecastStatus,
  type ForecastDetail,
  type ForecastFilters,
  type ForecastScenario,
  type ForecastRiskLevel,
  type ForecastStatus,
  __mockBrokerList,
} from "@/lib/forecast-api";

import { GlowCard, SectionHeader } from "../utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const COUNTRY_OPTIONS = [
  "India",
  "UAE",
  "USA",
  "UK",
  "Canada",
  "Singapore",
  "Australia",
  "Germany",
  "France",
  "Other",
] as const;

const PROPERTY_TYPES = ["Apartment", "Villa", "Land / Plot", "Commercial", "Office Space", "Retail Space"] as const;
const INVESTMENT_GOALS = ["Rental Income", "Capital Appreciation", "Luxury Investment", "Commercial Yield", "Safe Long-Term Hold"] as const;
const RISK_APPETITES = ["Low", "Medium", "High"] as const;
const TIME_HORIZONS: Array<{ key: ForecastFilters["time_horizon"]; label: string }> = [
  { key: "1m", label: "1 Month" },
  { key: "3m", label: "3 Months" },
  { key: "6m", label: "6 Months" },
  { key: "12m", label: "12 Months" },
];

function riskTone(level: ForecastRiskLevel) {
  if (level === "Low") return "text-emerald-300";
  if (level === "Medium") return "text-yellow-200";
  return "text-red-300";
}

function riskGlow(level: ForecastRiskLevel) {
  if (level === "Low") return "border-emerald-500/30 bg-emerald-500/10";
  if (level === "Medium") return "border-yellow-500/30 bg-yellow-500/10";
  return "border-red-500/30 bg-red-500/10";
}

function scenarioLabel(s: ForecastScenario) {
  if (s === "best") return "Best Case";
  if (s === "worst") return "Worst Case";
  return "Base Case";
}

function scenarioButtonTone(s: ForecastScenario, selected: ForecastScenario) {
  if (s !== selected) return "variant='outline'";
  return "neon-border";
}

type ShareChannel = "whatsapp" | "email" | "copy";

export function AiMarketForecastingEngine() {
  const { setActive, pushActivity, leads, properties, appointments } = useDashboard();

  const [country, setCountry] = useState<string>("India");
  const [city, setCity] = useState<string>("Dubai Marina");
  const [propertyType, setPropertyType] = useState<string>("Apartment");
  const [investmentGoal, setInvestmentGoal] = useState<string>("Rental Income");
  const [riskAppetite, setRiskAppetite] = useState<"Low" | "Medium" | "High">("Medium");
  const [timeHorizon, setTimeHorizon] = useState<ForecastFilters["time_horizon"]>("6m");
  const [confidenceLevel, setConfidenceLevel] = useState<number>(60);
  const [scenario, setScenario] = useState<ForecastScenario>("base");

  const currencyRule = useMemo(() => getCurrencyRuleForCountry(country), [country]);
  const currencySymbol = currencyRule.symbol;
  const currency = currencySymbol === "AED " ? "AED " : currencySymbol; // keep symbol prefix consistent

  const [loading, setLoading] = useState(false);
  const [forecasts, setForecasts] = useState<ForecastDetail[]>([]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ForecastDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [watchlist, setWatchlist] = useState<Record<string, boolean>>({});

  const [brokerAssignOpen, setBrokerAssignOpen] = useState(false);
  const [brokerAssignId, setBrokerAssignId] = useState<string>("");

  const [shareOpen, setShareOpen] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const baseFilters = useMemo<ForecastFilters>(
    () => ({
      country,
      city,
      property_type: propertyType,
      investment_goal: investmentGoal,
      risk_appetite: riskAppetite,
      time_horizon: timeHorizon,
      currency,
      confidence_level: confidenceLevel,
      scenario,
    }),
    [country, city, propertyType, investmentGoal, riskAppetite, timeHorizon, currency, confidenceLevel, scenario],
  );

  const fetchAll = async () => {
    setLoading(true);
    const toastId = toast.loading("Updating market forecasts…");
    try {
      const res = await fetchForecasts(baseFilters);
      setForecasts(res);
      pushActivity(`Forecasts updated: ${country} · ${timeHorizon} · ${scenario}`, "sparkles", "forecast");
      toast.success("Market forecasts updated", { id: toastId });
    } catch {
      toast.error("Failed to update forecasts", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Refetch on every filter/scenario change.
    if (loading) return;
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseFilters]);

  useEffect(() => {
    let mounted = true;
    void subscribeToForecastUpdates(({ forecast_id, status }) => {
      if (!mounted) return;
      setForecasts((prev) => prev.map((f) => (f.forecast_id === forecast_id ? { ...f, status, last_updated: Date.now() } : f)));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const keyRevenueForecast = useMemo(() => forecasts.find((f) => f.forecast_type === "revenue_monthly") ?? null, [forecasts]);
  const riskForecast = useMemo(() => forecasts.find((f) => f.forecast_type === "risk_forecast") ?? null, [forecasts]);

  const chartData = useMemo(() => {
    const points = forecasts.length ? 7 : 0;
    if (!forecasts.length) return null;

    const revenue = keyRevenueForecast?.forecast_value ?? 0;
    const conf = keyRevenueForecast?.confidence_score ?? 60;
    const risk = keyRevenueForecast?.risk_level ?? "Medium";

    const confidenceLine = Array.from({ length: points }, (_, i) => {
      const t = i / Math.max(points - 1, 1);
      return { label: `T${i + 1}`, confidence: Math.round(conf * (0.92 + t * 0.1)) };
    });

    const trend = Array.from({ length: points }, (_, i) => {
      const t = i / Math.max(points - 1, 1);
      const factor = 0.85 + t * 0.25;
      return { label: `T${i + 1}`, value: Math.round(revenue * factor * (0.92 + t * 0.06)), forecast: Math.round(revenue * factor * (0.98 - t * 0.04)) };
    });

    const riskTrend = Array.from({ length: points }, (_, i) => {
      const t = i / Math.max(points - 1, 1);
      const base = risk === "Low" ? 22 : risk === "Medium" ? 45 : 68;
      return { label: `T${i + 1}`, risk: Math.round(base * (0.9 + t * 0.15)) };
    });

    const demandVsSupply = [
      { name: "Demand", value: Math.round((forecasts.find((f) => f.forecast_type === "rental_demand")?.forecast_value ?? 52) * 100) },
      { name: "Supply", value: Math.round((forecasts.find((f) => f.forecast_type === "area_growth")?.forecast_value ?? 48) * 100) },
    ];

    return { trend, confidenceLine, riskTrend, demandVsSupply };
  }, [forecasts, keyRevenueForecast]);

  const scenarioImpact = useMemo(() => {
    if (!keyRevenueForecast || !riskForecast) return null;
    const rev = keyRevenueForecast.forecast_value;
    const risk = riskForecast.risk_level;
    const confidence = keyRevenueForecast.confidence_score;
    const recommended = keyRevenueForecast.recommended_action;
    return { rev, risk, confidence, recommended };
  }, [keyRevenueForecast, riskForecast]);

  const topSignals = useMemo(() => {
    const sig = keyRevenueForecast?.supporting_signals ?? [];
    const ordered = [...sig].sort((a, b) => b.score - a.score).slice(0, 8);
    return ordered;
  }, [keyRevenueForecast]);

  const openDetails = async (forecastId: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await fetchForecastById(forecastId);
      setDetail(data);
      if (!data) toast.error("Forecast not found");
    } catch {
      toast.error("Failed to load forecast details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleMarkReviewed = async (forecastId: string) => {
    const next: ForecastStatus = "Reviewed";
    const updated = await updateForecastStatus(forecastId, next);
    if (updated) {
      setForecasts((prev) => prev.map((f) => (f.forecast_id === forecastId ? updated : f)));
    }
    pushActivity("Forecast marked reviewed", "check-circle-2", "forecast");
    toast.success("Marked reviewed");
  };

  const handleCreateInvestorReport = async () => {
    if (!detail) return;
    const res = await createInvestorReportFromForecast(detail.forecast_id);
    if (res.status === "created") {
      toast.success("Investor report created (mock)");
      pushActivity(`Investor report created from forecast: ${detail.title}`, "sparkles", "forecast");
    } else {
      toast.error("Failed to create report");
    }
  };

  const handleAssignBroker = async () => {
    if (!detail) return;
    if (!brokerAssignId) {
      toast.error("Select a broker");
      return;
    }
    await assignBrokerToForecast(detail.forecast_id, brokerAssignId);
    toast.success("Broker assigned (mock)");
    setBrokerAssignOpen(false);
  };

  const handleShare = async (channel: ShareChannel) => {
    if (!detail) return;
    const text = [
      `AI Market Forecasting Engine`,
      `Country/City: ${detail.country} · ${detail.city}`,
      `Forecast: ${detail.title}`,
      `Value: ${formatRevenue(detail.forecast_value, detail.country, currencySymbol)}`,
      `Confidence: ${detail.confidence_score}%`,
      `Risk: ${detail.risk_level}`,
      `Recommended action: ${detail.recommended_action}`,
    ].join("\n");

    if (channel === "copy") {
      const url = typeof window !== "undefined" ? `${window.location.origin}/forecast/${detail.forecast_id}` : "";
      try {
        await navigator.clipboard.writeText(url);
        setShareCopied(true);
        toast.success("Link copied");
        setTimeout(() => setShareCopied(false), 1200);
      } catch {
        toast.error("Failed to copy");
      }
      return;
    }

    if (typeof window === "undefined") return;
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      toast.success("WhatsApp opened");
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(`Forecast: ${detail.title}`)}&body=${encodeURIComponent(text)}`;
      toast.success("Email draft opened");
    }
  };

  const handleExportCSV = async () => {
    if (!forecasts.length) return;
    const csv = await exportForecastsCSV(forecasts);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai_forecasts_${country}_${timeHorizon}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Forecasts CSV downloaded");
  };

  const handleBestCase = () => setScenario("best");
  const handleBaseCase = () => setScenario("base");
  const handleWorstCase = () => setScenario("worst");

  const predictedRevenueText = keyRevenueForecast
    ? formatRevenue(keyRevenueForecast.forecast_value, country, currencySymbol)
    : "—";

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Market Forecasting Engine"
        subtitle="Decision-ready market signals: value, confidence, risk, and broker actions."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => void fetchAll()} disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => void handleExportCSV()} disabled={!forecasts.length}>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </SectionHeader>

      {/* Scenario simulator */}
      <GlowCard className="!p-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold">Scenario Simulator</div>
            <div className="text-xs text-muted-foreground">Switch assumptions to update forecast, confidence, and risk.</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant={scenario === "best" ? "default" : "outline"} onClick={handleBestCase}>
              Best Case
            </Button>
            <Button variant={scenario === "base" ? "default" : "outline"} onClick={handleBaseCase}>
              Base Case
            </Button>
            <Button variant={scenario === "worst" ? "default" : "outline"} onClick={handleWorstCase}>
              Worst Case
            </Button>
          </div>
        </div>

        {scenarioImpact ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="glass rounded-xl p-3 border border-white/10">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Predicted Monthly Revenue</div>
              <div className="mt-1 text-lg font-semibold neon-text">{formatRevenue(scenarioImpact.rev, country, currencySymbol)}</div>
            </div>
            <div className="glass rounded-xl p-3 border border-white/10">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk Level</div>
              <div className={cn("mt-1 text-lg font-semibold", riskTone(scenarioImpact.risk))}>{scenarioImpact.risk}</div>
            </div>
            <div className="glass rounded-xl p-3 border border-white/10">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Confidence Score</div>
              <div className="mt-1 text-lg font-semibold">{scenarioImpact.confidence}%</div>
            </div>
            <div className="glass rounded-xl p-3 border border-white/10">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Recommended</div>
              <div className="mt-1 text-sm text-slate-200">{scenarioImpact.recommended}</div>
            </div>
          </div>
        ) : null}
      </GlowCard>

      {/* Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <GlowCard className="!p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-primary" />
              <div className="text-sm font-semibold">Market Filters</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Country</div>
                <Select value={country} onValueChange={(v) => setCountry(v)}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
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

              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">City</div>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="bg-input/40 border border-white/10" />
              </div>

              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Property Type</div>
                <Select value={propertyType} onValueChange={(v) => setPropertyType(v)}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 text-white border-white/10">
                    {PROPERTY_TYPES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Investment Goal</div>
                <Select value={investmentGoal} onValueChange={(v) => setInvestmentGoal(v)}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Investment Goal" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 text-white border-white/10">
                    {INVESTMENT_GOALS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk Appetite</div>
                <Select value={riskAppetite} onValueChange={(v) => setRiskAppetite(v as any)}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Risk Appetite" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 text-white border-white/10">
                    {RISK_APPETITES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Time Horizon</div>
                <Select value={timeHorizon} onValueChange={(v) => setTimeHorizon(v as any)}>
                  <SelectTrigger className="border-white/10 bg-black/30 text-white">
                    <SelectValue placeholder="Time Horizon" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 text-white border-white/10">
                    {TIME_HORIZONS.map((o) => (
                      <SelectItem key={o.key} value={o.key}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Confidence Level (min)</div>
                <Input type="number" min={0} max={100} value={confidenceLevel} onChange={(e) => setConfidenceLevel(Number(e.target.value))} className="bg-input/40 border border-white/10" />
                <div className="text-xs text-muted-foreground mt-1">Forecast cards auto-update with confidence threshold.</div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCountry("India");
                  setCity("Dubai Marina");
                  setPropertyType("Apartment");
                  setInvestmentGoal("Rental Income");
                  setRiskAppetite("Medium");
                  setTimeHorizon("6m");
                  setConfidenceLevel(60);
                  setScenario("base");
                  toast.success("Filters cleared");
                }}
              >
                <FilterX className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
              <Button variant="outline" onClick={() => void fetchAll()} disabled={loading}>
                <Filter className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </GlowCard>
        </div>

        <div className="lg:col-span-7 space-y-4">
          <GlowCard className="!p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Data Signal Breakdown</div>
                <div className="text-xs text-muted-foreground">Lead Demand, Search, Rental, Price, Investor, Liquidity, Risk</div>
              </div>
              <Badge variant="outline" className="border-white/10 text-slate-200">
                {scenarioLabel(scenario)} · {timeHorizon}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {topSignals.length ? (
                topSignals.slice(0, 8).map((s) => (
                  <div key={s.label} className={cn("glass rounded-xl border border-white/10 p-3")}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
                      <div className="text-xs text-slate-200 font-semibold">{s.score}</div>
                    </div>
                    <Progress value={s.score} className="mt-2" />
                  </div>
                ))
              ) : (
                <div className="text-slate-300 text-sm">No signal data yet.</div>
              )}
            </div>
          </GlowCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="glass rounded-2xl p-6 col-span-full flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin" />
                Updating forecasts…
              </div>
            ) : forecasts.length ? (
              forecasts.map((f) => (
                <GlowCard
                  key={f.forecast_id}
                  className={cn("!p-4 border border-white/10", riskGlow(f.risk_level))}
                  onClick={() => void openDetails(f.forecast_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{f.forecast_type.replaceAll("_", " ")}</div>
                      <div className="mt-2 font-semibold">{f.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {f.city} · {f.country} · {f.time_horizon}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("border-white/10", riskTone(f.risk_level))}>
                      {f.risk_level}
                    </Badge>
                  </div>

                  <div className="mt-3 text-2xl font-bold neon-text">{formatRevenue(f.forecast_value, f.country, currencySymbol)}</div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-white/10 text-slate-200">Conf {f.confidence_score}%</Badge>
                    <Badge variant="outline" className="border-white/10 text-slate-200">Updated {new Date(f.last_updated).toLocaleTimeString()}</Badge>
                  </div>

                  <div className="mt-3 text-sm text-slate-300">
                    <span className="text-xs uppercase tracking-widest text-muted-foreground">Key reason: </span>
                    {f.supporting_signals.sort((a, b) => b.score - a.score)[0]?.label ?? "Market signal"}
                    {" — "}
                    {f.supporting_signals.sort((a, b) => b.score - a.score)[0]?.score ?? ""}
                    {" points"}
                  </div>

                  <div className="mt-3">
                    <Button size="sm" className="neon-border" onClick={(e) => { e.stopPropagation(); void openDetails(f.forecast_id); }}>
                      View Details
                    </Button>
                  </div>
                </GlowCard>
              ))
            ) : (
              <div className="col-span-full glass rounded-2xl p-8 text-slate-300">No forecast data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 space-y-4">
          <GlowCard className="!p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Forecast Trend Line</div>
                <div className="text-xs text-muted-foreground">Predicted revenue drift across timeline</div>
              </div>
              <Badge variant="outline" className="border-white/10">{country}</Badge>
            </div>
            <div className="mt-3 h-80">
              {chartData ? (
                <ResponsiveContainer>
                  <LineChart data={chartData.trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => formatRevenue(v, country, currencySymbol)} />
                    <RTooltip />
                    <Legend />
                    <Line dataKey="value" name="Actual" stroke="var(--neon)" strokeWidth={2} dot={false} />
                    <Line dataKey="forecast" name="Forecast" stroke="oklch(0.85 0.18 200)" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">No chart data.</div>
              )}
            </div>
          </GlowCard>

          <GlowCard className="!p-4">
            <div className="text-sm font-semibold">Demand vs Supply</div>
            <div className="text-xs text-muted-foreground">Lead & rental demand vs infrastructure supply</div>
            <div className="mt-3 h-72">
              {chartData ? (
                <ResponsiveContainer>
                  <BarChart data={chartData.demandVsSupply}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="name" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="value" fill="var(--neon)" radius={8}>
                      {chartData.demandVsSupply.map((_, idx) => (
                        <Cell key={idx} fill={idx === 0 ? "var(--neon)" : "oklch(0.85 0.18 200)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </GlowCard>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <GlowCard className="!p-4">
            <div className="text-sm font-semibold">Risk Trend</div>
            <div className="text-xs text-muted-foreground">Risk signal escalation probability</div>
            <div className="mt-3 h-72">
              {chartData ? (
                <ResponsiveContainer>
                  <LineChart data={chartData.riskTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <RTooltip />
                    <Legend />
                    <Line dataKey="risk" name="Risk" stroke="oklch(0.82 0.2 150)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </GlowCard>

          <GlowCard className="!p-4">
            <div className="text-sm font-semibold">Confidence Timeline</div>
            <div className="text-xs text-muted-foreground">Confidence driven by signals and scenario</div>
            <div className="mt-3 h-72">
              {chartData ? (
                <ResponsiveContainer>
                  <LineChart data={chartData.confidenceLine}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <RTooltip />
                    <Legend />
                    <Line dataKey="confidence" name="Confidence" stroke="var(--neon)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </GlowCard>

          {/* Bonus pie chart for supporting signals */}
          <GlowCard className="!p-4">
            <div className="text-sm font-semibold">Supporting Signals Mix</div>
            <div className="text-xs text-muted-foreground">Signal weighting for the current forecast set</div>
            <div className="mt-3 h-72">
              {keyRevenueForecast ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={keyRevenueForecast.supporting_signals.slice(0, 5).map((s) => ({ name: s.label, value: s.score }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={45}
                      outerRadius={95}
                      paddingAngle={3}
                    >
                      {keyRevenueForecast.supporting_signals.slice(0, 5).map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={[
                            "var(--neon)",
                            "oklch(0.85 0.18 200)",
                            "oklch(0.7 0.25 300)",
                            "oklch(0.65 0.24 22)",
                            "oklch(0.82 0.2 150)",
                          ][idx % 5]}
                        />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </GlowCard>
        </div>
      </div>

      {/* Detail drawer */}
      <Sheet
        open={detailOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDetailOpen(false);
            setDetail(null);
          }
        }}
      >
        <SheetContent className="max-sm:w-[100vw] max-sm:max-w-none max-sm:h-[100dvh] max-sm:rounded-none sm:max-w-3xl border-white/10 bg-slate-950 text-white">
          <SheetHeader>
            <SheetTitle>{detail ? detail.title : "Forecast Detail"}</SheetTitle>
            <SheetDescription className="text-slate-400">
              {detail ? `${detail.city}, ${detail.country} · ${detail.time_horizon}` : "Loading"}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-6rem)] pr-4 mt-4">
            {detailLoading ? (
              <div className="text-slate-300 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading forecast…
              </div>
            ) : detail ? (
              <div className="space-y-4 pb-6">
                <div className={cn("glass rounded-2xl border border-white/10 p-4", riskGlow(detail.risk_level))}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Forecast Summary</div>
                      <div className="mt-2 text-sm text-slate-200">{detail.summary}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Forecast value</div>
                      <div className="mt-1 text-3xl font-bold neon-text">
                        {formatRevenue(detail.forecast_value, detail.country, currencySymbol)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</div>
                      <div className="mt-1 text-lg font-semibold text-cyan-200">{detail.confidence_score}%</div>
                      <Progress value={detail.confidence_score} className="mt-2" />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk level</div>
                      <div className={cn("mt-1 text-lg font-semibold", riskTone(detail.risk_level))}>{detail.risk_level}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Last updated</div>
                      <div className="mt-1 text-sm text-slate-200">{new Date(detail.last_updated).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="glass border-white/10 p-4">
                    <div className="text-sm font-semibold">Why this forecast exists</div>
                    <div className="mt-2 text-sm text-slate-300">{detail.confidence_explanation}</div>

                    <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Supporting data signals</div>
                    <div className="mt-2 space-y-2">
                      {detail.supporting_signals.slice(0, 8).map((s) => (
                        <div key={s.label} className="flex items-center justify-between gap-3">
                          <div className="text-sm text-slate-200 truncate">{s.label}</div>
                          <div className="text-xs text-slate-400">{s.score}</div>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="glass border-white/10 p-4">
                    <div className="text-sm font-semibold">Assumptions</div>
                    <div className="mt-2 space-y-2">
                      {detail.assumptions.map((a, idx) => (
                        <div key={idx} className="text-sm text-slate-300">• {a}</div>
                      ))}
                    </div>

                    <div className="mt-4 text-sm font-semibold">Risks that can change the result</div>
                    <div className="mt-2 space-y-2">
                      {detail.risks.map((r, idx) => (
                        <div key={idx} className="text-sm text-slate-300">• {r}</div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="glass border-white/10 p-4">
                    <div className="text-sm font-semibold">Recommended action</div>
                    <div className="mt-2 text-sm neon-text font-semibold">{detail.recommended_action}</div>

                    <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground">Best buyer type</div>
                    <div className="mt-2 text-sm text-slate-300">{detail.best_buyer_type}</div>

                    <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Best property type</div>
                    <div className="mt-2 text-sm text-slate-300">{detail.best_property_type}</div>
                  </Card>

                  <Card className="glass border-white/10 p-4">
                    <div className="text-sm font-semibold">Broker next steps</div>
                    <div className="mt-2 text-sm text-slate-300">{detail.broker_next_steps}</div>

                    <div className="mt-4 flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="border-white/10">{detail.status}</Badge>
                      {watchlist[detail.forecast_id] ? <Badge variant="outline" className="border-white/10 text-cyan-200">Watchlisted</Badge> : null}
                    </div>
                  </Card>
                </div>

                <Card className="glass border-white/10 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Action buttons</div>
                      <div className="text-xs text-muted-foreground">Local state + toast / modal actions</div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => setShareOpen(true)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share Forecast
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => { setActive("leads"); setDetailOpen(false); }}>
                      View Leads
                    </Button>
                    <Button variant="outline" onClick={() => { setActive("properties"); setDetailOpen(false); }}>
                      View Matching Properties
                    </Button>
                    <Button variant="outline" onClick={() => void handleCreateInvestorReport()}>
                      Create Investor Report
                    </Button>
                    <Button variant="outline" onClick={() => setBrokerAssignOpen(true)}>
                      Assign Broker
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setWatchlist((prev) => ({ ...prev, [detail.forecast_id]: !prev[detail.forecast_id] }));
                        toast.success(watchlist[detail.forecast_id] ? "Removed from watchlist" : "Added to watchlist");
                      }}
                    >
                      <Bookmark className="mr-2 h-4 w-4" />
                      Add to Watchlist
                    </Button>
                    <Button variant="outline" onClick={() => void handleMarkReviewed(detail.forecast_id)}>
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      Mark Reviewed
                    </Button>
                  </div>
                </Card>

                {/* quick supporting table */}
                <Card className="glass border-white/10 p-4">
                  <div className="text-sm font-semibold">Supporting data references</div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="glass rounded-xl border-white/10 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Related leads</div>
                      <div className="mt-1 text-sm text-slate-200">{Math.min(8, leads.length)}</div>
                    </div>
                    <div className="glass rounded-xl border-white/10 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Related properties</div>
                      <div className="mt-1 text-sm text-slate-200">{Math.min(6, properties.length)}</div>
                    </div>
                    <div className="glass rounded-xl border-white/10 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Appointments</div>
                      <div className="mt-1 text-sm text-slate-200">{Math.min(5, appointments.length)}</div>
                    </div>
                  </div>
                </Card>
              </div>
            ) : (
              <div className="text-slate-300">{detailLoading ? "Loading…" : "No detail"}</div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Share Modal */}
      <Dialog open={shareOpen} onOpenChange={(o) => !o && setShareOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Share Forecast</DialogTitle>
            <DialogDescription className="text-slate-400">WhatsApp, Email, Copy Link, Download Report (UI)</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Button className="w-full" onClick={() => void handleShare("whatsapp")} disabled={!detail}>
              <Share2 className="mr-2 h-4 w-4" /> WhatsApp
            </Button>
            <Button className="w-full" variant="outline" onClick={() => void handleShare("email")} disabled={!detail}>
              <Mail className="mr-2 h-4 w-4" /> Email
            </Button>
            <Button className="w-full" variant="outline" onClick={() => void handleShare("copy")} disabled={!detail}>
              <Copy className="mr-2 h-4 w-4" /> {shareCopied ? "Copied" : "Copy Link"}
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => toast.info("Download Report UI - coming soon")}
            >
              <Download className="mr-2 h-4 w-4" /> Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Broker Modal */}
      <Dialog open={brokerAssignOpen} onOpenChange={(o) => !o && setBrokerAssignOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Broker</DialogTitle>
            <DialogDescription className="text-slate-400">Assign a broker to this forecast (mock backend).</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Select value={brokerAssignId} onValueChange={(v) => setBrokerAssignId(v)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {__mockBrokerList.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} · {b.region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full neon-border" onClick={() => void handleAssignBroker()} disabled={!brokerAssignId}>
              Assign Broker
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

