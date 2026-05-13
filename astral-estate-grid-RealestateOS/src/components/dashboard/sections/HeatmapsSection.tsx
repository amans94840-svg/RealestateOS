import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Maximize2, Minimize2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader, Mini } from "../utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

import { SEED_MARKET_ZONES } from "@/lib/market-map-seed";
import type { MarketSignal, MarketZone, PropertyTypeFilter, InvestmentGoal, RiskLevel, TimeHorizon } from "@/lib/market-map-types";
import { fetchMarketZones, subscribeToMarketZones, updateMarketZoneRealtime } from "@/lib/market-map-api";
import { markerCategory, MARKER_CATEGORY_LABEL } from "@/lib/market-map-marker";

const MarketLeafletMap = lazy(() => import("./MarketLeafletMap"));

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function rndDelta(max: number) {
  return Math.floor(Math.random() * (max * 2 + 1)) - max;
}

function formatZonePrice(z: MarketZone) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: z.currency,
      maximumFractionDigits: 0,
    }).format(z.averagePrice);
  } catch {
    return `${z.currency} ${z.averagePrice.toLocaleString()}`;
  }
}

function growthTag(score: number): string {
  if (score >= 86) return "Hot";
  if (score >= 78) return "Rising";
  return "Balanced";
}

function buildWhyScore(z: MarketZone): string[] {
  return [
    `Lead demand proxy (demand score ${z.demandScore}) reflects inbound interest velocity for ${z.areaName}.`,
    `Rental demand at ${z.rentalDemand}/100 supports ${z.bestPropertyType} positioning vs competing districts.`,
    `Investor activity ${z.investorActivity}/100 indicates ${z.bestBuyerType} concentration in current deal flow.`,
    `Liquidity score ${z.liquidityScore}/100 captures resale depth and time-on-market expectations.`,
    `Price movement outlook +${z.priceGrowthForecast.toFixed(1)}% YoY anchors growth expectations in the model.`,
    `Risk score ${z.riskScore}/100 balances regulatory, macro, and micro-market volatility for this zone.`,
  ];
}

function diffSignal(prev: MarketZone, next: MarketZone): MarketSignal {
  type Cand = { k: keyof MarketZone; type: MarketSignal["type"]; headlineUp: string; headlineDown: string };
  const fields: Cand[] = [
    { k: "demandScore", type: "demand", headlineUp: "Demand increased", headlineDown: "Demand softened" },
    { k: "rentalYield", type: "yield", headlineUp: "Rental yield improved", headlineDown: "Rental yield compressed" },
    { k: "investorActivity", type: "investor", headlineUp: "Investor activity rising", headlineDown: "Investor activity cooling" },
    { k: "riskScore", type: "risk", headlineUp: "Risk increased", headlineDown: "Risk eased" },
    { k: "priceGrowthForecast", type: "growth", headlineUp: "Price growth detected", headlineDown: "Price growth moderated" },
  ];
  let best = fields[0]!;
  let bestDelta = 0;
  let bestSign = 1;
  for (const f of fields) {
    const a = Number(prev[f.k]);
    const b = Number(next[f.k]);
    const d = Math.abs(b - a);
    if (d > bestDelta) {
      bestDelta = d;
      best = f;
      bestSign = b >= a ? 1 : -1;
    }
  }
  const headline = bestSign >= 0 ? best.headlineUp : best.headlineDown;
  const impact: MarketSignal["impact"] = bestDelta >= 4 ? "High" : bestDelta >= 2 ? "Medium" : "Low";
  const confidence = clamp(72 + Math.round(Math.random() * 18), 65, 97);
  const detail = `Model shift on ${String(best.k)} for ${next.areaName}: ${Number(prev[best.k])} → ${Number(next[best.k])}. Confidence blends listing velocity, mortgage spreads, and cross-border capital flows.`;
  return {
    id: `sig-${next.id}-${next.lastUpdated}`,
    area: next.areaName,
    zoneId: next.id,
    type: best.type,
    headline,
    timestamp: next.lastUpdated,
    impact,
    confidence,
    detail,
  };
}

const PROPERTY_TYPES: PropertyTypeFilter[] = ["Apartment", "Villa", "Commercial", "Mixed-Use"];
const GOALS: InvestmentGoal[] = ["Rental Yield", "Capital Growth", "Balanced"];
const RISKS: RiskLevel[] = ["Low", "Medium", "High"];
const HORIZONS: TimeHorizon[] = ["1-3 years", "3-5 years", "5-10 years"];

