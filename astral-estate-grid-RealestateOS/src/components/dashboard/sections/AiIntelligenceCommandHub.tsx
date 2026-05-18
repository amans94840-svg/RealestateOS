import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { toast } from "sonner";
import {
  BadgeCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Clock,
  Copy,
  Flame,
  Globe,
  Mail,
  MessageSquareText,
  RefreshCcw,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Share2,
  Bookmark,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { formatRevenue, getCurrencyRuleForCountry } from "@/lib/revenue-utils";
import {
  createFollowUpFromInsight,
  fetchAIInsights,
  fetchInsightById,
  assignBrokerToInsight,
  updateInsightStatus,
  subscribeToAIInsightsUpdates,
  type AiInsightCategory,
  type AiInsightPriority,
  type AiInsightRecord,
  type AiInsightRiskLevel,
  type AiInsightStatus,
} from "@/lib/ai-insights-api";
import { GlowCard, Mini, SectionHeader } from "../utils";

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
  "Saudi Arabia",
  "Other",
] as const;

const CATEGORY_OPTIONS: Array<"All" | AiInsightCategory> = [
  "All",
  "Lead Conversion",
  "Revenue Opportunity",
  "Market Demand",
  "Broker Performance",
  "Investor Signal",
  "Risk Warning",
  "Follow-up Reminder",
  "Property Opportunity",
];

const PRIORITY_OPTIONS: Array<"All" | AiInsightPriority> = ["All", "Low", "Medium", "High", "Critical"];
const STATUS_OPTIONS: Array<"All" | AiInsightStatus> = ["All", "New", "In Progress", "Resolved", "Ignored"];

const RISK_OPTIONS: Array<"All" | AiInsightRiskLevel> = ["All", "Low", "Medium", "High"];

const DEFAULT_RANGE = { startDate: "", endDate: "" };

function riskGlow(level: AiInsightRiskLevel) {
  if (level === "Low") return "border-emerald-500/30 bg-emerald-500/10";
  if (level === "Medium") return "border-yellow-500/30 bg-yellow-500/10";
  return "border-red-500/30 bg-red-500/10";
}

function priorityLane(priority: AiInsightPriority) {
  if (priority === "Critical") return "text-red-300 border-red-500/30 bg-red-500/10";
  if (priority === "High") return "text-yellow-200 border-yellow-500/30 bg-yellow-500/10";
  if (priority === "Medium") return "text-cyan-200 border-cyan-500/30 bg-cyan-500/10";
  return "text-emerald-300 border-emerald-500/30 bg-emerald-500/10";
}

function priorityToImpactTone(priority: AiInsightPriority) {
  if (priority === "Critical") return "text-red-300";
  if (priority === "High") return "text-yellow-200";
  if (priority === "Medium") return "text-cyan-200";
  return "text-emerald-300";
}

function badgeStatusTone(status: AiInsightStatus) {
  if (status === "New") return "border-primary/40 text-primary";
  if (status === "In Progress") return "border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]";
  if (status === "Resolved") return "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]";
  return "border-muted text-muted-foreground";
}

function formatConfidence(c: number) {
  return `${Math.round(c)}%`;
}

function composeShareText(rec: AiInsightRecord, currencySymbol: string) {
  const revenueImpact = formatRevenue(rec.revenue_impact, rec.country, currencySymbol);
  return [
    `AI Intelligence Command Hub`,
    `Country: ${rec.country} · City: ${rec.city}`,
    `Category: ${rec.category}`,
    `Priority: ${rec.priority}`,
    `Confidence: ${formatConfidence(rec.confidence_score)}`,
    `Revenue Impact: ${revenueImpact}`,
    `Recommended Action: ${rec.recommended_action}`,
    `Risk if ignored: ${rec.risk_if_ignored}`,
  ].join("\n");
}

