import { useCallback, useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import {
  DATA_SOURCE_ROWS,
  SEED_AREAS,
  jitterMetric,
  nowIso,
  opportunityGradeFromScore,
  type AreaIntelligence,
  type MarketUpdateItem,
} from "@/lib/investor-area-intelligence-model";
import { fetchAreaIntelligence, subscribeToAreaUpdates } from "@/lib/investor-area-intelligence-api";
import { GlowCard, Mini, SectionHeader } from "../utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  GitCompareArrows,
  HelpCircle,
  LineChart,
  Minus,
  Radar,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const INVESTMENT_GOALS = ["All", "Rental Income", "Capital Appreciation", "Luxury Investment", "Commercial Yield", "Safe Long-Term Hold"] as const;
const RISK_APPETITE = ["All", "Low", "Medium", "High"] as const;
const HOLDING = ["All", "1 Year", "3 Years", "5 Years", "10 Years"] as const;
const BUDGETS = ["All", "Under $500K", "$500K – $1M", "$1M – $3M", "$3M+"] as const;
const CONF = ["All", "70", "80", "90"] as const;

function nextSyncMs() {
  return 10_000 + Math.floor(Math.random() * 10_000);
}

function trendIcon(t: "up" | "down" | "flat") {
  if (t === "up") return <ArrowUpRight className="h-3.5 w-3.5 text-[oklch(0.82_0.2_150)]" />;
  if (t === "down") return <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function gradeBadgeClass(grade: string) {
  if (grade.startsWith("Elite")) return "border-[oklch(0.82_0.2_150_/_0.55)] text-[oklch(0.82_0.2_150)] bg-[oklch(0.82_0.2_150_/_0.1)]";
  if (grade.startsWith("Strong")) return "border-[oklch(0.72_0.18_240_/_0.5)] text-[oklch(0.78_0.16_240)] bg-[oklch(0.72_0.18_240_/_0.08)]";
  if (grade.startsWith("Good")) return "border-primary/40 text-primary bg-primary/5";
  if (grade.startsWith("Watch")) return "border-[oklch(0.78_0.2_50_/_0.45)] text-[oklch(0.88_0.18_60)] bg-[oklch(0.78_0.2_50_/_0.08)]";
  return "border-destructive/40 text-destructive bg-destructive/5";
}

function riskTone(level: string) {
  if (level === "Low") return "text-[oklch(0.82_0.2_150)]";
  if (level === "Medium") return "text-[oklch(0.88_0.18_60)]";
  return "text-destructive";
}

function deepCloneAreas(areas: AreaIntelligence[]): AreaIntelligence[] {
  return JSON.parse(JSON.stringify(areas)) as AreaIntelligence[];
}

function applyRealtimeJitter(areas: AreaIntelligence[]): AreaIntelligence[] {
  return areas.map((a) => {
    const rentalDemand = jitterMetric(a.rentalDemand, 2.2);
    const appreciation = jitterMetric(a.appreciation, 1.8);
    const liquidity = jitterMetric(a.liquidity, 1.6);
    const investorActivity = jitterMetric(a.investorActivity, 2.0);
    const searchInterest = jitterMetric(a.searchInterest, 2.4);
    const riskScore = jitterMetric(a.riskScore, 1.4);
    const base =
      (rentalDemand + appreciation + liquidity + investorActivity + searchInterest) / 5 - riskScore * 0.22;
    const finalScore = Math.min(100, Math.max(40, Math.round(base)));
    const confidence = jitterMetric(a.confidence, 1.2);
    const ts = nowIso();
    return {
      ...a,
      rentalDemand,
      appreciation,
      liquidity,
      investorActivity,
      searchInterest,
      riskScore,
      finalScore,
      opportunityGrade: opportunityGradeFromScore(finalScore),
      confidence,
      lastUpdatedIso: ts,
      scoreComponents: a.scoreComponents.map((c) => ({
        ...c,
        score:
          c.id === "risk"
            ? jitterMetric(c.score, 1.2)
            : jitterMetric(c.score, 1.8),
        lastUpdated: ts,
      })),
    };
  });
}

function randomUpdate(areas: AreaIntelligence[]): MarketUpdateItem {
  const a = areas[Math.floor(Math.random() * areas.length)]!;
  const templates: Omit<MarketUpdateItem, "id" | "areaName" | "tsIso">[] = [
    {
      headline: `${a.name} rental demand shifted`,
      whyItMatters: "Rental strength supports income underwriting and renewal pricing power.",
      confidence: jitterMetric(a.confidence, 4),
      metricHint: "Rental Demand",
      scoreAffected: "Rental Demand Score",
      recommendedAction: "Refresh investor deck rent comps for this micro-market.",
    },
    {
      headline: `${a.name} investor activity ticked`,
      whyItMatters: "More investor inquiries usually precede liquidity and price discovery.",
      confidence: jitterMetric(a.confidence, 5),
      metricHint: "Investor Activity",
      scoreAffected: "Investor Activity Score",
      recommendedAction: "Prioritize verified investor leads with matching budget band.",
    },
    {
      headline: `${a.name} search-interest proxy moved`,
      whyItMatters: "API-ready external signal — early indicator of inbound demand (mock).",
      confidence: jitterMetric(a.confidence, 6),
      metricHint: "Search Interest",
      scoreAffected: "Search Interest Score",
      recommendedAction: "Discuss sensitivity: mock signal, not live Google Trends.",
    },
    {
      headline: `${a.name} liquidity depth adjusted`,
      whyItMatters: "Liquidity impacts exit planning and offer strategy for sellers.",
      confidence: jitterMetric(a.confidence, 3),
      metricHint: "Liquidity",
      scoreAffected: "Liquidity Score",
      recommendedAction: "Re-run offer scenarios with updated liquidity assumption.",
    },
    {
      headline: `${a.riskLevel} risk overlay updated`,
      whyItMatters: "Risk feeds into hold period and leverage guidance for clients.",
      confidence: jitterMetric(a.confidence, 4),
      metricHint: "Risk",
      scoreAffected: "Risk Score",
      recommendedAction: "Add diligence checklist items for premium execution risk.",
    },
  ];
  const pick = templates[Math.floor(Math.random() * templates.length)]!;
  return {
    id: `upd_${Date.now().toString(36)}`,
    areaName: a.name,
    tsIso: nowIso(),
    ...pick,
  };
}

const MOCK_EXTERNAL_SIGNALS = [
  { label: "Search interest change", text: "Mock external signal: prime apartment search queries +28% over 30d (API-ready)." },
  { label: "Nearby business activity", text: "API-ready signal: F&B & services footfall proxy up (mock series)." },
  { label: "Infrastructure activity", text: "Mock feed: 2 major corridor projects in late procurement (not govt live API)." },
  { label: "Popularity trend", text: "Mock popularity index rising — treat as directional only." },
  { label: "Lifestyle demand", text: "Mock composite: schools/parks/lifestyle queries joint momentum." },
  { label: "Commute / connectivity", text: "API-ready mobility score improving on key nodes (mock)." },
  { label: "Landmark adjacency", text: "Mock landmark growth index — luxury adjacency demand." },
  { label: "Review / sentiment", text: "Mock sentiment trend from public reviews (not connected)." },
];

export function InvestorSection() {
  const { pushActivity } = useDashboard();
  const [areas, setAreas] = useState<AreaIntelligence[]>(() => deepCloneAreas(SEED_AREAS));
  const [updates, setUpdates] = useState<MarketUpdateItem[]>(() => [
    {
      id: "u0",
      areaName: "Dubai Marina",
      headline: "Dubai Marina rental demand increased",
      whyItMatters: "Supports higher rent assumptions and investor yield confidence.",
      confidence: 86,
      tsIso: nowIso(),
      metricHint: "Rental Demand",
      scoreAffected: "Rental Demand Score",
      recommendedAction: "Highlight Marina inventory to income-focused investors this week.",
    },
    {
      id: "u1",
      areaName: "Noida Sector 150",
      headline: "Noida Sector 150 investor activity rising",
      whyItMatters: "Early-cycle hotspots can compress appreciation windows.",
      confidence: 74,
      tsIso: nowIso(),
      metricHint: "Investor Activity",
      scoreAffected: "Investor Activity Score",
      recommendedAction: "Pair leads with developer delivery diligence pack.",
    },
  ]);
  const [breakdownArea, setBreakdownArea] = useState<AreaIntelligence | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [updateDetail, setUpdateDetail] = useState<MarketUpdateItem | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    country: "All",
    city: "",
    investmentGoal: "All",
    budgetRange: "All",
    riskAppetite: "All",
    holdingPeriod: "All",
    propertyType: "",
    confidenceMin: "All",
  });

  const countries = useMemo(() => {
    const u = new Set(areas.map((a) => a.country));
    return ["All", ...Array.from(u).sort()];
  }, [areas]);

  const filtered = useMemo(() => {
    return areas.filter((a) => {
      if (filters.country !== "All" && a.country !== filters.country) return false;
      if (filters.city && !(`${a.city} ${a.name}`.toLowerCase().includes(filters.city.toLowerCase()))) return false;
      if (filters.investmentGoal !== "All" && !a.investmentTags.includes(filters.investmentGoal)) return false;
      if (filters.budgetRange !== "All" && a.budgetBand !== filters.budgetRange) return false;
      if (filters.riskAppetite !== "All" && a.riskLevel !== filters.riskAppetite) return false;
      if (filters.holdingPeriod !== "All") {
        const hp = a.aiRecommendation.holdingPeriod;
        if (filters.holdingPeriod === "1 Year" && !hp.includes("1")) return false;
        if (filters.holdingPeriod === "3 Years" && !hp.includes("3")) return false;
        if (filters.holdingPeriod === "5 Years" && !hp.includes("5")) return false;
        if (filters.holdingPeriod === "10 Years" && !hp.includes("10")) return false;
      }
      if (filters.propertyType && !a.aiRecommendation.propertyType.toLowerCase().includes(filters.propertyType.toLowerCase())) return false;
      if (filters.confidenceMin !== "All") {
        const m = Number(filters.confidenceMin);
        if (a.confidence < m) return false;
      }
      return true;
    });
  }, [areas, filters]);

  const spotlight = useMemo(
    () => filtered.reduce<AreaIntelligence | null>((best, a) => (!best || a.finalScore > best.finalScore ? a : best), null),
    [filtered],
  );

  const summary = useMemo(() => {
    const n = areas.length;
    const avg = Math.round(areas.reduce((s, a) => s + a.finalScore, 0) / Math.max(1, n));
    const elite = areas.filter((a) => a.opportunityGrade === "Elite Opportunity").length;
    return { n, avg, elite, live: updates.length };
  }, [areas, updates.length]);

  const compareRows = useMemo(() => areas.filter((a) => compareIds.includes(a.id)), [areas, compareIds]);

  const compareMax = useMemo(() => {
    if (!compareRows.length) return null as Record<string, number> | null;
    const keys = ["finalScore", "rentalDemand", "appreciation", "liquidity", "investorActivity", "searchInterest"] as const;
    const out: Record<string, number> = {};
    for (const k of keys) {
      out[k] = Math.max(...compareRows.map((r) => r[k] as number));
    }
    out.riskScore = Math.min(...compareRows.map((r) => r.riskScore));
    return out;
  }, [compareRows]);

  useEffect(() => {
    let cancelled = false;
    void fetchAreaIntelligence().then((remote) => {
      if (cancelled || !remote.length) return;
      setAreas((prev) => {
        const byId = new Map(prev.map((a) => [a.id, a]));
        for (const r of remote) byId.set(r.id, r);
        return Array.from(byId.values());
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsub = subscribeToAreaUpdates(() => {});
    return unsub;
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tid = { current: 0 as number };
    const loop = () => {
      tid.current = window.setTimeout(() => {
        if (cancelled) return;
        setAreas((prev) => {
          const next = applyRealtimeJitter(deepCloneAreas(prev));
          setUpdates((u) => [randomUpdate(next), ...u].slice(0, 40));
          return next;
        });
        loop();
      }, nextSyncMs());
    };
    loop();
    return () => {
      cancelled = true;
      window.clearTimeout(tid.current);
    };
  }, []);

  const toggleCompare = useCallback(
    (id: string) => {
      setCompareIds((prev) => {
        if (prev.includes(id)) return prev.filter((x) => x !== id);
        if (prev.length >= 4) {
          toast.message("Compare limit", { description: "Select up to 4 areas." });
          return prev;
        }
        return [...prev, id];
      });
    },
    [],
  );

  const runCompare = useCallback(() => {
    if (compareIds.length < 2) {
      toast.error("Select at least two areas to compare");
      return;
    }
    pushActivity(`Compared ${compareIds.length} investment areas`, "git-compare", "investor");
    toast.success("Comparison ready", { description: "Best-in-column highlights applied." });
  }, [compareIds, pushActivity]);

  const clearCompare = useCallback(() => {
    setCompareIds([]);
    pushActivity("Cleared area comparison", "x", "investor");
  }, [pushActivity]);

  const patchFilters = useCallback((patch: Partial<typeof filters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  }, []);

  const applySelectFilter = useCallback(
    (patch: Partial<typeof filters>) => {
      setFilters((f) => ({ ...f, ...patch }));
      pushActivity("Investor intelligence filters updated", "sliders-horizontal", "investor");
    },
    [pushActivity],
  );

  const openBreakdown = (a: AreaIntelligence) => {
    setBreakdownArea(a);
    pushActivity(`Opened area breakdown: ${a.name}`, "radar", "investor");
  };

  return (
    <>
      <div className="space-y-6">
        <SectionHeader
          title="Investor Intelligence & Area Growth Intelligence"
          subtitle="Understand why an area is evolving using demand signals, rental trends, infrastructure updates, investor activity, liquidity, price movement, and risk data."
        >
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setHelpOpen(true); pushActivity("Opened investor score help", "help-circle", "investor"); }}>
            <HelpCircle className="h-4 w-4" />
            How to read this score?
          </Button>
        </SectionHeader>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Areas tracked</div>
            <div className="text-2xl font-bold neon-text mt-1">{summary.n}</div>
          </GlowCard>
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg investment score</div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{summary.avg}</div>
          </GlowCard>
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Elite opportunities</div>
            <div className="text-2xl font-bold text-[oklch(0.82_0.2_150)] mt-1">{summary.elite}</div>
          </GlowCard>
          <GlowCard className="!p-4">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <RefreshCw className="h-3 w-3 text-primary animate-pulse" />
              Live signal events
            </div>
            <div className="text-2xl font-bold mt-1 tabular-nums">{summary.live}</div>
          </GlowCard>
        </div>

        <GlowCard>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-sm">
              <LineChart className="h-4 w-4 text-primary" />
              Filters
            </h3>
            <Badge variant="outline" className="text-[10px]">
              {filtered.length} areas match
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FilterSelect label="Country" value={filters.country} onChange={(v) => applySelectFilter({ country: v })} options={countries} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">City / Area</div>
              <input
                value={filters.city}
                onChange={(e) => patchFilters({ city: e.target.value })}
                placeholder="Search city or area…"
                className="w-full h-9 rounded-md border border-border bg-input/40 px-3 text-sm"
              />
            </div>
            <FilterSelect
              label="Investment Goal"
              value={filters.investmentGoal}
              onChange={(v) => applySelectFilter({ investmentGoal: v })}
              options={[...INVESTMENT_GOALS]}
            />
            <FilterSelect label="Budget Range" value={filters.budgetRange} onChange={(v) => applySelectFilter({ budgetRange: v })} options={[...BUDGETS]} />
            <FilterSelect label="Risk Appetite" value={filters.riskAppetite} onChange={(v) => applySelectFilter({ riskAppetite: v })} options={[...RISK_APPETITE]} />
            <FilterSelect label="Holding Period" value={filters.holdingPeriod} onChange={(v) => applySelectFilter({ holdingPeriod: v })} options={[...HOLDING]} />
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Property Type contains</div>
              <input
                value={filters.propertyType}
                onChange={(e) => patchFilters({ propertyType: e.target.value })}
                placeholder="e.g. condo"
                className="w-full h-9 rounded-md border border-border bg-input/40 px-3 text-sm"
              />
            </div>
            <FilterSelect
              label="Min confidence"
              value={filters.confidenceMin}
              onChange={(v) => applySelectFilter({ confidenceMin: v })}
              options={[...CONF]}
            />
          </div>
        </GlowCard>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              Area intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((a) => (
                <GlowCard key={a.id} className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-lg leading-tight">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.city} · {a.country}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0", gradeBadgeClass(a.opportunityGrade))}>
                      {a.finalScore}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                      {a.growthStage}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {a.opportunityGrade}
                    </Badge>
                    <Badge variant="outline" className={cn("text-[10px]", riskTone(a.riskLevel))}>
                      Risk {a.riskLevel}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{a.mainReason}</p>
                  <div className="text-[11px] space-y-1">
                    <div>
                      <span className="text-muted-foreground">Best for: </span>
                      <span className="text-foreground/90">{a.bestFor.join(" · ")}</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <span className="text-muted-foreground">
                        Confidence <strong className="text-foreground tabular-nums">{a.confidence}%</strong>
                      </span>
                      <span className="text-muted-foreground text-[10px]">
                        Updated {new Date(a.lastUpdatedIso).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto pt-1">
                    <Button size="sm" className="neon-border" onClick={() => openBreakdown(a)}>
                      View Breakdown
                    </Button>
                    <Button
                      size="sm"
                      variant={compareIds.includes(a.id) ? "secondary" : "outline"}
                      onClick={() => {
                        toggleCompare(a.id);
                        pushActivity(`${compareIds.includes(a.id) ? "Removed" : "Added"} compare: ${a.name}`, "git-compare", "investor");
                      }}
                    >
                      {compareIds.includes(a.id) ? "In compare" : "Compare"}
                    </Button>
                  </div>
                </GlowCard>
              ))}
            </div>
            {filtered.length === 0 && <GlowCard className="text-center text-muted-foreground py-12">No areas match these filters.</GlowCard>}
          </div>

          <GlowCard className="h-fit xl:sticky xl:top-20">
            <h3 className="font-semibold text-sm flex items-center gap-2 mb-3">
              <RefreshCw className="h-4 w-4 text-primary" />
              Realtime market updates
            </h3>
            <ScrollArea className="h-[min(28rem,55vh)] pr-3">
              <div className="space-y-2">
                {updates.map((u) => (
                  <div key={u.id} className="glass rounded-lg p-3 border border-border/40 text-xs space-y-1.5">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-foreground">{u.areaName}</span>
                      <span className="text-[10px] text-muted-foreground tabular-nums">{new Date(u.tsIso).toLocaleTimeString()}</span>
                    </div>
                    <div>{u.headline}</div>
                    <div className="text-muted-foreground">{u.whyItMatters}</div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Badge variant="outline" className="text-[10px]">
                        Conf {u.confidence}%
                      </Badge>
                      <Button size="sm" variant="ghost" className="h-7 text-[11px]" onClick={() => { setUpdateDetail(u); pushActivity(`Viewed market update: ${u.headline}`, "activity", "investor"); }}>
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </GlowCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlowCard>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Why areas evolve
            </h3>
            <Tabs defaultValue="simple">
              <TabsList className="glass">
                <TabsTrigger value="simple">Simple</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>
              <TabsContent value="simple" className="mt-3 text-sm text-muted-foreground leading-relaxed space-y-2">
                {spotlight ? (
                  <p>{spotlight.simpleWhy}</p>
                ) : (
                  <p>Select filters to surface an area — example: Dubai Marina grows when rental, luxury, and investor signals align.</p>
                )}
                <p className="text-[11px] border border-border/40 rounded-lg p-2 bg-primary/5">
                  Tip: open any card&apos;s <strong>View Breakdown</strong> for the full narrative for that micro-market.
                </p>
              </TabsContent>
              <TabsContent value="advanced" className="mt-3 text-sm space-y-2">
                {(spotlight?.advancedBullets ?? SEED_AREAS[0]!.advancedBullets).map((b) => (
                  <div key={b} className="flex gap-2 glass rounded-lg p-2 border border-border/30">
                    <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          </GlowCard>

          <GlowCard>
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Risk & opportunity
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              High scores suggest stronger alignment with the modeled goals, but execution, developer reputation, and financing still
              matter. <span className="text-[oklch(0.88_0.18_60)]">Medium / High risk</span> means widen diligence — especially on
              premium pricing, policy, and liquidity stress tests.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <Mini label="Opportunity lens" value="Demand + liquidity" />
              <Mini label="Risk lens" value="Leverage + policy" />
            </div>
          </GlowCard>
        </div>

        <GlowCard>
          <h3 className="font-semibold text-sm mb-2">External market signals</h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            Labels shown as <Badge variant="outline" className="text-[9px] mx-1">API-ready signal</Badge> — not live Google data in this build.
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {MOCK_EXTERNAL_SIGNALS.map((s) => (
              <div key={s.label} className="glass rounded-lg p-3 border border-border/40 text-xs">
                <div className="font-medium text-foreground mb-1 flex items-center justify-between gap-2">
                  {s.label}
                  <Badge variant="outline" className="text-[9px] shrink-0">
                    Mock external signal
                  </Badge>
                </div>
                <p className="text-muted-foreground leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </GlowCard>

        <GlowCard>
          <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI recommendation panel
          </h3>
          {spotlight ? (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Best for</div>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {spotlight.aiRecommendation.bestFor.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Not ideal for</div>
                <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                  {spotlight.aiRecommendation.notIdealFor.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Suggested property type</div>
                <div>{spotlight.aiRecommendation.propertyType}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Suggested holding period</div>
                <div>{spotlight.aiRecommendation.holdingPeriod}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Suggested buyer profile</div>
                <div>{spotlight.aiRecommendation.buyerProfile}</div>
              </div>
              <div className="md:col-span-2 glass rounded-lg p-3 border border-primary/25">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Recommended broker action</div>
                <div className="text-sm neon-text">→ {spotlight.aiRecommendation.brokerAction}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Adjust filters to preview AI recommendation copy for the top matching area.</p>
          )}
        </GlowCard>

        <GlowCard>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <GitCompareArrows className="h-4 w-4 text-primary" />
              Compare areas
            </h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={runCompare}>
                Compare
              </Button>
              <Button size="sm" variant="ghost" onClick={clearCompare}>
                Clear comparison
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-3">Select up to 4 areas from the cards above, then run compare. Best value per metric is highlighted.</p>
          {compareRows.length >= 2 && compareMax ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs">Area</TableHead>
                    <TableHead className="text-xs">Score</TableHead>
                    <TableHead className="text-xs">Rental</TableHead>
                    <TableHead className="text-xs">Appr.</TableHead>
                    <TableHead className="text-xs">Liquidity</TableHead>
                    <TableHead className="text-xs">Investor</TableHead>
                    <TableHead className="text-xs">Search</TableHead>
                    <TableHead className="text-xs">Risk</TableHead>
                    <TableHead className="text-xs min-w-[140px]">Best use</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compareRows.map((r) => (
                    <TableRow key={r.id} className="border-border/40">
                      <TableCell className="font-medium text-xs whitespace-nowrap">{r.name}</TableCell>
                      {(["finalScore", "rentalDemand", "appreciation", "liquidity", "investorActivity", "searchInterest"] as const).map((k) => (
                        <TableCell key={k} className="text-xs tabular-nums">
                          <span className={cn((r[k] as number) === compareMax[k] && "text-[oklch(0.82_0.2_150)] font-semibold")}>{r[k] as number}</span>
                        </TableCell>
                      ))}
                      <TableCell className="text-xs tabular-nums">
                        <span className={cn(r.riskScore === compareMax.riskScore && "text-[oklch(0.82_0.2_150)] font-semibold")}>{r.riskScore}</span>
                      </TableCell>
                      <TableCell className="text-[11px] text-muted-foreground">{r.bestFor.join(" · ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Pick two or more areas to see the matrix.</p>
          )}
        </GlowCard>

        <GlowCard>
          <h3 className="font-semibold text-sm mb-3">Data sources used</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {DATA_SOURCE_ROWS.map((d) => (
              <div key={d.id} className="glass rounded-lg p-3 border border-border/40 text-xs space-y-1">
                <div className="font-medium">{d.name}</div>
                <Badge variant="outline" className="text-[10px]">
                  {d.status}
                </Badge>
                <p className="text-muted-foreground leading-snug">{d.detail}</p>
              </div>
            ))}
          </div>
        </GlowCard>
      </div>

      <Dialog open={!!breakdownArea} onOpenChange={(o) => !o && setBreakdownArea(null)}>
        <DialogContent className="w-[min(100vw-1rem,56rem)] max-h-[min(100dvh,92vh)] sm:max-h-[90vh] max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none max-sm:border-0 glass-strong border-border/60 overflow-y-auto scrollbar-thin">
          {breakdownArea && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg pr-8">{breakdownArea.name} — score breakdown</DialogTitle>
                <DialogDescription>
                  {breakdownArea.city}, {breakdownArea.country} · Mock realtime refresh (10–20s) · Not investment advice.
                </DialogDescription>
              </DialogHeader>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2 mt-2">
                <Mini label="Final score" value={String(breakdownArea.finalScore)} />
                <Mini label="Growth stage" value={breakdownArea.growthStage} />
                <Mini label="Opportunity" value={breakdownArea.opportunityGrade} />
                <Mini label="Confidence" value={`${breakdownArea.confidence}%`} />
              </div>
              <p className="text-sm text-muted-foreground mt-3">{breakdownArea.simpleWhy}</p>
              <div className="glass rounded-lg p-3 mt-3 border border-primary/20">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">AI recommendation</div>
                <p className="text-sm neon-text">→ {breakdownArea.aiRecommendation.brokerAction}</p>
              </div>
              <h4 className="text-xs uppercase tracking-wider text-muted-foreground mt-4 mb-2">Score components</h4>
              <div className="space-y-3">
                {breakdownArea.scoreComponents.map((c) => (
                  <div key={c.id} className="glass rounded-lg p-3 border border-border/40">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-medium text-sm">
                        {trendIcon(c.trend)}
                        {c.label}
                      </div>
                      <span className="text-sm tabular-nums font-semibold">
                        {c.score} / 100
                      </span>
                    </div>
                    <Progress value={c.score} className="h-1.5 mt-2 bg-primary/10 transition-all duration-500" />
                    <p className="text-xs text-muted-foreground mt-2">{c.reason}</p>
                    <div className="flex flex-wrap gap-2 mt-2 text-[10px]">
                      <Badge variant="outline">{c.sourceTag}</Badge>
                      <span className="text-muted-foreground">Updated {new Date(c.lastUpdated).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="glass-strong max-w-lg max-sm:max-w-[100vw]">
          <DialogHeader>
            <DialogTitle>How to read this score?</DialogTitle>
            <DialogDescription>Plain-language guide for brokers, clients, and investors.</DialogDescription>
          </DialogHeader>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc pl-4">
            <li>Scores are decision-support — not a guarantee of returns.</li>
            <li>Higher rental demand usually means stronger income potential (always validate with comps).</li>
            <li>Higher liquidity suggests easier resale and faster price discovery.</li>
            <li>Higher appreciation signals possible future price growth — sensitivity-test the thesis.</li>
            <li>Higher risk means more diligence: developer, policy, financing, and macro.</li>
            <li>Confidence reflects how many independent signals agree — low confidence means wider error bars.</li>
          </ul>
          <Button variant="outline" className="w-full mt-2" onClick={() => setHelpOpen(false)}>
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <Dialog open={!!updateDetail} onOpenChange={(o) => !o && setUpdateDetail(null)}>
        <DialogContent className="glass-strong max-w-md max-sm:max-w-[100vw]">
          {updateDetail && (
            <>
              <DialogHeader>
                <DialogTitle>Update detail</DialogTitle>
                <DialogDescription>{updateDetail.areaName}</DialogDescription>
              </DialogHeader>
              <div className="text-sm space-y-2">
                <p className="font-medium">{updateDetail.headline}</p>
                <p className="text-muted-foreground">{updateDetail.whyItMatters}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Mini label="Metric" value={updateDetail.metricHint} />
                  <Mini label="Score affected" value={updateDetail.scoreAffected} />
                  <Mini label="Confidence" value={`${updateDetail.confidence}%`} />
                  <Mini label="Time" value={new Date(updateDetail.tsIso).toLocaleString()} />
                </div>
                <div className="glass rounded-lg p-3 text-sm border border-primary/25">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended action</span>
                  <p className="mt-1 neon-text">→ {updateDetail.recommendedAction}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
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
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-input/40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-strong max-h-64">
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