export function HeatmapsSection() {
  const { pushActivity } = useDashboard();
  const [zones, setZones] = useState<MarketZone[]>(() => SEED_MARKET_ZONES.map(z => ({ ...z })));
  const [country, setCountry] = useState<string>("All");
  const [city, setCity] = useState<string>("All");
  const [propertyType, setPropertyType] = useState<string>("All");
  const [investmentGoal, setInvestmentGoal] = useState<string>("All");
  const [riskLevel, setRiskLevel] = useState<string>("All");
  const [timeHorizon, setTimeHorizon] = useState<string>("All");

  const [selectedId, setSelectedId] = useState<string | null>(zones[0]?.id ?? null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFs, setMapFs] = useState(false);
  const [pulseIds, setPulseIds] = useState<ReadonlySet<string>>(new Set());
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [impact, setImpact] = useState<MarketSignal | null>(null);

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const data = await fetchMarketZones();
      if (!cancelled && data.length) setZones(data);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const unsubscribeStub = subscribeToMarketZones(() => {
      /* Supabase: subscriber receives merged rows from Realtime */
    });

    const mounted = { current: true };
    const timerRef = { id: undefined as number | undefined };
    const schedule = () => {
      const delay = 10_000 + Math.floor(Math.random() * 10_000);
      timerRef.id = window.setTimeout(() => {
        if (!mounted.current) return;
        setZones(prev => {
          if (!prev.length) return prev;
          const i = Math.floor(Math.random() * prev.length);
          const before = prev[i]!;
          const z: MarketZone = {
            ...before,
            opportunityScore: clamp(before.opportunityScore + rndDelta(2), 55, 99),
            demandScore: clamp(before.demandScore + rndDelta(3), 40, 99),
            rentalDemand: clamp(before.rentalDemand + rndDelta(3), 40, 99),
            investorActivity: clamp(before.investorActivity + rndDelta(3), 40, 99),
            rentalYield: Math.round((before.rentalYield + rndDelta(1) * 0.1) * 10) / 10,
            priceGrowthForecast: Math.round((before.priceGrowthForecast + rndDelta(1) * 0.2) * 10) / 10,
            riskScore: clamp(before.riskScore + rndDelta(2), 15, 85),
            lastUpdated: Date.now(),
          };
          void updateMarketZoneRealtime(z.id, {
            opportunityScore: z.opportunityScore,
            demandScore: z.demandScore,
            lastUpdated: z.lastUpdated,
          });
          const sig = diffSignal(before, z);
          setSignals(s => [sig, ...s].slice(0, 30));
          setPulseIds(new Set([z.id]));
          window.setTimeout(() => {
            if (mounted.current) setPulseIds(new Set());
          }, 2000);
          pushActivity(`Realtime market update: ${sig.headline} · ${z.areaName}`, "sparkles", "market");
          const next = [...prev];
          next[i] = z;
          return next;
        });
        if (mounted.current) schedule();
      }, delay);
    };

    schedule();
    return () => {
      mounted.current = false;
      if (timerRef.id !== undefined) window.clearTimeout(timerRef.id);
      unsubscribeStub();
    };
  }, [pushActivity]);

  const countries = useMemo(() => Array.from(new Set(zones.map(z => z.country))), [zones]);
  const cities = useMemo(
    () => Array.from(new Set(zones.filter(z => country === "All" || z.country === country).map(z => z.city))),
    [zones, country],
  );

  const filtered = useMemo(() => {
    return zones.filter(z => {
      if (country !== "All" && z.country !== country) return false;
      if (city !== "All" && z.city !== city) return false;
      if (propertyType !== "All" && z.bestPropertyType !== propertyType) return false;
      if (investmentGoal !== "All" && z.investmentGoal !== investmentGoal) return false;
      if (riskLevel !== "All" && z.riskLevel !== riskLevel) return false;
      if (timeHorizon !== "All" && z.timeHorizon !== timeHorizon) return false;
      return true;
    });
  }, [zones, country, city, propertyType, investmentGoal, riskLevel, timeHorizon]);

  const selected = useMemo(
    () => filtered.find(z => z.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
    if (!selected && selectedId) setSelectedId(null);
  }, [selected, selectedId]);

  const ranked = useMemo(() => [...filtered].sort((a, b) => b.opportunityScore - a.opportunityScore), [filtered]);

  const openZone = useCallback(
    (z: MarketZone) => {
      setSelectedId(z.id);
      setSheetOpen(true);
      pushActivity(`Map marker opened: ${z.areaName} (${z.city})`, "map-pin", "market");
      toast.success(z.areaName, { description: `Opportunity score ${z.opportunityScore}` });
    },
    [pushActivity],
  );

  const onFilterChange = useCallback(
    (label: string, value: string) => {
      pushActivity(`Market map filter · ${label}: ${value}`, "filter", "market");
    },
    [pushActivity],
  );

  const resetFilters = () => {
    setCountry("All");
    setCity("All");
    setPropertyType("All");
    setInvestmentGoal("All");
    setRiskLevel("All");
    setTimeHorizon("All");
    pushActivity("Market map filters reset", "sparkles", "market");
    toast("Filters reset");
  };

  const mapShellClass = mapFs
    ? "fixed inset-0 z-[45] flex flex-col gap-3 bg-background/95 p-3 md:p-4 backdrop-blur-md"
    : "flex flex-col gap-3";

  return (
    <div>
      <SectionHeader
        title="AI Market Opportunity Map"
        subtitle="Live global intelligence · dark cartography · realtime signals"
      />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
        <div className={mapShellClass}>
          <GlowCard className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Country</Label>
                <Select
                  value={country}
                  onValueChange={v => {
                    setCountry(v);
                    setCity("All");
                    onFilterChange("Country", v);
                  }}
                >
                  <SelectTrigger className="bg-input/40">
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All countries</SelectItem>
                    {countries.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">City</Label>
                <Select value={city} onValueChange={v => { setCity(v); onFilterChange("City", v); }}>
                  <SelectTrigger className="bg-input/40">
                    <SelectValue placeholder="City" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All cities</SelectItem>
                    {cities.map(c => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Property type</Label>
                <Select value={propertyType} onValueChange={v => { setPropertyType(v); onFilterChange("Property type", v); }}>
                  <SelectTrigger className="bg-input/40">
                    <SelectValue placeholder="Property type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All types</SelectItem>
                    {PROPERTY_TYPES.map(p => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Investment goal</Label>
                <Select value={investmentGoal} onValueChange={v => { setInvestmentGoal(v); onFilterChange("Investment goal", v); }}>
                  <SelectTrigger className="bg-input/40">
                    <SelectValue placeholder="Goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All goals</SelectItem>
                    {GOALS.map(g => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Risk level</Label>
                <Select value={riskLevel} onValueChange={v => { setRiskLevel(v); onFilterChange("Risk level", v); }}>
                  <SelectTrigger className="bg-input/40">
                    <SelectValue placeholder="Risk" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All risk levels</SelectItem>
                    {RISKS.map(r => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Time horizon</Label>
                <Select value={timeHorizon} onValueChange={v => { setTimeHorizon(v); onFilterChange("Time horizon", v); }}>
                  <SelectTrigger className="bg-input/40">
                    <SelectValue placeholder="Horizon" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All horizons</SelectItem>
                    {HORIZONS.map(h => (
                      <SelectItem key={h} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-primary/40">
                {filtered.length} zones
              </Badge>
              <Badge variant="outline" className="border-[oklch(0.82_0.2_150_/_0.5)]">
                Green = high opportunity
              </Badge>
              <Badge variant="outline" className="border-[oklch(0.7_0.25_300_/_0.5)]">
                Blue = emerging
              </Badge>
              <Badge variant="outline" className="border-[oklch(0.78_0.2_50_/_0.5)]">
                Yellow = stable
              </Badge>
              <Badge variant="outline" className="border-destructive/40">
                Red = high risk
              </Badge>
              <Button type="button" size="sm" variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={() => {
                  setMapFs(f => !f);
                  pushActivity(mapFs ? "Map exited fullscreen" : "Map entered fullscreen", "maximize", "market");
                }}
              >
                {mapFs ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                <span className="ml-1 hidden sm:inline">{mapFs ? "Exit" : "Fullscreen"}</span>
              </Button>
            </div>

            <div className="relative overflow-hidden rounded-xl border border-primary/20 neon-border">
              {mapReady ? (
                <Suspense
                  fallback={
                    <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading map…
                    </div>
                  }
                >
                  <MarketLeafletMap
                    zones={filtered}
                    selectedId={selectedId}
                    pulseIds={pulseIds}
                    onMarkerClick={z => openZone(z)}
                    className="h-full min-h-[320px] w-full rounded-xl z-0"
                  />
                </Suspense>
              ) : (
                <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">Preparing map…</div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <Card className="glass border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Zones on map</CardTitle>
                </CardHeader>
                <CardContent className="max-h-48 space-y-1 overflow-y-auto scrollbar-thin pt-0 text-sm">
                  {filtered.length === 0 ? (
                    <p className="text-muted-foreground">No zones match filters.</p>
                  ) : (
                    filtered.map(z => (
                      <button
                        key={z.id}
                        type="button"
                        className={`flex w-full items-center justify-between rounded-lg border border-transparent px-2 py-1.5 text-left hover:border-primary/30 hover:bg-primary/5 ${selectedId === z.id ? "neon-border bg-primary/10" : ""}`}
                        onClick={() => openZone(z)}
                      >
                        <span className="truncate font-medium">{z.areaName}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {z.opportunityScore}
                        </Badge>
                      </button>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card className="glass border-border/40">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Top growth areas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  {ranked.slice(0, 6).map((z, idx) => (
                    <div
                      key={z.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/30 bg-card/40 px-2 py-2 animate-in fade-in duration-300"
                      style={{ animationDelay: `${idx * 40}ms` }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          #{idx + 1} {z.areaName}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {z.country} · Score {z.opportunityScore}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {growthTag(z.opportunityScore)}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                          Risk {z.riskScore}
                        </Badge>
                        <Button type="button" size="sm" variant="secondary" className="h-7 text-xs" onClick={() => openZone(z)}>
                          View report
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </GlowCard>
        </div>

        <div className="flex flex-col gap-4">
          <GlowCard>
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live market signals</div>
            <ScrollArea className="h-[min(52vh,420px)] pr-3">
              {signals.length === 0 ? (
                <p className="text-sm text-muted-foreground">Waiting for realtime pulses…</p>
              ) : (
                signals.map(sig => (
                  <div
                    key={sig.id}
                    className="mb-2 animate-in fade-in slide-in-from-right-2 rounded-lg border border-border/40 bg-card/30 p-2 text-sm duration-300"
                  >
                      <div className="font-medium">{sig.headline}</div>
                      <div className="text-xs text-muted-foreground">{sig.area}</div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                        <span>{formatDistanceToNow(sig.timestamp, { addSuffix: true })}</span>
                        <Badge variant="outline" className="text-[10px]">
                          Impact {sig.impact}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {sig.confidence}% conf.
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2 h-7 w-full text-xs"
                        onClick={() => {
                          setImpact(sig);
                          pushActivity(`View impact: ${sig.headline} · ${sig.area}`, "eye", "market");
                        }}
                      >
                        View impact
                      </Button>
                  </div>
                ))
              )}
            </ScrollArea>
          </GlowCard>
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full border-l border-border/60 bg-background/95 sm:max-w-md">
          {selected ? (
            <>
              <SheetHeader>
                <SheetTitle>Area intelligence report</SheetTitle>
                <SheetDescription>
                  {selected.areaName} — {selected.city}, {selected.country}
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="mt-4 h-[calc(100vh-8rem)] pr-4">
                <div className="space-y-3 pb-8">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="border-primary/40">
                      Opportunity {selected.opportunityScore}
                    </Badge>
                    <Badge variant="outline">Demand {selected.demandScore}</Badge>
                    <Badge variant="outline">{MARKER_CATEGORY_LABEL[markerCategory(selected)]}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Mini label="Rental demand" value={`${selected.rentalDemand}`} />
                    <Mini label="Price growth (forecast)" value={`+${selected.priceGrowthForecast.toFixed(1)}%`} />
                    <Mini label="Investor activity" value={`${selected.investorActivity}`} />
                    <Mini label="Liquidity" value={`${selected.liquidityScore}`} />
                    <Mini label="Risk score" value={`${selected.riskScore}`} />
                    <Mini label="Rental yield" value={`${selected.rentalYield}%`} />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Average price</div>
                    <div className="text-lg font-semibold neon-text">{formatZonePrice(selected)}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="glass rounded-lg p-2">
                      <span className="text-xs text-muted-foreground">Best property type</span>
                      <div className="font-medium">{selected.bestPropertyType}</div>
                    </div>
                    <div className="glass rounded-lg p-2">
                      <span className="text-xs text-muted-foreground">Best buyer type</span>
                      <div className="font-medium">{selected.bestBuyerType}</div>
                    </div>
                  </div>
                  <div className="glass rounded-lg p-3 text-sm">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">AI recommendation</div>
                    <p>{selected.aiRecommendation}</p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Last updated {formatDistanceToNow(selected.lastUpdated, { addSuffix: true })}
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Why this score?</div>
                    <ul className="space-y-1.5">
                      {buildWhyScore(selected).map((line, i) => (
                        <li key={i} className="glass rounded-md p-2 text-sm">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => {
                      pushActivity(`Shared intelligence snapshot: ${selected.areaName}`, "file-text", "market");
                      toast.success("Snapshot prepared", { description: selected.areaName });
                    }}
                  >
                    Share client snapshot
                  </Button>
                </div>
              </ScrollArea>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a zone on the map.</p>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!impact} onOpenChange={o => !o && setImpact(null)}>
        <DialogContent className="glass-strong max-w-md">
          {impact && (
            <>
              <DialogHeader>
                <DialogTitle>{impact.headline}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">{impact.area}</p>
              <p className="text-sm leading-relaxed">{impact.detail}</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">Impact {impact.impact}</Badge>
                <Badge variant="outline">Confidence {impact.confidence}%</Badge>
                <Badge variant="outline" className="capitalize">
                  {impact.type}
                </Badge>
              </div>
              <Button
                type="button"
                onClick={() => {
                  const z = zones.find(x => x.id === impact.zoneId);
                  if (z) openZone(z);
                  setImpact(null);
                }}
              >
                Open zone report
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
