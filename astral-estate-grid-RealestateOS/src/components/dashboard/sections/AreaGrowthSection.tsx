import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  Bookmark,
  CheckCircle2,
  Copy,
  Eye,
  Filter,
  FilterX,
  GitCompareArrows,
  Mail,
  MapPinned,
  RefreshCw,
  Share2,
  Star,
  Target,
  Trash2,
  TriangleAlert,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlowCard, Mini, SectionHeader } from "../utils";
import {
  AREA_GROWTH_SOURCES,
  SEED_AREA_GROWTH,
  type AreaGrowthFilters,
  type AreaGrowthRecord,
  type AreaGrowthSource,
} from "@/lib/area-growth-model";
import {
  createAreaGrowthRecord,
  deleteAreaGrowthRecord,
  fetchAreaGrowthData,
  subscribeToAreaGrowthUpdates,
  updateAreaGrowthRecord,
} from "@/lib/area-growth-api";

const GOAL_OPTIONS = ["All", "Rental Income", "Capital Appreciation", "Luxury Investment", "Commercial Yield", "Safe Long-Term Hold"] as const;
const RISK_OPTIONS = ["All", "Low", "Medium", "High"] as const;
const STAGE_OPTIONS = ["All", "Early Growth", "Emerging Hotspot", "Strong Growth", "Mature Market", "Watchlist"] as const;
const CONFIDENCE_OPTIONS = ["All", "70+", "80+", "90+"] as const;
const COUNTRY_OPTIONS = ["All", ...Array.from(new Set(SEED_AREA_GROWTH.map((a) => a.country))).sort()] as const;

const FALLBACK_LINK = (id: string) => `https://realestateos.local/area-growth/${id}`;

function riskTone(score: number) {
  if (score <= 40) return "Low";
  if (score <= 65) return "Medium";
  return "High";
}

function scoreGrade(score: number) {
  if (score >= 90) return "Elite";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Good";
  return "Watchlist";
}

function fmtPercent(n: number) {
  return `${n}%`;
}

function shareText(area: AreaGrowthRecord) {
  return [
    `${area.areaName} (${area.city}, ${area.country})`,
    `Investment score: ${area.investmentScore}/100`,
    `Growth stage: ${area.growthStage}`,
    `Best goal: ${area.bestInvestmentGoal}`,
    `Why growing: ${area.whyThisAreaIsGrowing}`,
    FALLBACK_LINK(area.id),
  ].join(" • ");
}

function cloneRecords(records: AreaGrowthRecord[]) {
  return records.map((record) => ({
    ...record,
    dataSources: [...record.dataSources],
    aiRecommendation: { ...record.aiRecommendation, risks: [...record.aiRecommendation.risks] },
  }));
}

function defaultFilters(): AreaGrowthFilters {
  return {
    country: "All",
    city: "",
    investmentGoal: "All",
    riskLevel: "All",
    confidenceScore: "All",
    growthStage: "All",
  };
}

function formatFilterScore(value: string) {
  return value === "All" ? value : value;
}

function filterText(value: string) {
  return value.trim().toLowerCase();
}

