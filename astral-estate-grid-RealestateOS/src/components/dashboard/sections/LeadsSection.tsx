import { useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader, urgencyColor, scoreColor } from "../utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, SlidersHorizontal, ShieldCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUDGETS, BUYER_TYPES, PROPERTY_TYPES, SOURCES } from "@/lib/dashboard-data";

export function LeadsSection() {
  const { leads, setAddLeadOpen, setSelectedLeadId, leadFilters, setLeadFilters } = useDashboard();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("ai");
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    let out = leads.slice();
    if (leadFilters.hot) out = out.filter(l => l.aiScore >= 75);
    if (leadFilters.budget) out = out.filter(l => l.budget === leadFilters.budget);
    if (leadFilters.propertyType) out = out.filter(l => l.propertyType === leadFilters.propertyType);
    if (leadFilters.buyerType) out = out.filter(l => l.buyerType === leadFilters.buyerType);
    if (leadFilters.urgency) out = out.filter(l => l.urgency === leadFilters.urgency);
    if (leadFilters.source) out = out.filter(l => l.source === leadFilters.source);
    if (leadFilters.country) out = out.filter(l => l.country.toLowerCase().includes(leadFilters.country!.toLowerCase()));
    if (leadFilters.city) out = out.filter(l => l.city.toLowerCase().includes(leadFilters.city!.toLowerCase()));
    if (q) {
      const lo = q.toLowerCase();
      out = out.filter(l => l.name.toLowerCase().includes(lo) || l.phone.includes(q) || l.city.toLowerCase().includes(lo));
    }
    if (sort === "ai") out.sort((a, b) => b.aiScore - a.aiScore);
    if (sort === "recent") out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  }, [leads, q, sort, leadFilters]);

  const activeFilters = Object.entries(leadFilters).filter(([, v]) => v) as [string, string | boolean][];

  return (
    <div>
      <SectionHeader title="Lead Intelligence Center" subtitle="AI-powered lead management and scoring">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search leads…" className="pl-9 w-56 bg-input/40" />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)}><SlidersHorizontal className="h-4 w-4" /> Filters</Button>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44 bg-input/40"><SelectValue /></SelectTrigger>
          <SelectContent className="glass-strong">
            <SelectItem value="ai">AI Priority</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setAddLeadOpen(true)} className="neon-border bg-primary/90 hover:bg-primary"><Plus className="h-4 w-4" /> Add Lead</Button>
      </SectionHeader>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {activeFilters.map(([k, v]) => (
            <Badge key={k} variant="outline" className="gap-1.5 pr-1.5">
              {k}: {String(v)}
              <button onClick={() => setLeadFilters({ ...leadFilters, [k]: undefined })} className="hover:text-destructive"><X className="h-3 w-3" /></button>
            </Badge>
          ))}
          <Button size="sm" variant="ghost" onClick={() => setLeadFilters({})}>Clear all</Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <GlowCard className="text-center py-16 text-muted-foreground">No leads match your filters.</GlowCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(l => (
            <GlowCard key={l.id} onClick={() => setSelectedLeadId(l.id)}>
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/30"><AvatarFallback className="bg-gradient-to-br from-primary/40 to-[oklch(0.7_0.25_300_/_0.4)] text-sm font-semibold">{l.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold truncate">{l.name}</span>
                    {l.verified && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-[oklch(0.82_0.2_150_/_0.5)] bg-[oklch(0.82_0.2_150_/_0.1)] text-[oklch(0.82_0.2_150)] text-[10px] gap-0.5 py-0 h-5"
                      >
                        <ShieldCheck className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{l.phone}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${scoreColor(l.aiScore)}`}>{l.aiScore}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">AI</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <Info label="Budget" value={l.budget} />
                <Info label="Location" value={`${l.city}, ${l.country}`} />
                <Info label="Property" value={l.propertyType} />
                <Info label="Buyer" value={l.buyerType} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant="outline" className={urgencyColor(l.urgency)}>{l.urgency}</Badge>
                <Badge variant="outline" className="border-primary/40 text-primary">{l.purpose}</Badge>
                <Badge variant="outline">{l.source}</Badge>
              </div>
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                <div className="text-xs text-muted-foreground">Recommended</div>
                <div className="text-xs font-medium neon-text">→ {l.recommendedAction}</div>
              </div>
            </GlowCard>
          ))}
        </div>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>Filter Leads</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FSelect label="Budget" value={leadFilters.budget} onChange={v => setLeadFilters({ ...leadFilters, budget: v })} options={BUDGETS} />
            <FSelect label="Property Type" value={leadFilters.propertyType} onChange={v => setLeadFilters({ ...leadFilters, propertyType: v })} options={PROPERTY_TYPES} />
            <FSelect label="Buyer Type" value={leadFilters.buyerType} onChange={v => setLeadFilters({ ...leadFilters, buyerType: v })} options={BUYER_TYPES} />
            <FSelect label="Urgency" value={leadFilters.urgency} onChange={v => setLeadFilters({ ...leadFilters, urgency: v })} options={["Critical", "High", "Medium", "Low"]} />
            <FSelect label="Source" value={leadFilters.source} onChange={v => setLeadFilters({ ...leadFilters, source: v })} options={SOURCES} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Country</div>
              <Input value={leadFilters.country ?? ""} onChange={e => setLeadFilters({ ...leadFilters, country: e.target.value })} className="bg-input/40" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">City / Area</div>
              <Input value={leadFilters.city ?? ""} onChange={e => setLeadFilters({ ...leadFilters, city: e.target.value })} className="bg-input/40" />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => { setLeadFilters({}); }}>Clear</Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="truncate">{value}</div>
    </div>
  );
}
function FSelect({ label, value, onChange, options }: { label: string; value?: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="bg-input/40"><SelectValue placeholder="Any" /></SelectTrigger>
        <SelectContent className="glass-strong">{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
