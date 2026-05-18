import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { toast } from "sonner";
import {
  BadgeCheck,
  Bookmark,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Clock,
  Copy,
  DollarSign,
  Filter,
  FilterX,
  Flame,
  RefreshCcw,
  Share2,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Phone,
  Mail,
  MessageSquareText,
} from "lucide-react";
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

import { formatRevenue, getCurrencyRuleForCountry } from "@/lib/revenue-utils";
import {
  exportBrokerReportCSV,
  fetchBrokerDetails,
  fetchBrokerPerformance,
  messageBroker,
  subscribeToBrokerUpdates,
  assignLeadToBroker,
  type BrokerBadge,
  type BrokerDurationKey,
  type BrokerMarketCountry,
  type BrokerPerformanceAnalytics,
  type BrokerPerformanceRow,
  type BrokerAssignedLeadRow,
} from "@/lib/broker-performance-api";

import { cn } from "@/lib/utils";
import { GlowCard, Mini, SectionHeader } from "../utils";
import { ActivityFeed } from "../ActivityFeed";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

import { Sparkles as SparklesIcon } from "lucide-react";
import { getLeadsCountryLabel } from "@/lib/utils";

const MARKET_COUNTRIES: BrokerMarketCountry[] = ["India", "UAE", "USA", "UK", "Canada", "Singapore", "Australia", "Germany", "France", "Other"];
const DURATION_OPTIONS: Array<{ key: BrokerDurationKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "last7d", label: "Last 7 Days" },
  { key: "last30d", label: "Last 30 Days" },
  { key: "last90d", label: "Last 90 Days" },
  { key: "thisYear", label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

function formatCurrencySymbol(country: BrokerMarketCountry) {
  return getCurrencyRuleForCountry(country).symbol;
}

const STATUS_OPTIONS: Array<"All" | "Active" | "On Hold" | "Inactive"> = ["All", "Active", "On Hold", "Inactive"];
const PERFORMANCE_LEVEL_OPTIONS: Array<"All" | "Strong" | "Balanced" | "At Risk"> = ["All", "Strong", "Balanced", "At Risk"];

function performanceLevelFromScore(score: number) {
  if (score >= 72) return "Strong";
  if (score >= 50) return "Balanced";
  return "At Risk";
}

function badgeTone(b: BrokerBadge) {
  if (b === "Top Closer") return "text-emerald-300 border-white/10 bg-emerald-500/10";
  if (b === "Fast Responder") return "text-cyan-200 border-white/10 bg-cyan-500/10";
  if (b === "High Revenue") return "text-primary border-white/10 bg-primary/10";
  if (b === "Needs Improvement") return "text-yellow-200 border-white/10 bg-yellow-500/10";
  if (b === "Follow-up Risk") return "text-red-300 border-white/10 bg-red-500/10";
  return "text-emerald-300 border-white/10 bg-emerald-500/10";
}

type BrokerAssignedState = {
  assignedLeads: BrokerAssignedLeadRow[];
  appointments: Array<{ lead: string; date: string; time: string; broker: string }>;
};

export function BrokerPerformanceCommandCenter() {
  const { setActive, setLeadFilters, pushActivity, leads } = useDashboard();

  const [marketCountry, setMarketCountry] = useState<BrokerMarketCountry>("India");
  const currencySymbol = useMemo(() => formatCurrencySymbol(marketCountry), [marketCountry]);

  const [selectedDuration, setSelectedDuration] = useState<BrokerDurationKey>("last30d");
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customRange, setCustomRange] = useState({ startDate: "", endDate: "" });

  const [brokerRegion, setBrokerRegion] = useState("All");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_OPTIONS)[number]>("All");
  const [perfLevelFilter, setPerfLevelFilter] = useState<(typeof PERFORMANCE_LEVEL_OPTIONS)[number]>("All");
  const [revenueRange, setRevenueRange] = useState("All");
  const [conversionRange, setConversionRange] = useState("All");
  const [responseTimeRange, setResponseTimeRange] = useState("All");

  const [isUpdating, setIsUpdating] = useState(false);
  const [analytics, setAnalytics] = useState<BrokerPerformanceAnalytics | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailBroker, setDetailBroker] = useState<BrokerPerformanceRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAssigned, setDetailAssigned] = useState<BrokerAssignedState | null>(null);

  const [assignLeadOpen, setAssignLeadOpen] = useState(false);
  const [assignLeadSelectedId, setAssignLeadSelectedId] = useState<string>("");

  const [messageOpen, setMessageOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState<"whatsapp" | "email">("whatsapp");
  const [messageText, setMessageText] = useState("");

  const [revenueModalOpen, setRevenueModalOpen] = useState(false);

  const brokerRegions = useMemo(() => {
    const s = new Set(["All", "Middle East", "Asia Pacific", "North America", "Europe"]);
    return Array.from(s);
  }, []);

  const baseUpdate = async (reason: string) => {
    setIsUpdating(true);
    const toastId = toast.loading("Refreshing broker performance…");
    try {
      const data = await fetchBrokerPerformance({ duration: selectedDuration, country: marketCountry });
      setAnalytics(data);
      pushActivity(`Broker performance updated: ${marketCountry} · ${reason}`, "activity", "revenue");
      toast.success("Broker performance updated", { id: toastId });
    } catch {
      toast.error("Failed to refresh broker performance", { id: toastId });
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    void baseUpdate("initial");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void baseUpdate("duration/country");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marketCountry, selectedDuration]);

  useEffect(() => {
    const unsubscribe = subscribeToBrokerUpdates((next) => {
      if (next.country === marketCountry && next.duration === selectedDuration) {
        setAnalytics(next);
      }
    });
    return unsubscribe;
  }, [marketCountry, selectedDuration]);

  const filteredBrokers = useMemo(() => {
    if (!analytics) return [];
    return analytics.brokers.filter((b) => {
      if (brokerRegion !== "All" && b.region !== brokerRegion) return false;
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (perfLevelFilter !== "All" && performanceLevelFromScore(b.performanceScore) !== perfLevelFilter) return false;
      if (revenueRange !== "All") {
        if (revenueRange === "Under" && b.revenueClosed >= 2_500_000) return false;
        if (revenueRange === "Mid" && (b.revenueClosed < 2_500_000 || b.revenueClosed >= 5_000_000)) return false;
        if (revenueRange === "High" && b.revenueClosed < 5_000_000) return false;
      }
      if (conversionRange !== "All") {
        const min = conversionRange === "Under" ? 0 : conversionRange === "Low" ? 20 : conversionRange === "Mid" ? 35 : 40;
        const max = conversionRange === "Under" ? 25 : conversionRange === "Low" ? 34 : conversionRange === "Mid" ? 45 : 100;
        if (b.conversionRate < min || b.conversionRate > max) return false;
      }
      if (responseTimeRange !== "All") {
        // responseTimeMins: lower is better
        if (responseTimeRange === "Fast" && b.responseTimeMins > 2.8) return false;
        if (responseTimeRange === "Medium" && (b.responseTimeMins < 2.8 || b.responseTimeMins > 4.2)) return false;
        if (responseTimeRange === "Slow" && b.responseTimeMins < 4.2) return false;
      }
      return true;
    });
  }, [analytics, brokerRegion, statusFilter, perfLevelFilter, revenueRange, conversionRange, responseTimeRange]);

  const filteredAnalytics = useMemo(() => {
    if (!analytics) return null;
    const brokers = filteredBrokers;
    const revenueClosedTotal = brokers.reduce((s, b) => s + b.revenueClosed, 0);
    const leadsAssignedTotal = brokers.reduce((s, b) => s + b.leadsAssigned, 0);
    const leadsConvertedTotal = brokers.reduce((s, b) => s + b.closedDeals, 0);
    const closedDealsTotal = leadsConvertedTotal;
    const siteVisitsTotal = brokers.reduce((s, b) => s + b.siteVisitsBooked, 0);
    const commissionTotal = brokers.reduce((s, b) => s + b.commissionEarned, 0);
    const avgResponseTimeMins = brokers.reduce((s, b) => s + b.responseTimeMins, 0) / Math.max(brokers.length, 1);
    const underperformingCount = brokers.filter((b) => b.performanceScore < 45).length;
    const lostRevenueRiskValue = brokers.reduce((s, b) => s + b.lostOpportunitiesValue, 0);
    const topBrokerName = brokers[0]?.brokerName ?? "—";

    const brokerRevenueComparison = brokers.map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, revenue: b.revenueClosed }));
    const brokerConversionChart = brokers.map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, conversion: b.conversionRate }));
    const responseTimeTrend = brokers.slice(0, 5).map((b, i) => ({ label: `${b.brokerName.split(" ")[0] ?? "B"} ${i + 1}`, response: b.responseTimeMins }));
    const leadsVsClosedChart = brokers.slice(0, 6).map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, leads: b.leadsAssigned, closed: b.closedDeals }));
    const lostOpportunityChart = brokers.slice(0, 6).map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, value: b.lostOpportunitiesValue }));
    const commissionChart = brokers.slice(0, 6).map((b) => ({ label: b.brokerName.split(" ")[0] ?? b.brokerName, value: b.commissionEarned }));

    return {
      ...analytics,
      brokers,
      kpis: {
        ...analytics.kpis,
        totalBrokers: brokers.length,
        activeBrokers: brokers.filter((b) => b.status === "Active").length,
        leadsAssigned: leadsAssignedTotal,
        leadsConverted: leadsConvertedTotal,
        siteVisitsBooked: siteVisitsTotal,
        closedDeals: closedDealsTotal,
        revenueClosed: revenueClosedTotal,
        avgResponseTimeMins,
        topBrokerName,
        underperformingCount,
        lostRevenueRiskValue,
      },
      brokerRevenueComparison,
      brokerConversionChart,
      responseTimeTrend,
      leadsVsClosedChart,
      lostOpportunityChart,
      commissionChart,
    };
  }, [analytics, filteredBrokers]);

  const kpis = useMemo(() => {
    if (!filteredAnalytics) return [];
    const m = filteredAnalytics;
    const underRisk = m.kpis.lostRevenueRiskValue;
    const underRiskTone = underRisk >= 2_500_000 ? "text-red-300" : "text-yellow-200";
    return [
      { title: "Total Brokers", value: String(m.kpis.totalBrokers), icon: Users, tone: "var(--neon)" },
      { title: "Active Brokers", value: String(m.kpis.activeBrokers), icon: CheckCircle2, tone: "text-emerald-300" },
      { title: "Leads Assigned", value: String(m.kpis.leadsAssigned), icon: Clipboard, tone: "text-cyan-200" },
      { title: "Leads Converted", value: String(m.kpis.leadsConverted), icon: TrendingUp, tone: "text-emerald-300" },
      { title: "Site Visits Booked", value: String(m.kpis.siteVisitsBooked), icon: CalendarDays, tone: "text-primary" },
      { title: "Closed Deals", value: String(m.kpis.closedDeals), icon: Wallet, tone: "text-emerald-300" },
      { title: "Revenue Closed", value: formatRevenue(m.kpis.revenueClosed, marketCountry, currencySymbol), icon: DollarSign, tone: "var(--neon)" },
      { title: "Avg Response Time", value: `${m.kpis.avgResponseTimeMins.toFixed(1)} min`, icon: Clock, tone: m.kpis.avgResponseTimeMins <= 3.2 ? "text-emerald-300" : "text-yellow-200" },
      { title: "Top Broker", value: m.kpis.topBrokerName.split(" ")[0] ?? m.kpis.topBrokerName, icon: Star, tone: "text-cyan-200" },
      { title: "Underperforming Brokers", value: String(m.kpis.underperformingCount), icon: TrendingDown, tone: "text-yellow-200" },
      { title: "Lost Revenue Risk", value: formatRevenue(m.kpis.lostRevenueRiskValue, marketCountry, currencySymbol), icon: SparklesIcon, tone: underRiskTone },
    ];
  }, [filteredAnalytics, marketCountry, currencySymbol]);

  const openBroker = async (b: BrokerPerformanceRow) => {
    setDetailOpen(true);
    setDetailBroker(b);
    setDetailLoading(true);
    try {
      const res = await fetchBrokerDetails(b.brokerId, { duration: selectedDuration, country: marketCountry });
      setDetailAssigned({ assignedLeads: res.assignedLeads, appointments: res.appointments });
    } catch {
      toast.error("Failed to load broker details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAssignLead = async () => {
    if (!detailBroker || !assignLeadSelectedId) return;
    await assignLeadToBroker({ leadId: assignLeadSelectedId, brokerId: detailBroker.brokerId });
    toast.success("Lead assigned (mock)");
    pushActivity(`Assigned lead to ${detailBroker.brokerName}`, "user-plus", "leads");
    setAssignLeadOpen(false);
  };

  const openAssignLead = () => {
    if (!detailBroker) return;
    setAssignLeadSelectedId("");
    setAssignLeadOpen(true);
  };

  const sendMessage = async () => {
    if (!detailBroker || !messageText.trim()) return;
    await messageBroker({ brokerId: detailBroker.brokerId, channel: messageChannel, message: messageText.trim() });

    const prefix = messageChannel === "whatsapp" ? "WhatsApp" : "Email";
    if (typeof window !== "undefined") {
      const encoded = encodeURIComponent(messageText.trim());
      if (messageChannel === "whatsapp") {
        window.open(`https://wa.me/?text=${encoded}`, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = `mailto:?subject=${encodeURIComponent(`Message from broker dashboard (${detailBroker.brokerName})`)}&body=${encoded}`;
      }
    }
    toast.success(`${prefix} message opened (mock)`);
    setMessageOpen(false);
  };

  const handleExport = async () => {
    if (!filteredAnalytics) return;
    const csv = await exportBrokerReportCSV(filteredAnalytics);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `broker_performance_${marketCountry}_${selectedDuration}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Broker report CSV downloaded");
  };

  const handleMarkReviewed = (brokerId: string) => {
    if (!analytics) return;
    setAnalytics((prev) => {
      if (!prev) return prev;
      return { ...prev, brokers: prev.brokers.map((x) => (x.brokerId === brokerId ? { ...x, reviewed: !x.reviewed } : x)) };
    });
    pushActivity("Marked broker report reviewed", "check-circle-2", "brokers");
  };

  const assignedLeadsForModal = detailAssigned?.assignedLeads ?? [];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Broker Performance Command Center"
        subtitle="Realtime-feeling broker KPIs, lead discipline signals, and action-ready performance intelligence."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => void handleExport()} disabled={!filteredAnalytics}>
            <Copy className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button variant="outline" size="sm" onClick={() => void baseUpdate("manual-refresh")} disabled={isUpdating}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
        </div>
      </SectionHeader>

      <GlowCard className="!p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Country / Currency</div>
            <Select value={marketCountry} onValueChange={(v) => setMarketCountry(v as BrokerMarketCountry)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {MARKET_COUNTRIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Broker Status</div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Performance Level</div>
            <Select value={perfLevelFilter} onValueChange={(v) => setPerfLevelFilter(v as any)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {PERFORMANCE_LEVEL_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Duration</div>
            <Select
              value={selectedDuration}
              onValueChange={(v) => {
                const key = v as BrokerDurationKey;
                if (key === "custom") {
                  setCustomRangeOpen(true);
                  return;
                }
                setSelectedDuration(key);
              }}
            >
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
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
          </div>

          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Revenue Range</div>
            <Select value={revenueRange} onValueChange={(v) => setRevenueRange(v)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Revenue" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Under">Under</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Conversion</div>
            <Select value={conversionRange} onValueChange={(v) => setConversionRange(v)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Conversion" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Under">Under</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Response Time</div>
            <Select value={responseTimeRange} onValueChange={(v) => setResponseTimeRange(v)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Response" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Fast">Fast</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Slow">Slow</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Region</div>
            <Select value={brokerRegion} onValueChange={(v) => setBrokerRegion(v)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                {brokerRegions.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {isUpdating ? "Updating broker performance…" : `Showing ${filteredBrokers.length} brokers`}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              disabled={isUpdating}
              onClick={() => {
                setBrokerRegion("All");
                setStatusFilter("All");
                setPerfLevelFilter("All");
                setRevenueRange("All");
                setConversionRange("All");
                setResponseTimeRange("All");
                toast.success("Broker filters cleared");
              }}
            >
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </div>
      </GlowCard>

      {!filteredAnalytics ? (
        <div className="glass rounded-2xl p-6 text-slate-300">Loading broker performance…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.slice(0, 8).map((k) => (
              <GlowCard key={k.title} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.title}</div>
                  <k.icon className={cn("h-4 w-4", k.tone)} />
                </div>
                <div className="mt-2 text-2xl font-bold">{k.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">Live window · mock data</div>
              </GlowCard>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {kpis.slice(8).map((k) => (
              <GlowCard key={k.title} className="!p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{k.title}</div>
                  <k.icon className={cn("h-4 w-4", k.tone)} />
                </div>
                <div className="mt-2 text-2xl font-bold">{k.value}</div>
              </GlowCard>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
            <GlowCard className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Broker Revenue Comparison</div>
                  <div className="text-xs text-muted-foreground">Ranked by revenue closed</div>
                </div>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <BarChart data={filteredAnalytics.brokerRevenueComparison}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => formatRevenue(v, marketCountry, currencySymbol)} />
                    <RTooltip />
                    <Bar dataKey="revenue" fill="var(--neon)" radius={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Broker Conversion Rate Chart</div>
                  <div className="text-xs text-muted-foreground">Leads → closed deals</div>
                </div>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <LineChart data={filteredAnalytics.brokerConversionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => `${v}%`} />
                    <RTooltip />
                    <Legend />
                    <Line dataKey="conversion" name="Conversion" stroke="oklch(0.85 0.18 200)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Response Time Trend</div>
                  <div className="text-xs text-muted-foreground">Lower is better</div>
                </div>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <BarChart data={filteredAnalytics.responseTimeTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => `${v.toFixed(1)}m`} />
                    <RTooltip />
                    <Bar dataKey="response" fill="oklch(0.65 0.24 22)" radius={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Leads Assigned vs Closed Deals</div>
                  <div className="text-xs text-muted-foreground">Volume and outcome</div>
                </div>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <BarChart data={filteredAnalytics.leadsVsClosedChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Bar dataKey="leads" name="Leads" fill="var(--neon)" radius={10} />
                    <Bar dataKey="closed" name="Closed" fill="oklch(0.85 0.18 200)" radius={10} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Lost Opportunity Chart</div>
                  <div className="text-xs text-muted-foreground">From missed follow-ups</div>
                </div>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={filteredAnalytics.lostOpportunityChart.map((x) => ({ name: x.label, value: x.value }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={100}
                      paddingAngle={2}
                    >
                      {filteredAnalytics.lostOpportunityChart.map((_, idx) => (
                        <Cell key={idx} fill={idx === 0 ? "var(--neon)" : "oklch(0.65 0.24 22)"} />
                      ))}
                    </Pie>
                    <RTooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>

            <GlowCard className="!p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-sm font-semibold">Commission Earned Chart</div>
                  <div className="text-xs text-muted-foreground">Broker/company commissions</div>
                </div>
              </div>
              <div className="mt-3 h-72">
                <ResponsiveContainer>
                  <LineChart data={filteredAnalytics.commissionChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                    <XAxis dataKey="label" stroke="oklch(0.7 0.03 255)" fontSize={10} />
                    <YAxis tickFormatter={(v) => formatRevenue(v, marketCountry, currencySymbol)} />
                    <RTooltip />
                    <Line dataKey="value" name="Commission" stroke="var(--neon)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </GlowCard>
          </div>

          <GlowCard className="!p-4 mt-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Broker Cards / Table</div>
                <div className="text-xs text-muted-foreground">Click for details, use action buttons for next steps</div>
              </div>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block mt-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Broker</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Hot Leads</TableHead>
                      <TableHead>Follow-ups</TableHead>
                      <TableHead>Site Visits</TableHead>
                      <TableHead>Closed</TableHead>
                      <TableHead>Conv %</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Revenue Closed</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Perf Score</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnalytics.brokers.map((b) => (
                      <TableRow key={b.brokerId} className="cursor-pointer hover:bg-white/5" onClick={() => void openBroker(b)}>
                        <TableCell className="font-medium">#{b.rank}</TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <div className="font-semibold truncate">{b.brokerName}</div>
                            <div className="text-xs text-muted-foreground">{b.region}</div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {b.badges.slice(0, 2).map((bd) => (
                                <Badge key={bd} variant="outline" className={cn("border-white/10 text-[11px] px-2 py-0", badgeTone(bd))}>
                                  {bd}
                                </Badge>
                              ))}
                              {b.badges.length > 2 ? <Badge variant="outline" className="border-white/10 text-[11px] px-2 py-0">+{b.badges.length - 2}</Badge> : null}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{b.role}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              "border-white/10",
                              b.status === "Active" ? "text-emerald-300" : b.status === "On Hold" ? "text-yellow-200" : "text-red-300",
                            )}
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{b.leadsAssigned}</TableCell>
                        <TableCell>{b.hotLeadsHandled}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-col">
                            <span>Done: {b.followUpsCompleted}</span>
                            <span className={cn(b.missedFollowUps >= 20 ? "text-red-300" : "text-yellow-200")}>Missed: {b.missedFollowUps}</span>
                          </div>
                        </TableCell>
                        <TableCell>{b.siteVisitsBooked}</TableCell>
                        <TableCell>{b.closedDeals}</TableCell>
                        <TableCell>{b.conversionRate.toFixed(1)}%</TableCell>
                        <TableCell>{b.responseTimeMins.toFixed(1)}m</TableCell>
                        <TableCell>{formatRevenue(b.revenueClosed, marketCountry, currencySymbol)}</TableCell>
                        <TableCell>{formatRevenue(b.commissionEarned, marketCountry, currencySymbol)}</TableCell>
                        <TableCell>{b.performanceScore}</TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => void openBroker(b)}>
                              View Details
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDetailBroker(b); setDetailAssigned(null); setAssignLeadOpen(true); setAssignLeadSelectedId(""); }}>
                              Assign
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { setDetailBroker(b); setMessageOpen(true); setMessageText(""); }}>
                              Message
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleMarkReviewed(b.brokerId)}>
                              {b.reviewed ? "Reviewed" : "Mark"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden mt-4 space-y-3">
              {filteredAnalytics.brokers.map((b) => (
                <GlowCard key={b.brokerId} className="!p-4" onClick={() => void openBroker(b)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_10px_var(--neon)]" />
                        <div className="font-semibold truncate">{b.brokerName}</div>
                        <Badge variant="outline" className="border-white/10 text-[11px]">{`#${b.rank}`}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{b.region} · {b.role}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {b.badges.slice(0, 3).map((bd) => (
                          <Badge key={bd} variant="outline" className={cn("border-white/10 text-[11px]", badgeTone(bd))}>
                            {bd}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{formatRevenue(b.revenueClosed, marketCountry, currencySymbol)}</div>
                      <div className={cn("text-xs", b.performanceScore >= 70 ? "text-emerald-300" : b.performanceScore >= 50 ? "text-yellow-200" : "text-red-300")}>Perf {b.performanceScore}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="glass rounded-lg p-2 border border-white/10">
                      <div className="text-muted-foreground">Leads</div>
                      <div className="font-semibold">{b.leadsAssigned}</div>
                    </div>
                    <div className="glass rounded-lg p-2 border border-white/10">
                      <div className="text-muted-foreground">Conv</div>
                      <div className="font-semibold">{b.conversionRate.toFixed(1)}%</div>
                    </div>
                    <div className="glass rounded-lg p-2 border border-white/10">
                      <div className="text-muted-foreground">Response</div>
                      <div className="font-semibold">{b.responseTimeMins.toFixed(1)}m</div>
                    </div>
                    <div className="glass rounded-lg p-2 border border-white/10">
                      <div className="text-muted-foreground">Follow-ups</div>
                      <div className="font-semibold">{b.followUpsCompleted}/{b.missedFollowUps} missed</div>
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); void openBroker(b); }}>
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailBroker(b); setAssignLeadOpen(true); setAssignLeadSelectedId(""); }}>
                      Assign Lead
                    </Button>
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDetailBroker(b); setMessageOpen(true); }}>
                      Message Broker
                    </Button>
                  </div>
                </GlowCard>
              ))}
            </div>
          </GlowCard>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-4">
            <GlowCard className="!p-4 xl:col-span-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">AI Insights (Broker-specific)</div>
                  <div className="text-xs text-muted-foreground">What happened · why it matters · next action</div>
                </div>
                <Badge variant="outline" className="border-white/10">{marketCountry}</Badge>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAnalytics.brokers.slice(0, 4).map((b) => (
                  <Card key={b.brokerId} className="glass border-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold">{b.brokerName}</div>
                      <Badge variant="outline" className="border-white/10">{performanceLevelFromScore(b.performanceScore)}</Badge>
                    </div>
                    <div className="mt-2 text-sm font-semibold neon-text">{b.aiSummary.what}</div>
                    <div className="mt-1 text-sm text-slate-300">{b.aiSummary.why}</div>
                    <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Action</div>
                    <div className="mt-1 text-sm text-slate-200">{b.aiSummary.action}</div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => void openBroker(b)}>View Details</Button>
                      <Button size="sm" variant="outline" onClick={() => handleMarkReviewed(b.brokerId)}>
                        <Bookmark className="mr-2 h-4 w-4" />
                        Mark Reviewed
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </GlowCard>

            <div className="xl:col-span-1">
              <ActivityFeed />
            </div>
          </div>
        </>
      )}

      {/* Broker detail modal */}
      <Dialog
        open={detailOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDetailOpen(false);
            setDetailBroker(null);
            setDetailAssigned(null);
          }
        }}
      >
        <DialogContent className="glass-strong border-white/10 max-w-4xl max-h-[90vh] overflow-y-auto">
          {detailBroker ? (
            <>
              <DialogHeader>
                <DialogTitle>{detailBroker.brokerName}</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {detailBroker.role} · {detailBroker.region} · Status {detailBroker.status} · Rank #{detailBroker.rank}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="max-h-[70vh] pr-3">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Badge variant="outline" className="border-white/10">
                      Perf Score: <span className="ml-1">{detailBroker.performanceScore}</span>
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {detailBroker.badges.map((bd) => (
                        <Badge key={bd} variant="outline" className={cn("border-white/10", badgeTone(bd))}>
                          {bd}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <GlowCard className="!p-4">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Assigned Leads</div>
                      <div className="mt-2 text-2xl font-bold">{detailBroker.leadsAssigned}</div>
                      <div className="mt-2 text-xs text-slate-300">Hot: {detailBroker.hotLeadsHandled}</div>
                    </GlowCard>
                    <GlowCard className="!p-4">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Follow-up Discipline</div>
                      <div className="mt-2 text-2xl font-bold">
                        {detailBroker.followUpsCompleted}/{detailBroker.missedFollowUps}
                      </div>
                      <div className="mt-2 text-xs text-slate-300">
                        Missed follow-ups: <span className={cn(detailBroker.missedFollowUps >= 20 ? "text-red-300" : "text-yellow-200")}>{detailBroker.missedFollowUps}</span>
                      </div>
                    </GlowCard>

                    <GlowCard className="!p-4">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Site Visits & Closed</div>
                      <div className="mt-2 text-2xl font-bold">{detailBroker.siteVisitsBooked} / {detailBroker.closedDeals}</div>
                      <div className="mt-2 text-xs text-slate-300">Leads → closure pipeline</div>
                    </GlowCard>
                    <GlowCard className="!p-4">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Revenue & Commission</div>
                      <div className="mt-2 text-2xl font-bold">{formatRevenue(detailBroker.revenueClosed, marketCountry, currencySymbol)}</div>
                      <div className="mt-2 text-xs text-slate-300">Commission: {formatRevenue(detailBroker.commissionEarned, marketCountry, currencySymbol)}</div>
                    </GlowCard>
                  </div>

                  <GlowCard className="!p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold">Revenue History</div>
                        <div className="text-xs text-muted-foreground">Mock trend points for the selected duration</div>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setRevenueModalOpen(true)}>
                        View Revenue
                      </Button>
                    </div>
                    <div className="mt-3 h-72">
                      <ResponsiveContainer>
                        <LineChart data={detailBroker.revenueHistory.map((v, i) => ({ i, v }))}>
                          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" />
                          <XAxis dataKey="i" tickFormatter={(v) => `T${Number(v) + 1}`} />
                          <YAxis tickFormatter={(v) => formatRevenue(Number(v), marketCountry, currencySymbol)} />
                          <RTooltip />
                          <Legend />
                          <Line dataKey="v" name="Revenue" stroke="var(--neon)" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </GlowCard>

                  <GlowCard className="!p-4">
                    <div className="text-sm font-semibold">AI Recommendation</div>
                    <div className="mt-2 text-sm neon-text font-semibold">{detailBroker.aiSummary.what}</div>
                    <div className="mt-2 text-sm text-slate-300">{detailBroker.aiSummary.why}</div>
                    <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Next action plan</div>
                    <div className="mt-1 text-sm text-slate-200">{detailBroker.aiSummary.action}</div>

                    <div className="mt-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Weak areas</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {detailBroker.weakAreas.map((w) => (
                          <Badge key={w} variant="outline" className="border-white/10">
                            {w}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </GlowCard>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <GlowCard className="!p-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div>
                          <div className="text-sm font-semibold">Assigned Leads</div>
                          <div className="text-xs text-muted-foreground">Hot + pending follow-ups</div>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => { setLeadFilters({ country: marketCountry }); setActive("leads"); toast.success("Switched to Leads"); }}>
                          View Leads
                        </Button>
                      </div>

                      {detailLoading ? (
                        <div className="mt-3 text-slate-300">Loading assigned leads…</div>
                      ) : (
                        <div className="mt-3 space-y-2">
                          {assignedLeadsForModal.slice(0, 8).map((l) => (
                            <div key={l.id} className="glass rounded-xl border-white/10 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-semibold truncate">{l.name}</div>
                                  <div className="text-xs text-muted-foreground">{l.city} · {l.country}</div>
                                </div>
                                <Badge variant="outline" className={cn("border-white/10", l.isHot ? "text-emerald-300" : "text-slate-300")}>
                                  {l.isHot ? "Hot" : "Normal"}
                                </Badge>
                              </div>
                              <div className="mt-2 text-xs text-slate-300">
                                {l.budget} · AI {l.aiScore} · {l.urgency} · {l.source}
                              </div>
                            </div>
                          ))}
                          {assignedLeadsForModal.length === 0 ? <div className="text-slate-300">No assigned leads for this broker.</div> : null}
                        </div>
                      )}

                      <div className="mt-3 flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline" onClick={() => openAssignLead()}>
                          Assign Lead
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setMessageOpen(true); setMessageChannel("whatsapp"); }}>
                          Message Broker
                        </Button>
                      </div>
                    </GlowCard>

                    <GlowCard className="!p-4">
                      <div className="text-sm font-semibold">Appointments (Site Visits)</div>
                      <div className="text-xs text-muted-foreground mt-1">Upcoming and recent scheduled meetings</div>
                      <div className="mt-3 space-y-2">
                        {(detailAssigned?.appointments ?? []).length ? (
                          (detailAssigned?.appointments ?? []).slice(0, 6).map((a, idx) => (
                            <div key={`${a.lead}-${idx}`} className="glass rounded-xl border-white/10 p-3">
                              <div className="font-semibold">{a.lead}</div>
                              <div className="text-xs text-muted-foreground">{a.date} · {a.time}</div>
                              <div className="text-xs text-slate-300 mt-1">{a.broker}</div>
                            </div>
                          ))
                        ) : (
                          <div className="text-slate-300">No appointments found for this broker.</div>
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="text-xs uppercase tracking-widest text-muted-foreground">Lost opportunities</div>
                        <div className="mt-2 text-sm text-slate-200">
                          Estimated: {formatRevenue(detailBroker.lostOpportunitiesValue, marketCountry, currencySymbol)}
                        </div>
                        <div className="mt-2 text-xs text-slate-400">Derived from missed follow-ups and pipeline leakage.</div>
                      </div>
                    </GlowCard>
                  </div>

                  <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="outline" onClick={() => setMessageOpen(true)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Message Broker
                    </Button>
                    <Button variant="outline" onClick={() => handleMarkReviewed(detailBroker.brokerId)}>
                      <BadgeCheck className="mr-2 h-4 w-4" />
                      Mark Reviewed
                    </Button>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : (
            <div className="text-slate-300">No broker selected.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign lead modal */}
      <Dialog open={assignLeadOpen} onOpenChange={(o) => !o && setAssignLeadOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign Lead</DialogTitle>
            <DialogDescription className="text-slate-400">Pick a lead and assign to the selected broker (mock).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={assignLeadSelectedId} onValueChange={(v) => setAssignLeadSelectedId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select lead" />
              </SelectTrigger>
              <SelectContent>
                {(detailAssigned?.assignedLeads ?? leads.map((l) => ({ id: l.id, name: l.name, country: l.country, city: l.city, budget: l.budget, aiScore: l.aiScore, urgency: l.urgency, source: l.source, status: "Pending", isHot: l.aiScore >= 75 })))
                  .slice(0, 18)
                  .map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.name} · {l.city} {l.isHot ? "(Hot)" : ""}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => void handleAssignLead()} disabled={!assignLeadSelectedId}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Lead
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Message modal */}
      <Dialog open={messageOpen} onOpenChange={(o) => !o && setMessageOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle>Message Broker</DialogTitle>
            <DialogDescription className="text-slate-400">WhatsApp or Email share (mock backend).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button variant={messageChannel === "whatsapp" ? "default" : "outline"} onClick={() => setMessageChannel("whatsapp")}>
                <Share2 className="mr-2 h-4 w-4" />
                WhatsApp
              </Button>
              <Button variant={messageChannel === "email" ? "default" : "outline"} onClick={() => setMessageChannel("email")}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
            </div>
            <Textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Write message…" className="min-h-[120px]" />
            <Button className="w-full" onClick={() => void sendMessage()} disabled={!messageText.trim()}>
              <Sparkles className="mr-2 h-4 w-4" />
              Send (Open Draft)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revenue detail modal */}
      <Dialog open={revenueModalOpen} onOpenChange={(o) => !o && setRevenueModalOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-xl">
          <DialogHeader>
            <DialogTitle>Broker Revenue Detail</DialogTitle>
            <DialogDescription className="text-slate-400">Revenue + commission snapshot for the selected window.</DialogDescription>
          </DialogHeader>
          {detailBroker ? (
            <div className="space-y-3">
              <div className="glass rounded-xl border-white/10 p-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Revenue closed</div>
                <div className="mt-1 text-2xl font-bold">{formatRevenue(detailBroker.revenueClosed, marketCountry, currencySymbol)}</div>
              </div>
              <div className="glass rounded-xl border-white/10 p-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Commission earned</div>
                <div className="mt-1 text-2xl font-bold">{formatRevenue(detailBroker.commissionEarned, marketCountry, currencySymbol)}</div>
              </div>
              <div className="glass rounded-xl border-white/10 p-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground">Performance score</div>
                <div className="mt-1 text-2xl font-bold">{detailBroker.performanceScore}</div>
              </div>
            </div>
          ) : (
            <div className="text-slate-300">Select a broker first.</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Custom range */}
      <Dialog open={customRangeOpen} onOpenChange={(o) => !o && setCustomRangeOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-md max-sm:w-[100vw] max-sm:max-w-none max-sm:h-[100dvh] max-sm:rounded-none">
          <DialogHeader>
            <DialogTitle>Custom Range</DialogTitle>
            <DialogDescription className="text-slate-400">Apply a custom duration window for broker analytics (mock).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Start date</div>
              <Input type="date" value={customRange.startDate} onChange={(e) => setCustomRange((p) => ({ ...p, startDate: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">End date</div>
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
                setCustomRangeOpen(false);
                toast.success("Custom range applied");
                pushActivity(`Broker performance custom range: ${startDate} → ${endDate}`, "calendar", "brokers");
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