function scoreBarLabel(label: string, value: number, accent?: boolean) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{label}</span>
        <span className={cn("tabular-nums", accent && "text-cyan-100")}>{value}</span>
      </div>
      <Progress value={value} className="h-1.5 bg-white/10" />
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-slate-400">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="border-white/10 bg-black/40 text-white">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function InvestorSection() {
  const { pushActivity } = useDashboard();
  const [records, setRecords] = useState<AreaGrowthRecord[]>(() => cloneRecords(SEED_AREA_GROWTH));
  const [draftFilters, setDraftFilters] = useState<AreaGrowthFilters>(() => defaultFilters());
  const [appliedFilters, setAppliedFilters] = useState<AreaGrowthFilters>(() => defaultFilters());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [shareId, setShareId] = useState<string | null>(null);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAreaGrowthData().then((data) => {
      if (cancelled) return;
      setRecords(data.length ? data : cloneRecords(SEED_AREA_GROWTH));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAreaGrowthUpdates((next) => {
      if (!next.length) return;
      setRecords(next);
    });
    return unsubscribe;
  }, []);

  const countries = useMemo(() => ["All", ...Array.from(new Set(records.map((r) => r.country))).sort()], [records]);
  const cities = useMemo(() => {
    const selectedCountry = draftFilters.country;
    return [
      "All",
      ...Array.from(
        new Set(
          records
            .filter((r) => selectedCountry === "All" || r.country === selectedCountry)
            .map((r) => r.city),
        ),
      ).sort(),
    ];
  }, [draftFilters.country, records]);

  const filtered = useMemo(() => {
    return records.filter((record) => {
      if (appliedFilters.country !== "All" && record.country !== appliedFilters.country) return false;
      if (appliedFilters.city && !filterText(`${record.city} ${record.areaName}`).includes(filterText(appliedFilters.city))) return false;
      if (appliedFilters.investmentGoal !== "All" && record.bestInvestmentGoal !== appliedFilters.investmentGoal) return false;
      if (appliedFilters.riskLevel !== "All" && riskTone(record.riskScore) !== appliedFilters.riskLevel) return false;
      if (appliedFilters.growthStage !== "All" && record.growthStage !== appliedFilters.growthStage) return false;
      if (appliedFilters.confidenceScore !== "All") {
        const min = Number(appliedFilters.confidenceScore.replace("+", ""));
        if (record.confidenceScore < min) return false;
      }
      return true;
    });
  }, [appliedFilters, records]);

  const selected = useMemo(() => {
    if (!activeId) return null;
    return filtered.find((r) => r.id === activeId) ?? null;
  }, [activeId, filtered]);
  const compareRows = useMemo(() => records.filter((r) => compareIds.includes(r.id)), [compareIds, records]);
  const summary = useMemo(() => {
    const avg = Math.round(records.reduce((sum, item) => sum + item.investmentScore, 0) / Math.max(records.length, 1));
    const watchlist = records.filter((item) => item.watchlisted).length;
    const reviewed = records.filter((item) => item.reviewed).length;
    const topTier = records.filter((item) => item.investmentScore >= 85).length;
    return { avg, watchlist, reviewed, topTier, total: records.length };
  }, [records]);

  // No auto-open behavior: report drawer should open only via explicit button clicks.

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id]));
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(draftFilters);
    pushActivity("Area growth filters applied", "filter", "investor");
    toast.success("Filters applied");
  }, [draftFilters, pushActivity]);

  const clearFilters = useCallback(() => {
    const next = defaultFilters();
    setDraftFilters(next);
    setAppliedFilters(next);
    pushActivity("Area growth filters cleared", "filter-x", "investor");
    toast("Filters cleared");
  }, [pushActivity]);

  const openDetails = useCallback(
    (record: AreaGrowthRecord) => {
      setActiveId(record.id);
      setReportOpen(true);
      pushActivity(`Viewed area growth report: ${record.areaName}`, "eye", "investor");
    },
    [pushActivity],
  );

  const openShare = useCallback((record: AreaGrowthRecord) => {
    setShareId(record.id);
  }, []);

  const markReviewed = useCallback(
    async (record: AreaGrowthRecord) => {
      const next = { ...record, reviewed: !record.reviewed, lastUpdated: Date.now() };
      setRecords((prev) => prev.map((item) => (item.id === record.id ? next : item)));
      await updateAreaGrowthRecord(record.id, { reviewed: next.reviewed, lastUpdated: next.lastUpdated });
      pushActivity(`${next.reviewed ? "Reviewed" : "Unreviewed"} area growth: ${record.areaName}`, "check-circle-2", "investor");
      toast.success(next.reviewed ? "Marked reviewed" : "Review removed");
    },
    [pushActivity],
  );

  const toggleWatchlist = useCallback(
    async (record: AreaGrowthRecord) => {
      const next = { ...record, watchlisted: !record.watchlisted, lastUpdated: Date.now() };
      setRecords((prev) => prev.map((item) => (item.id === record.id ? next : item)));
      await updateAreaGrowthRecord(record.id, { watchlisted: next.watchlisted, lastUpdated: next.lastUpdated });
      pushActivity(`${next.watchlisted ? "Added to" : "Removed from"} watchlist: ${record.areaName}`, "star", "investor");
      toast.success(next.watchlisted ? "Added to watchlist" : "Removed from watchlist");
    },
    [pushActivity],
  );

  const handleCopyLink = useCallback(async (record: AreaGrowthRecord) => {
    const link = typeof window === "undefined" ? FALLBACK_LINK(record.id) : `${window.location.origin}/area-growth/${record.id}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(link);
    }
    pushActivity(`Copied area report link: ${record.areaName}`, "copy", "investor");
    toast.success("Link copied");
  }, [pushActivity]);

  const handleChannelShare = useCallback(
    async (record: AreaGrowthRecord, channel: "whatsapp" | "email" | "copy") => {
      const link = typeof window === "undefined" ? FALLBACK_LINK(record.id) : `${window.location.origin}/area-growth/${record.id}`;
      const summary = shareText(record);
      if (channel === "copy") {
        await handleCopyLink(record);
        return;
      }
      if (channel === "whatsapp" && typeof window !== "undefined") {
        window.open(`https://wa.me/?text=${encodeURIComponent(summary)}`, "_blank", "noopener,noreferrer");
      }
      if (channel === "email" && typeof window !== "undefined") {
        window.location.href = `mailto:?subject=${encodeURIComponent(`${record.areaName} area growth report`)}&body=${encodeURIComponent(summary)}`;
      }
      void updateAreaGrowthRecord(record.id, { lastUpdated: Date.now() });
      pushActivity(`Shared area growth report: ${record.areaName}`, "share-2", "investor");
      toast.success(channel === "email" ? "Email draft opened" : "Share opened");
      void link;
    },
    [handleCopyLink, pushActivity],
  );

  const compareMatrix = useMemo(() => {
    const keys = ["investmentScore", "rentalDemandScore", "appreciationScore", "liquidityScore", "infrastructureScore", "investorActivityScore", "searchInterestScore", "riskScore", "confidenceScore"] as const;
    const maxes = Object.fromEntries(keys.map((key) => [key, Math.max(...compareRows.map((row) => row[key]), 0)])) as Record<(typeof keys)[number], number>;
    return { keys, maxes };
  }, [compareRows]);

  const shareRecord = shareId ? records.find((item) => item.id === shareId) ?? null : null;
  const detailRecord = selected ?? null;

  return (
    <>
      <div className="space-y-6">
        <SectionHeader
          title="Investor Intelligence & Area Growth"
          subtitle="Supabase-ready area reports, realtime placeholders, and action-ready broker insights."
        >
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={applyFilters}>
              <Filter className="mr-2 h-4 w-4" />
              Apply Filters
            </Button>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <FilterX className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCompareOpen(true)}>
              <GitCompareArrows className="mr-2 h-4 w-4" />
              Compare ({compareIds.length})
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSourceOpen(true)}>
              <MapPinned className="mr-2 h-4 w-4" />
              View Source Data
            </Button>
          </div>
        </SectionHeader>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Areas tracked</div>
            <div className="mt-1 text-2xl font-bold neon-text">{summary.total}</div>
          </GlowCard>
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg score</div>
            <div className="mt-1 text-2xl font-bold">{summary.avg}</div>
          </GlowCard>
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Reviewed</div>
            <div className="mt-1 text-2xl font-bold text-emerald-300">{summary.reviewed}</div>
          </GlowCard>
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Watchlist</div>
            <div className="mt-1 text-2xl font-bold text-cyan-200">{summary.watchlist}</div>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-primary" />
              Filters
            </div>
            <Badge variant="outline" className="text-[10px]">
              {filtered.length} areas match
            </Badge>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <FilterSelect label="Country" value={draftFilters.country} onChange={(value) => setDraftFilters((prev) => ({ ...prev, country: value, city: "All" }))} options={COUNTRY_OPTIONS} />
            <FilterSelect label="City" value={draftFilters.city} onChange={(value) => setDraftFilters((prev) => ({ ...prev, city: value }))} options={cities} />
            <FilterSelect label="Investment Goal" value={draftFilters.investmentGoal} onChange={(value) => setDraftFilters((prev) => ({ ...prev, investmentGoal: value }))} options={GOAL_OPTIONS} />
            <FilterSelect label="Risk Level" value={draftFilters.riskLevel} onChange={(value) => setDraftFilters((prev) => ({ ...prev, riskLevel: value }))} options={RISK_OPTIONS} />
            <FilterSelect label="Confidence Score" value={draftFilters.confidenceScore} onChange={(value) => setDraftFilters((prev) => ({ ...prev, confidenceScore: value }))} options={CONFIDENCE_OPTIONS} />
            <FilterSelect label="Growth Stage" value={draftFilters.growthStage} onChange={(value) => setDraftFilters((prev) => ({ ...prev, growthStage: value }))} options={STAGE_OPTIONS} />
          </div>
        </GlowCard>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((record) => (
            <GlowCard key={record.id} className="flex h-full flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-white">{record.areaName}</div>
                  <div className="text-xs text-muted-foreground">
                    {record.city} · {record.country}
                  </div>
                </div>
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-100">
                  {record.investmentScore}
                </Badge>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{record.growthStage}</Badge>
                <Badge variant="outline" className={cn(record.riskScore <= 40 ? "text-emerald-300" : record.riskScore <= 65 ? "text-yellow-200" : "text-red-300")}>
                  Risk {riskTone(record.riskScore)}
                </Badge>
                <Badge variant="outline" className="text-slate-200">
                  Confidence {record.confidenceScore}%
                </Badge>
                {record.reviewed ? <Badge className="bg-emerald-500/15 text-emerald-100">Reviewed</Badge> : null}
                {record.watchlisted ? <Badge className="bg-cyan-500/15 text-cyan-100">Watchlisted</Badge> : null}
              </div>

              <p className="text-sm leading-6 text-slate-300">{record.whyThisAreaIsGrowing}</p>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Best goal</div>
                  <div className="mt-1 text-slate-100">{record.bestInvestmentGoal}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Best type</div>
                  <div className="mt-1 text-slate-100">{record.bestPropertyType}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Hold period</div>
                  <div className="mt-1 text-slate-100">{record.suggestedHoldingPeriod}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Rental demand</div>
                  <div className="mt-1 text-slate-100">{record.rentalDemandScore}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Data sources</div>
                  <div className="mt-1 text-slate-100">{record.dataSources.length}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Appreciation score</div>
                  <div className="mt-1 text-slate-100">{record.appreciationScore}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Last updated</div>
                  <div className="mt-1 text-slate-100">{new Date(record.lastUpdated).toLocaleTimeString()}</div>
                </div>
              </div>

              <div className="mt-auto flex flex-wrap gap-2 pt-2">
                <Button size="sm" className="neon-border" onClick={() => openDetails(record)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Report
                </Button>
                <Button size="sm" variant="outline" onClick={() => openShare(record)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share
                </Button>
                <Button size="sm" variant={compareIds.includes(record.id) ? "secondary" : "outline"} onClick={() => toggleCompare(record.id)}>
                  <GitCompareArrows className="mr-2 h-4 w-4" />
                  {compareIds.includes(record.id) ? "In Compare" : "Compare"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void markReviewed(record)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {record.reviewed ? "Reviewed" : "Mark Reviewed"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => void toggleWatchlist(record)}>
                  <Star className="mr-2 h-4 w-4" />
                  {record.watchlisted ? "Watchlisted" : "Add to Watchlist"}
                </Button>
              </div>
            </GlowCard>
          ))}
        </div>

        <GlowCard>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold">Compare selected areas</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => (compareIds.length >= 2 ? setCompareOpen(true) : toast.error("Select at least two areas"))}>
                Compare
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setCompareIds([])}>
                Clear
              </Button>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Select up to 4 areas using the card compare button, then open the compare table.</p>
        </GlowCard>
      </div>

      <Sheet
        open={reportOpen && Boolean(detailRecord)}
        onOpenChange={(open) => {
          if (!open) {
            setReportOpen(false);
            setActiveId(null);
          }
        }}
      >
        <SheetContent className="max-sm:w-[100vw] max-sm:max-w-none max-sm:h-[100dvh] max-sm:rounded-none sm:max-w-2xl border-white/10 bg-slate-950 text-white">
          {detailRecord ? (
            <>
              <SheetHeader className="pr-10">
                <SheetTitle>{detailRecord.areaName} Area Growth Report</SheetTitle>
                <SheetDescription className="text-slate-400">
                  {detailRecord.city}, {detailRecord.country}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="mt-4 h-[calc(100vh-8rem)] pr-4">
                <div className="space-y-4 pb-6">
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">Investment score</div>
                      <div className="mt-1 text-xl font-semibold">{detailRecord.investmentScore}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">Growth stage</div>
                      <div className="mt-1 text-sm">{detailRecord.growthStage}</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">Confidence</div>
                      <div className="mt-1 text-sm">{detailRecord.confidenceScore}%</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-slate-500">Risk</div>
                      <div className="mt-1 text-sm">{riskTone(detailRecord.riskScore)}</div>
                    </div>
                  </div>

                  <Card className="border-white/10 bg-white/5">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {scoreBarLabel("Rental Demand", detailRecord.rentalDemandScore)}
                      {scoreBarLabel("Appreciation", detailRecord.appreciationScore)}
                      {scoreBarLabel("Liquidity", detailRecord.liquidityScore)}
                      {scoreBarLabel("Infrastructure", detailRecord.infrastructureScore)}
                      {scoreBarLabel("Investor Activity", detailRecord.investorActivityScore)}
                      {scoreBarLabel("Search Interest", detailRecord.searchInterestScore)}
                      {scoreBarLabel("Risk", detailRecord.riskScore, true)}
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="border-white/10 bg-white/5">
                      <CardHeader>
                        <CardTitle className="text-base text-white">Area overview</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="font-semibold text-white">
                          {detailRecord.areaName} · {detailRecord.city}, {detailRecord.country}
                        </div>
                        <div>Growth stage: {detailRecord.growthStage}</div>
                        <div>Best investment goal: {detailRecord.bestInvestmentGoal}</div>
                        <div>Best property type: {detailRecord.bestPropertyType}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5">
                      <CardHeader>
                        <CardTitle className="text-base text-white">Demand & investor activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>Rental demand score: {detailRecord.rentalDemandScore}</div>
                        <div>Investor activity score: {detailRecord.investorActivityScore}</div>
                        <div>Search interest score: {detailRecord.searchInterestScore}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5">
                      <CardHeader>
                        <CardTitle className="text-base text-white">Infrastructure growth</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>Infrastructure score: {detailRecord.infrastructureScore}</div>
                        <div className="text-slate-300">{detailRecord.whyThisAreaIsGrowing}</div>
                      </CardContent>
                    </Card>

                    <Card className="border-white/10 bg-white/5">
                      <CardHeader>
                        <CardTitle className="text-base text-white">Risk explanation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>Risk level: {riskTone(detailRecord.riskScore)}</div>
                        <ul className="list-disc pl-4 text-slate-300">
                          {detailRecord.aiRecommendation.risks.map((risk) => (
                            <li key={risk}>{risk}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-white/10 bg-white/5">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Why this area is growing</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm leading-6 text-slate-300">
                      {detailRecord.whyThisAreaIsGrowing}
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5">
                    <CardHeader>
                      <CardTitle className="text-base text-white">AI Recommendation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500">Summary</div>
                        <p className="mt-1 text-slate-200">{detailRecord.aiRecommendation.summary}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-500">Best buyer profile</div>
                          <div className="mt-1">{detailRecord.aiRecommendation.bestBuyerProfile}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-500">Suggested property type</div>
                          <div className="mt-1">{detailRecord.aiRecommendation.suggestedPropertyType}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-500">Suggested holding period</div>
                          <div className="mt-1">{detailRecord.aiRecommendation.suggestedHoldingPeriod}</div>
                        </div>
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-slate-500">Best investment goal</div>
                          <div className="mt-1">{detailRecord.bestInvestmentGoal}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500">Action plan for broker</div>
                        <p className="mt-1 text-slate-200">{detailRecord.aiRecommendation.actionPlan}</p>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-slate-500">Risk warnings</div>
                        <ul className="mt-1 list-disc pl-4 text-slate-300">
                          {detailRecord.aiRecommendation.risks.map((risk) => (
                            <li key={risk}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-white/10 bg-white/5">
                    <CardHeader>
                      <CardTitle className="text-base text-white">Data source status</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-2">
                      <div className="w-full text-xs text-slate-400">
                        Signals available: {detailRecord.dataSources.length}
                      </div>
                      {detailRecord.dataSources.map((source) => (
                        <Badge key={source} variant="outline" className="border-white/15 text-slate-200">
                          {source}
                        </Badge>
                      ))}
                    </CardContent>
                  </Card>

                  <div className="grid gap-3 md:grid-cols-2">
                    <Card className="border-white/10 bg-white/5">
                      <CardHeader>
                        <CardTitle className="text-base text-white">Property profile</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div>Best property type: {detailRecord.bestPropertyType}</div>
                        <div>Suggested holding period: {detailRecord.suggestedHoldingPeriod}</div>
                        <div>Confidence score: {detailRecord.confidenceScore}%</div>
                        <div>Last updated: {new Date(detailRecord.lastUpdated).toLocaleString()}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-white/10 bg-white/5">
                      <CardHeader>
                        <CardTitle className="text-base text-white">Broker actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <Button className="w-full" onClick={() => setShareId(detailRecord.id)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          Share Report
                        </Button>
                        <Button className="w-full" variant="outline" onClick={() => void markReviewed(detailRecord)}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Mark Reviewed
                        </Button>
                        <Button className="w-full" variant="outline" onClick={() => void toggleWatchlist(detailRecord)}>
                          <Bookmark className="mr-2 h-4 w-4" />
                          Add to Watchlist
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(shareRecord)} onOpenChange={(open) => !open && setShareId(null)}>
        <DialogContent className="max-sm:w-[100vw] max-sm:max-w-none max-sm:rounded-none border-white/10 bg-slate-950 text-white sm:max-w-2xl">
          {shareRecord ? (
            <>
              <DialogHeader>
                <DialogTitle>Share Area Growth Report</DialogTitle>
                <DialogDescription className="text-slate-400">
                  {shareRecord.areaName} · {shareRecord.city}, {shareRecord.country}
                </DialogDescription>
              </DialogHeader>
              <Card className="border-white/10 bg-white/5">
                <CardContent className="space-y-2 p-4">
                  <div className="text-lg font-semibold">{shareRecord.areaName}</div>
                  <div className="text-sm text-slate-400">
                    Investment score {shareRecord.investmentScore} · {shareRecord.growthStage} · Confidence {shareRecord.confidenceScore}%
                  </div>
                  <div className="text-xs text-slate-500">{shareText(shareRecord)}</div>
                </CardContent>
              </Card>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button onClick={() => void handleChannelShare(shareRecord, "whatsapp")}>WhatsApp</Button>
                <Button variant="outline" onClick={() => void handleChannelShare(shareRecord, "email")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button variant="outline" onClick={() => void handleCopyLink(shareRecord)}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Link
                </Button>
                <Button variant="outline" onClick={() => toast.info("Report download coming soon")}>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={sourceOpen} onOpenChange={setSourceOpen}>
        <DialogContent className="max-sm:w-[100vw] max-sm:max-w-none max-sm:rounded-none border-white/10 bg-slate-950 text-white sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Source Data</DialogTitle>
            <DialogDescription className="text-slate-400">Backend-ready source rows for the area growth engine.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {AREA_GROWTH_SOURCES.map((source: AreaGrowthSource) => (
                  <TableRow key={source.label}>
                    <TableCell className="font-medium">{source.label}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{source.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-slate-300">{source.detail}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-sm:w-[100vw] max-sm:max-w-none max-sm:rounded-none border-white/10 bg-slate-950 text-white sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Compare Areas</DialogTitle>
            <DialogDescription className="text-slate-400">Best values are highlighted for quick broker review.</DialogDescription>
          </DialogHeader>
          {compareRows.length < 2 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
              Select at least two areas using the Compare button on the cards.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Area</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Rental</TableHead>
                    <TableHead>Appr.</TableHead>
                    <TableHead>Liquidity</TableHead>
                    <TableHead>Investor</TableHead>
                    <TableHead>Search</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Best goal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.areaName}</TableCell>
                      <TableCell className={cn(row.investmentScore === compareMatrix.maxes.investmentScore && "text-emerald-300 font-semibold")}>{row.investmentScore}</TableCell>
                      <TableCell className={cn(row.rentalDemandScore === compareMatrix.maxes.rentalDemandScore && "text-emerald-300 font-semibold")}>{row.rentalDemandScore}</TableCell>
                      <TableCell className={cn(row.appreciationScore === compareMatrix.maxes.appreciationScore && "text-emerald-300 font-semibold")}>{row.appreciationScore}</TableCell>
                      <TableCell className={cn(row.liquidityScore === compareMatrix.maxes.liquidityScore && "text-emerald-300 font-semibold")}>{row.liquidityScore}</TableCell>
                      <TableCell className={cn(row.investorActivityScore === compareMatrix.maxes.investorActivityScore && "text-emerald-300 font-semibold")}>{row.investorActivityScore}</TableCell>
                      <TableCell className={cn(row.searchInterestScore === compareMatrix.maxes.searchInterestScore && "text-emerald-300 font-semibold")}>{row.searchInterestScore}</TableCell>
                      <TableCell className={cn(row.riskScore === compareMatrix.maxes.riskScore && "text-red-300 font-semibold")}>{row.riskScore}</TableCell>
                      <TableCell>{row.bestInvestmentGoal}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