export function AiIntelligenceCommandHub() {
  const { insights, updateInsight, pushActivity, setActive } = useDashboard();

  const [country, setCountry] = useState<string>("India");
  const [category, setCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("All");
  const [priority, setPriority] = useState<(typeof PRIORITY_OPTIONS)[number]>("All");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("All");
  const [confidenceMin, setConfidenceMin] = useState<number>(60);
  const [riskLevel, setRiskLevel] = useState<(typeof RISK_OPTIONS)[number]>("All");
  const [dateRange, setDateRange] = useState(DEFAULT_RANGE);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AiInsightRecord[]>([]);

  const currencyRule = useMemo(() => getCurrencyRuleForCountry(country), [country]);
  const currencySymbolForUi = currencyRule.symbol;

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<AiInsightRecord | null>(null);

  const [relatedOpen, setRelatedOpen] = useState(false);
  const [relatedTableMode, setRelatedTableMode] = useState<"leads" | "properties" | "brokers">("leads");

  const [assignBrokerOpen, setAssignBrokerOpen] = useState(false);
  const [assignBrokerId, setAssignBrokerId] = useState<string>("");

  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpStatus, setFollowUpStatus] = useState<"idle" | "creating">("idle");
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  const selectedFilters = useMemo(
    () => ({
      country,
      category: category === "All" ? undefined : category,
      priority: priority === "All" ? undefined : priority,
      status: status === "All" ? undefined : status,
      confidenceMin,
      riskLevel: riskLevel === "All" ? undefined : riskLevel,
      dateRange,
    }),
    [country, category, priority, status, confidenceMin, riskLevel, dateRange],
  );

  const visibleItems = useMemo(() => {
    // local instant filtering while mock data updates happen
    return items.filter((i) => {
      if (selectedFilters.category && i.category !== selectedFilters.category) return false;
      if (selectedFilters.priority && i.priority !== selectedFilters.priority) return false;
      if (selectedFilters.status && i.status !== selectedFilters.status) return false;
      if (i.confidence_score < selectedFilters.confidenceMin) return false;
      if (selectedFilters.riskLevel && i.risk_level !== selectedFilters.riskLevel) return false;
      // dateRange is mock-based; still apply simple check vs created_at.
      const start = selectedFilters.dateRange.startDate ? new Date(selectedFilters.dateRange.startDate).getTime() : null;
      const end = selectedFilters.dateRange.endDate ? new Date(selectedFilters.dateRange.endDate).getTime() : null;
      if (start != null && i.created_at < start) return false;
      if (end != null && i.created_at > end) return false;
      return true;
    });
  }, [items, selectedFilters]);

  useEffect(() => {
    setLoading(true);
    void fetchAIInsights(country, {
      category: selectedFilters.category ?? "All",
      priority: selectedFilters.priority ?? "All",
      status: selectedFilters.status ?? "All",
      confidenceMin: selectedFilters.confidenceMin,
      riskLevel: selectedFilters.riskLevel ?? "All",
      dateRange: selectedFilters.dateRange,
    } as any)
      .then((res) => setItems(res))
      .catch(() => toast.error("Failed to load AI insights"))
      .finally(() => setLoading(false));
  }, [country, selectedFilters.category, selectedFilters.priority, selectedFilters.status, selectedFilters.confidenceMin, selectedFilters.riskLevel, selectedFilters.dateRange]);

  useEffect(() => {
    // realtime-like placeholder
    let mounted = true;
    void subscribeToAIInsightsUpdates(({ insight_id, status: nextStatus }) => {
      if (!mounted) return;
      setItems((prev) => prev.map((x) => (x.insight_id === insight_id ? { ...x, status: nextStatus, updated_at: Date.now() } : x)));
      // also update global dashboard insight statuses if it exists there
      const local = insights.find((x) => (x as any).insight_id === insight_id) as any | undefined;
      if (local) updateInsight(local.id ?? local.insight_id, { status: nextStatus } as any);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    const data = await fetchInsightById(id);
    setDetail(data);
    if (!data) toast.error("Insight not found");
  };

  const handleStatusUpdate = async (next: AiInsightStatus) => {
    if (!detail) return;
    // Update backend placeholder
    const updated = await updateInsightStatus(detail.insight_id, next);
    if (updated) setDetail(updated);
    setItems((prev) => prev.map((x) => (x.insight_id === detail.insight_id ? { ...x, status: next } : x)));
    // Update dashboard global insights if IDs line up
    const matching = insights.find((x) => x.id === (detail as any).insight_id || x.id === detail.insight_id);
    if (matching) updateInsight(matching.id, { status: next } as any);
    pushActivity(`AI insight marked ${next}: ${detail.title}`, "sparkles", "ai");
    toast.success(`Insight ${next}`);
  };

  const handleCreateFollowUp = async () => {
    if (!detail) return;
    setFollowUpError(null);
    setFollowUpStatus("creating");
    try {
      const task = await createFollowUpFromInsight(detail.insight_id);
      if (!task) {
        toast.error("Failed to create follow-up");
        setFollowUpStatus("idle");
        return;
      }
      pushActivity(`Follow-up created from insight: ${detail.title}`, "calendar", "ai");
      toast.success("Follow-up created");
      setFollowUpOpen(false);
      setFollowUpStatus("idle");
    } catch {
      setFollowUpError("Failed to create follow-up");
      setFollowUpStatus("idle");
      toast.error("Failed to create follow-up");
    }
  };

  const handleAssignBroker = async () => {
    if (!detail) return;
    if (!assignBrokerId) {
      toast.error("Select a broker");
      return;
    }
    await assignBrokerToInsight(detail.insight_id, assignBrokerId);
    toast.success("Broker assigned (mock)");
    setAssignBrokerOpen(false);
  };

  const handleCopyLink = async () => {
    if (!detail) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/ai-insights/${detail.insight_id}` : "";
    if (!navigator.clipboard?.writeText) {
      toast.error("Clipboard not available");
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied");
  };

  const handleShare = (channel: "whatsapp" | "email" | "copy") => {
    if (!detail) return;
    const text = composeShareText(detail, currencySymbolForUi);
    if (channel === "copy") {
      void handleCopyLink();
      return;
    }
    if (typeof window === "undefined") return;
    if (channel === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
      toast.success("WhatsApp opened");
    } else {
      window.location.href = `mailto:?subject=${encodeURIComponent(`AI Insight: ${detail.title}`)}&body=${encodeURIComponent(text)}`;
      toast.success("Email draft opened");
    }
  };

  const marketExamples = useMemo(() => {
    if (country === "India") return ["Noida Sector 150", "Dubai-to-Noida spillover signals", "Mumbai premium lanes"];
    if (country === "UAE") return ["Dubai Marina luxury corridor", "Downtown investor interest", "Abu Dhabi liquidity spike"];
    if (country === "USA") return ["Manhattan deal velocity", "LA demand pockets", "Miami conversion lift"];
    if (country === "UK") return ["London Mayfair momentum", "Manchester conversion slope", "Birmingham follow-up speed"];
    if (country === "Canada") return ["Toronto liquidity mix", "Vancouver site-visit jump", "Calgary conversion improvement"];
    if (country === "Germany") return ["Berlin follow-up cadence", "Munich investor intent", "EU broker response improvements"];
    if (country === "France") return ["Paris demand signals", "Lyon appointment readiness", "Cross-border risk checks"];
    if (country === "Saudi Arabia") return ["Riyadh risk correction", "Jeddah lead velocity", "Saudi investor pipeline"];
    if (country === "Other") return ["Global cross-market patterns", "Cross-border leakage checks", "Best opportunity scanning"];
    return ["Singapore demand pockets", "Australia lead conversion", "Best market detection"];
  }, [country]);

  const topSeverities = useMemo(() => {
    const sorted = [...visibleItems].sort((a, b) => {
      const rank = (p: AiInsightPriority) => (p === "Critical" ? 4 : p === "High" ? 3 : p === "Medium" ? 2 : 1);
      return rank(b.priority) - rank(a.priority);
    });
    return sorted.slice(0, 6);
  }, [visibleItems]);

  const radarPanel = useMemo(() => {
    // mock radar metrics derived from visibleItems
    const byCat = new Map<string, number>();
    for (const i of visibleItems) {
      byCat.set(i.category, (byCat.get(i.category) ?? 0) + i.impact_score);
    }
    const entries = Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    return entries.map(([k, v]) => ({ label: k, value: Math.round((v / total) * 100) }));
  }, [visibleItems]);

  const detailCurrencySymbol = currencyRule.symbol;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Intelligence Command Hub"
        subtitle="Country-aware risk + opportunity insights with action-ready follow-ups."
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={loading} onClick={() => toast.success("Realtime AI refresh (mock)")}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="outline" size="sm" disabled={!visibleItems.length} onClick={() => toast.success("Export prepared (mock)")}>
            <Clipboard className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </SectionHeader>

      {/* Filters + Country signal panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5">
          <GlowCard className="!p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-sm font-semibold">Country Signal Panel</div>
                  <div className="text-xs text-muted-foreground">Market examples + currency impact</div>
                </div>
              </div>
              <Badge variant="outline" className="border-white/10 text-slate-200">
                {country}
              </Badge>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Category</div>
                  <Select value={category} onValueChange={(v) => setCategory(v as any)}>
                    <SelectTrigger className="border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 text-white border-white/10">
                      {CATEGORY_OPTIONS.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Priority</div>
                  <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                    <SelectTrigger className="border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 text-white border-white/10">
                      {PRIORITY_OPTIONS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Status</div>
                  <Select value={status} onValueChange={(v) => setStatus(v as any)}>
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
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk Level</div>
                  <Select value={riskLevel} onValueChange={(v) => setRiskLevel(v as any)}>
                    <SelectTrigger className="border-white/10 bg-black/30 text-white">
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 text-white border-white/10">
                      {RISK_OPTIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Confidence ≥</div>
                  <Input type="number" value={confidenceMin} min={0} max={100} onChange={(e) => setConfidenceMin(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Date Range</div>
                  <div className="flex gap-2">
                    <Input type="date" value={dateRange.startDate} onChange={(e) => setDateRange((p) => ({ ...p, startDate: e.target.value }))} />
                    <Input type="date" value={dateRange.endDate} onChange={(e) => setDateRange((p) => ({ ...p, endDate: e.target.value }))} />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Market examples</div>
              <div className="flex flex-wrap gap-2">
                {marketExamples.slice(0, 3).map((ex) => (
                  <Badge key={ex} variant="outline" className="border-white/10 text-slate-200">
                    {ex}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">AI Radar (top categories)</div>
              <div className="grid grid-cols-2 gap-2">
                {radarPanel.length ? (
                  radarPanel.map((r) => (
                    <div key={r.label} className="glass rounded-xl border-white/10 p-3">
                      <div className="text-xs text-muted-foreground">{r.label}</div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <Progress value={r.value} className="w-full" />
                        <span className="text-xs text-slate-200 whitespace-nowrap">{r.value}%</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-slate-300 text-sm">No radar signals yet.</div>
                )}
              </div>
            </div>
          </GlowCard>
        </div>

        <div className="xl:col-span-7 space-y-4">
          <GlowCard className="!p-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <div className="text-sm font-semibold">Priority Timeline</div>
                <div className="text-xs text-muted-foreground">Severity lanes sorted by priority & confidence</div>
              </div>
              <Badge variant="outline" className="border-white/10 text-slate-200">
                {visibleItems.length} insights
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {(["Critical", "High", "Medium", "Low"] as const).map((p) => {
                const count = visibleItems.filter((x) => x.priority === p).length;
                return (
                  <Badge key={p} variant="outline" className={cn("border-white/10", priorityLane(p))}>
                    {p} ({count})
                  </Badge>
                );
              })}
            </div>
          </GlowCard>

          {/* Insight grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visibleItems.map((i) => (
              <GlowCard
                key={i.insight_id}
                className={cn(
                  "!p-4",
                  "border border-white/10",
                  riskGlow(i.risk_level),
                )}
                onClick={() => void openDetail(i.insight_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("border-white/10", priorityLane(i.priority))}>
                        {i.priority}
                      </Badge>
                      <Badge variant="outline" className={cn("border-white/10", badgeStatusTone(i.status))}>
                        {i.status}
                      </Badge>
                    </div>
                    <div className="mt-2 font-semibold truncate">{i.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {i.category} · {i.city}, {i.country}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-xs uppercase tracking-widest text-muted-foreground")}>Confidence</div>
                    <div className={cn("mt-1 text-lg font-bold", priorityToImpactTone(i.priority))}>{formatConfidence(i.confidence_score)}</div>
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Revenue impact</div>
                  <div className="text-sm neon-text font-semibold">
                    {formatRevenue(i.revenue_impact, i.country, currencySymbolForUi)}
                  </div>
                  <div className="text-sm text-slate-300">{i.summary}</div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400">Risk if ignored</div>
                  <Badge variant="outline" className="border-white/10 text-slate-200">
                    {i.risk_level}
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" className="neon-border" onClick={(e) => { e.stopPropagation(); void openDetail(i.insight_id); }}>
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetail(i);
                      setRelatedOpen(true);
                      setRelatedTableMode("leads");
                    }}
                  >
                    View Related Data
                  </Button>
                </div>
              </GlowCard>
            ))}
          </div>

          {!visibleItems.length && !loading ? (
            <div className="glass rounded-2xl p-8 text-slate-300 text-center">
              No AI insights match your filters. Try lowering confidence or changing risk level.
            </div>
          ) : null}
        </div>
      </div>

      {/* Detail Drawer */}
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
            <SheetTitle className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-5 w-5 text-primary" />
              {detail ? detail.title : "AI Insight"}
              {detail ? (
                <Badge variant="outline" className={cn("border-white/10", priorityLane(detail.priority))}>
                  {detail.priority}
                </Badge>
              ) : null}
            </SheetTitle>
            {detail ? (
              <SheetDescription className="text-slate-400">
                {detail.category} · {detail.city}, {detail.country}
              </SheetDescription>
            ) : null}
          </SheetHeader>

          {detail ? (
            <ScrollArea className="mt-4 h-[calc(100vh-7.5rem)] pr-4">
              <div className="space-y-4 pb-6">
                <div className="glass rounded-2xl p-4 border-white/10">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Insight Summary</div>
                      <div className="mt-1 text-sm text-slate-200">{detail.summary}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Confidence</div>
                      <div className="mt-1 text-2xl font-bold text-cyan-200">{formatConfidence(detail.confidence_score)}</div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Revenue impact</div>
                      <div className="mt-1 text-sm font-semibold neon-text">{formatRevenue(detail.revenue_impact, detail.country, detailCurrencySymbol)}</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Risk</div>
                      <div className={cn("mt-1 text-sm font-semibold", detail.risk_level === "Low" ? "text-emerald-300" : detail.risk_level === "Medium" ? "text-yellow-200" : "text-red-300")}>
                        {detail.risk_level}
                      </div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">Status</div>
                      <div className="mt-1">
                        <Badge variant="outline" className={cn("border-white/10", badgeStatusTone(detail.status))}>
                          {detail.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={cn("glass rounded-2xl p-4 border-white/10", riskGlow(detail.risk_level))}>
                  <div className="text-sm font-semibold">Risk explanation</div>
                  <div className="mt-2 text-sm text-slate-300">{detail.risk_if_ignored}</div>
                  <div className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">Why it matters</div>
                  <div className="mt-1 text-sm text-slate-200">{detail.why_it_matters}</div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="glass rounded-2xl p-4 border-white/10">
                    <div className="text-sm font-semibold">Supporting data</div>
                    <div className="mt-3 space-y-2">
                      {detail.supporting_data.map((s, idx) => (
                        <div key={idx} className="text-sm text-slate-300">
                          • {s}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass rounded-2xl p-4 border-white/10">
                    <div className="text-sm font-semibold">AI recommendation</div>
                    <div className="mt-3 text-sm neon-text font-semibold">{detail.recommended_action}</div>
                    <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Suggested next steps</div>
                    <div className="mt-2 text-sm text-slate-300">{detail.recommended_action}</div>
                    <div className="mt-3 text-xs uppercase tracking-widest text-muted-foreground">Timeline</div>
                    <div className="mt-1 text-sm text-slate-200">Within 4–48 hours (mock SLA)</div>
                  </div>
                </div>

                <div className="glass rounded-2xl p-4 border-white/10">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="text-sm font-semibold">Action Center</div>
                      <div className="text-xs text-muted-foreground">Create follow-ups, assign broker, resolve, ignore</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRelatedOpen(true);
                          setRelatedTableMode("leads");
                        }}
                      >
                        View Related Data
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Button
                      className="neon-border"
                      onClick={() => {
                        setFollowUpOpen(true);
                      }}
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Create Follow-up
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAssignBrokerOpen(true);
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Broker
                    </Button>
                    <Button variant="outline" onClick={() => void handleStatusUpdate("Resolved")}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Mark Resolved
                    </Button>
                    <Button variant="outline" onClick={() => void handleStatusUpdate("Ignored")}>
                      <TrendingDown className="mr-2 h-4 w-4" />
                      Ignore
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button variant="outline" onClick={() => handleShare("whatsapp")}>
                      <Share2 className="mr-2 h-4 w-4" />
                      WhatsApp
                    </Button>
                    <Button variant="outline" onClick={() => handleShare("email")}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email
                    </Button>
                    <Button variant="outline" onClick={() => handleShare("copy")}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          ) : (
            <div className="text-slate-300">Loading insight…</div>
          )}
        </SheetContent>
      </Sheet>

      {/* Related Data Modal */}
      <Dialog open={relatedOpen} onOpenChange={(o) => !o && setRelatedOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-4xl">
          <DialogHeader>
            <DialogTitle>View Related Data</DialogTitle>
            <DialogDescription className="text-slate-400">
              Leads / Properties / Brokers linked to this insight (mock).
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant={relatedTableMode === "leads" ? "default" : "outline"} onClick={() => setRelatedTableMode("leads")}>
                  Leads
                </Button>
                <Button size="sm" variant={relatedTableMode === "properties" ? "default" : "outline"} onClick={() => setRelatedTableMode("properties")}>
                  Properties
                </Button>
                <Button size="sm" variant={relatedTableMode === "brokers" ? "default" : "outline"} onClick={() => setRelatedTableMode("brokers")}>
                  Brokers
                </Button>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Risk</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(
                      relatedTableMode === "leads"
                        ? detail.related_leads
                        : relatedTableMode === "properties"
                          ? detail.related_properties
                          : detail.related_brokers
                    ).map((rid) => (
                      <TableRow key={rid}>
                        <TableCell className="font-medium">{rid}</TableCell>
                        <TableCell className="text-slate-200">{relatedTableMode.slice(0, -1)}</TableCell>
                        <TableCell>{formatConfidence(detail.confidence_score)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("border-white/10", riskGlow(detail.risk_level))}>
                            {detail.risk_level}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Follow-up modal */}
      <Dialog open={followUpOpen} onOpenChange={(o) => !o && setFollowUpOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Follow-up</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create a broker task from this insight (mock backend).
            </DialogDescription>
          </DialogHeader>

          {detail ? (
            <div className="space-y-3">
              <div className="glass rounded-xl border-white/10 p-3">
                <div className="text-sm font-semibold">{detail.title}</div>
                <div className="text-xs text-muted-foreground mt-1">Status: In Progress</div>
              </div>

              {followUpError ? <div className="text-red-300 text-sm">{followUpError}</div> : null}

              <Button
                className="w-full neon-border"
                disabled={followUpStatus === "creating"}
                onClick={() => void handleCreateFollowUp()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {followUpStatus === "creating" ? "Creating…" : "Create Follow-up"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Assign broker modal */}
      <Dialog open={assignBrokerOpen} onOpenChange={(o) => !o && setAssignBrokerOpen(false)}>
        <DialogContent className="glass-strong border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Broker</DialogTitle>
            <DialogDescription className="text-slate-400">
              Choose a broker to attach to this insight (mock backend).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Broker</div>
            <Select value={assignBrokerId} onValueChange={(v) => setAssignBrokerId(v)}>
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Select broker" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="broker-1">Broker Rahul (mock)</SelectItem>
                <SelectItem value="broker-2">Aman Singh (mock)</SelectItem>
                <SelectItem value="broker-3">Layla Hassan (mock)</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full neon-border" onClick={() => void handleAssignBroker()} disabled={!assignBrokerId}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Broker
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

