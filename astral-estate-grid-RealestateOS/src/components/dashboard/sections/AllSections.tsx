import { useEffect, useMemo, useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader, Mini, urgencyColor } from "../utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Send, Heart, Edit, Share2, Sparkles, Loader2, Calendar as CalIcon, Plus, FileText, Download, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { SEED_BROKERS } from "@/lib/dashboard-data";
import { BillingTabPanel } from "@/components/dashboard/settings/BillingTabPanel";

// =============== AI Conversations ===============
const SAMPLE_CONVS = [
  { id: "c1", name: "Mohammed Al-Rashid", country: "🇦🇪 UAE", last: "I'd like ROI projections for Marina Skyline", sentiment: "Positive" },
  { id: "c2", name: "Sarah Chen", country: "🇸🇬 SG", last: "Can we schedule a video tour this Friday?", sentiment: "Positive" },
  { id: "c3", name: "James Whitmore", country: "🇬🇧 UK", last: "Need full investment deck — fund-level interest", sentiment: "Hot" },
  { id: "c4", name: "Lukas Müller", country: "🇩🇪 DE", last: "Following up next month, just exploring", sentiment: "Neutral" },
];

export function AIConversationsSection() {
  const { pushActivity } = useDashboard();
  const [active, setActive] = useState(SAMPLE_CONVS[0]);
  const [msgs, setMsgs] = useState<{ role: "lead" | "agent" | "ai"; text: string }[]>([
    { role: "lead", text: "Hi, I'm interested in luxury Dubai properties for investment." },
    { role: "ai", text: "Great choice. Marina Skyline Penthouse offers 7.8% rental yield and 14% appreciation. Want a full ROI report?" },
    { role: "lead", text: "Yes please, also include comparable properties." },
  ]);
  const [input, setInput] = useState("");

  return (
    <div>
      <SectionHeader title="AI Conversations" subtitle="Live multilingual conversations across global leads" />
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-4 h-[calc(100vh-12rem)]">
        <GlowCard className="overflow-y-auto scrollbar-thin">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Conversations</div>
          {SAMPLE_CONVS.map(c => (
            <button key={c.id} onClick={() => setActive(c)} className={`w-full text-left p-3 rounded-lg mb-1 transition ${active.id === c.id ? "bg-primary/10 neon-border" : "hover:bg-accent"}`}>
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/30">{c.name.split(" ").map(n=>n[0]).join("").slice(0,2)}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm truncate">{c.name}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{c.country} • {c.last}</div>
                </div>
              </div>
            </button>
          ))}
        </GlowCard>

        <GlowCard className="flex flex-col">
          <div className="border-b border-border/40 pb-3 mb-3 flex items-center justify-between">
            <div>
              <div className="font-semibold">{active.name}</div>
              <div className="text-xs text-muted-foreground">{active.country}</div>
            </div>
            <Badge variant="outline" className="border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]">{active.sentiment}</Badge>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-2">
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "lead" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${m.role === "lead" ? "glass" : m.role === "ai" ? "bg-primary/20 border border-primary/40" : "bg-primary text-primary-foreground"}`}>
                  {m.role === "ai" && <span className="text-[10px] uppercase tracking-widest text-primary block mb-0.5">AI</span>}
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); if (!input.trim()) return; setMsgs(m => [...m, { role: "agent", text: input }]); setInput(""); pushActivity(`Replied to ${active.name}`, "bot", "ai"); setTimeout(() => setMsgs(m => [...m, { role: "ai", text: "AI has logged your message and queued an automated follow-up." }]), 700); }} className="flex gap-2 mt-3 pt-3 border-t border-border/40">
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Type a reply…" className="bg-input/40" />
            <Button type="submit" size="icon"><Send className="h-4 w-4" /></Button>
          </form>
        </GlowCard>

        <GlowCard className="overflow-y-auto scrollbar-thin">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" /> AI Summary</div>
          <p className="text-sm leading-relaxed">High-intent investor evaluating Dubai luxury inventory. Confirmed budget tier $2M+. Sentiment: positive. ROI focus.</p>
          <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground mb-2">Suggested Next Action</div>
          <div className="glass rounded-lg p-3 text-sm neon-text">→ Send Marina Skyline ROI deck within 2h</div>
          <div className="mt-4 text-xs uppercase tracking-widest text-muted-foreground mb-2">Sentiment</div>
          <Badge className="bg-[oklch(0.82_0.2_150_/_0.2)] text-[oklch(0.82_0.2_150)] border-[oklch(0.82_0.2_150_/_0.5)]" variant="outline">{active.sentiment}</Badge>
        </GlowCard>
      </div>
    </div>
  );
}

// =============== Properties ===============
export function PropertiesSection() {
  const { properties, toggleFavorite, addProperty, updateProperty, leads, pushActivity } = useDashboard();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);

  const [form, setForm] = useState({ title: "", country: "", city: "", price: "", type: "Apartment", image: "🏙️" });
  const [editForm, setEditForm] = useState({ title: "", price: "", city: "" });

  const filtered = properties.filter(p => !q || p.title.toLowerCase().includes(q.toLowerCase()) || p.city.toLowerCase().includes(q.toLowerCase()));
  const sel = properties.find(p => p.id === open);
  const editProp = properties.find(p => p.id === editId);
  const shareProp = properties.find(p => p.id === shareId);
  const matchProp = properties.find(p => p.id === matchId);
  const matchingLeads = (target: typeof sel) => target ? leads.filter(l => l.propertyType === target.type).slice(0, 5) : [];

  const submitAdd = () => {
    if (!form.title.trim() || !form.city.trim() || !form.price.trim()) { toast.error("Title, city, price required"); return; }
    addProperty({ id: Math.random().toString(36).slice(2), title: form.title, country: form.country || "—", city: form.city, price: form.price, type: form.type, roi: 80, yield: 5, appreciation: 10, image: form.image });
    toast.success("Property added");
    setAddOpen(false);
    setForm({ title: "", country: "", city: "", price: "", type: "Apartment", image: "🏙️" });
  };
  const openEdit = (id: string) => { const p = properties.find(x => x.id === id)!; setEditForm({ title: p.title, price: p.price, city: p.city }); setEditId(id); };
  const submitEdit = () => {
    if (!editId) return;
    updateProperty(editId, editForm);
    pushActivity(`Property updated: ${editForm.title}`, "sparkles", "property");
    toast.success("Property updated");
    setEditId(null);
  };
  const copyShare = (p: NonNullable<typeof sel>) => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${p.id}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    pushActivity(`Property shared: ${p.title}`, "sparkles", "property");
    toast.success("Share link copied", { description: url });
  };

  return (
    <div>
      <SectionHeader title="Global Properties" subtitle="Multi-market inventory with predictive ROI">
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search properties…" className="w-56 bg-input/40" />
        <Button onClick={() => setAddOpen(true)} className="neon-border bg-primary/90"><Plus className="h-4 w-4" /> Add Property</Button>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(p => (
          <GlowCard key={p.id}>
            <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 via-[oklch(0.7_0.25_300_/_0.2)] to-[oklch(0.85_0.18_200_/_0.2)] flex items-center justify-center text-6xl mb-3 grid-bg">{p.image}</div>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> {p.city}, {p.country}</div>
              </div>
              <button onClick={() => { toggleFavorite(p.id); toast(p.favorite ? "Removed from favorites" : "Added to favorites"); }} aria-label="Favorite"><Heart className={`h-4 w-4 ${p.favorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`} /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <Mini label="Price" value={p.price} />
              <Mini label="ROI" value={`${p.roi}`} />
              <Mini label="Yield" value={`${p.yield}%`} />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setOpen(p.id)}>View</Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(p.id)}><Edit className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => setShareId(p.id)}><Share2 className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={() => setMatchId(p.id)}>Match</Button>
            </div>
          </GlowCard>
        ))}
      </div>

      {/* View Details */}
      <Dialog open={!!sel} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {sel && (
            <>
              <DialogHeader><DialogTitle>{sel.title}</DialogTitle></DialogHeader>
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/20 to-[oklch(0.7_0.25_300_/_0.2)] flex items-center justify-center text-8xl grid-bg">{sel.image}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Mini label="Price" value={sel.price} />
                <Mini label="ROI Score" value={`${sel.roi}`} />
                <Mini label="Rental Yield" value={`${sel.yield}%`} />
                <Mini label="Appreciation" value={`${sel.appreciation}%/yr`} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Matching Leads</div>
                {matchingLeads(sel).length === 0 ? <p className="text-sm text-muted-foreground">No matches yet.</p> : matchingLeads(sel).map(l => (
                  <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/30">
                    <Avatar className="h-7 w-7"><AvatarFallback className="text-xs">{l.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                    <div className="flex-1"><div className="text-sm">{l.name}</div><div className="text-xs text-muted-foreground">{l.budget}</div></div>
                    <Badge variant="outline">AI {l.aiScore}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="outline" onClick={() => { setShareId(sel.id); setOpen(null); }}><Share2 className="h-4 w-4" /> Share</Button>
                <Button variant="outline" onClick={() => { openEdit(sel.id); setOpen(null); }}><Edit className="h-4 w-4" /> Edit</Button>
                <Button onClick={() => { setMatchId(sel.id); setOpen(null); }}>Match Leads</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editProp} onOpenChange={o => !o && setEditId(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>Edit Property</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" className="bg-input/40" />
            <Input value={editForm.city} onChange={e => setEditForm({ ...editForm, city: e.target.value })} placeholder="City" className="bg-input/40" />
            <Input value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price" className="bg-input/40" />
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setEditId(null)}>Cancel</Button><Button onClick={submitEdit}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={!!shareProp} onOpenChange={o => !o && setShareId(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>Share Property</DialogTitle></DialogHeader>
          {shareProp && (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">Share <span className="text-foreground font-medium">{shareProp.title}</span> via:</div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => copyShare(shareProp)}>Copy Link</Button>
                <Button variant="outline" onClick={() => { window.open(`https://wa.me/?text=${encodeURIComponent(shareProp.title + " — " + shareProp.price)}`, "_blank"); pushActivity(`Property shared on WhatsApp: ${shareProp.title}`, "sparkles"); }}>WhatsApp</Button>
                <Button variant="outline" onClick={() => { window.open(`mailto:?subject=${encodeURIComponent(shareProp.title)}&body=${encodeURIComponent(shareProp.price + " — " + shareProp.city)}`, "_blank"); pushActivity(`Property shared by email: ${shareProp.title}`, "sparkles"); }}>Email</Button>
                <Button variant="outline" onClick={() => copyShare(shareProp)}>Telegram</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Leads */}
      <Dialog open={!!matchProp} onOpenChange={o => !o && setMatchId(null)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>Lead Matches — {matchProp?.title}</DialogTitle></DialogHeader>
          {matchProp && (matchingLeads(matchProp).length === 0
            ? <p className="text-sm text-muted-foreground">No matching leads found for this property type.</p>
            : <div className="space-y-2">{matchingLeads(matchProp).map(l => (
                <div key={l.id} className="flex items-center gap-3 p-2 glass rounded-lg">
                  <Avatar className="h-8 w-8"><AvatarFallback className="text-xs bg-primary/20">{l.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
                  <div className="flex-1 min-w-0"><div className="text-sm truncate">{l.name}</div><div className="text-xs text-muted-foreground">{l.budget} • {l.city}</div></div>
                  <Badge variant="outline">AI {l.aiScore}</Badge>
                  <Button size="sm" onClick={() => { pushActivity(`Lead ${l.name} matched to ${matchProp.title}`, "user-check"); toast.success("Match initiated"); }}>Push</Button>
                </div>
              ))}</div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>Add Property</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Title" className="bg-input/40" />
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} placeholder="Country" className="bg-input/40" />
              <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="City" className="bg-input/40" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price (e.g. $2.4M)" className="bg-input/40" />
              <Input value={form.image} onChange={e => setForm({ ...form, image: e.target.value })} placeholder="Emoji" className="bg-input/40" />
            </div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={submitAdd}>Add</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============== Appointments ===============
export function AppointmentsSection() {
  const { appointments, addAppointment, updateAppointment, pushActivity } = useDashboard();
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");
  const [rNotes, setRNotes] = useState("");

  const statusBadge = (s: string) =>
    s === "Confirmed" ? "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]"
    : s === "Pending" ? "border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]"
    : s === "Rescheduled" ? "border-[oklch(0.7_0.25_300_/_0.5)] text-[oklch(0.78_0.22_300)]"
    : "border-destructive/40 text-destructive";

  const open = (id: string) => {
    const a = appointments.find(x => x.id === id);
    setReschedId(id); setRDate(a?.date ?? ""); setRTime(a?.time ?? ""); setRNotes(a?.notes ?? "");
  };
  const submitReschedule = () => {
    if (!reschedId) return;
    if (!rDate.trim() || !rTime.trim()) { toast.error("Date and time required"); return; }
    updateAppointment(reschedId, { date: rDate, time: rTime, notes: rNotes, status: "Rescheduled" });
    pushActivity(`Appointment rescheduled to ${rDate} ${rTime}`, "calendar", "visit");
    toast.success("Appointment rescheduled");
    setReschedId(null);
  };

  return (
    <div>
      <SectionHeader title="Appointments" subtitle="Site visits and broker scheduling">
        <Button onClick={() => { addAppointment({ id: Math.random().toString(36).slice(2), leadName: "New Lead", property: "TBD", date: "May 20, 2026", time: "3:00 PM", status: "Pending" }); toast.success("Appointment created"); }} className="neon-border bg-primary/90"><Plus className="h-4 w-4" /> New</Button>
      </SectionHeader>
      <div className="grid gap-3">
        {appointments.map(a => (
          <GlowCard key={a.id}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center"><CalIcon className="h-5 w-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{a.leadName} <span className="text-muted-foreground">→</span> {a.property}</div>
                <div className="text-sm text-muted-foreground">{a.date} • {a.time}{a.broker ? ` • ${a.broker}` : ""}{a.notes ? ` • ${a.notes}` : ""}</div>
              </div>
              <Badge variant="outline" className={statusBadge(a.status)}>{a.status}</Badge>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" disabled={a.status === "Confirmed"} onClick={() => { updateAppointment(a.id, { status: "Confirmed" }); pushActivity(`Visit confirmed: ${a.leadName}`, "calendar", "visit"); toast.success("Visit confirmed"); }}>Confirm</Button>
                <Button size="sm" variant="outline" onClick={() => open(a.id)}>Reschedule</Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={a.status === "Cancelled"} onClick={() => { updateAppointment(a.id, { status: "Cancelled" }); pushActivity(`Appointment cancelled: ${a.leadName}`, "calendar", "visit"); toast.error("Appointment cancelled"); }}>Cancel</Button>
              </div>
            </div>
          </GlowCard>
        ))}
      </div>

      <Dialog open={!!reschedId} onOpenChange={o => !o && setReschedId(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>Reschedule Appointment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">New date</div><Input value={rDate} onChange={e => setRDate(e.target.value)} placeholder="May 22, 2026" className="bg-input/40" /></div>
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">New time</div><Input value={rTime} onChange={e => setRTime(e.target.value)} placeholder="3:00 PM" className="bg-input/40" /></div>
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div><Input value={rNotes} onChange={e => setRNotes(e.target.value)} placeholder="Reason / context" className="bg-input/40" /></div>
            <div className="flex justify-end gap-2"><Button variant="ghost" onClick={() => setReschedId(null)}>Cancel</Button><Button onClick={submitReschedule}>Save</Button></div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============== AI Agents ===============
const AGENTS = [
  { name: "Lead Qualification Agent", desc: "Scores incoming leads with multi-signal AI", tasks: 1284 },
  { name: "Follow-up Agent", desc: "Sends personalized cross-channel follow-ups", tasks: 942 },
  { name: "Appointment Agent", desc: "Auto-books and confirms site visits", tasks: 318 },
  { name: "Investor Advisor Agent", desc: "Generates ROI decks and market briefings", tasks: 217 },
  { name: "Trust Verification Agent", desc: "Validates ownership and detects fraud", tasks: 488 },
  { name: "Global Market Intelligence Agent", desc: "Monitors 60+ city markets in realtime", tasks: 1023 },
];

export function AIAgentsSection() {
  const [states, setStates] = useState(AGENTS.map(() => ({ active: true, running: false })));
  return (
    <div>
      <SectionHeader title="AI Agent Control Center" subtitle="Autonomous agents working across your operation" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {AGENTS.map((a, i) => (
          <GlowCard key={a.name}>
            <div className="flex items-start justify-between">
              <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div>
              <Switch checked={states[i].active} onCheckedChange={v => { setStates(s => s.map((x, j) => j === i ? { ...x, active: v } : x)); toast(v ? "Agent activated" : "Agent paused"); }} />
            </div>
            <div className="mt-3 font-semibold">{a.name}</div>
            <p className="text-sm text-muted-foreground">{a.desc}</p>
            <div className="flex items-center justify-between mt-3 text-xs">
              <span className="text-muted-foreground">Completed: <span className="text-foreground font-medium">{a.tasks.toLocaleString()}</span></span>
              <span className={`flex items-center gap-1.5 ${states[i].active ? "text-[oklch(0.82_0.2_150)]" : "text-muted-foreground"}`}><span className={states[i].active ? "pulse-dot" : "h-2 w-2 rounded-full bg-muted"} /> {states[i].active ? "Live" : "Paused"}</span>
            </div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => toast("Logs opened")}>Logs</Button>
              <Button size="sm" variant="outline" disabled={states[i].running} onClick={() => { setStates(s => s.map((x,j)=> j===i?{...x,running:true}:x)); setTimeout(() => { setStates(s => s.map((x,j)=> j===i?{...x,running:false}:x)); toast.success(`${a.name}: test task complete`); }, 1200); }}>
                {states[i].running ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Running</> : "Run Test"}
              </Button>
            </div>
          </GlowCard>
        ))}
      </div>
    </div>
  );
}

// =============== Property Trust & Risk Verification Engine ===============
export { TrustSection } from "./TrustEngineSection";

// =============== Revenue Analytics ===============
export function RevenueSection() {
  const [period, setPeriod] = useState("90d");
  const data = Array.from({ length: 12 }, (_, i) => ({ m: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i], rev: 600 + Math.sin(i * 0.6) * 200 + i * 80, deals: 12 + Math.cos(i * 0.5) * 5 + i * 1.2 }));
  const funnel = [{ s: "Leads", v: 1200 }, { s: "Qualified", v: 720 }, { s: "Site Visits", v: 380 }, { s: "Offers", v: 165 }, { s: "Closed", v: 92 }];
  const brokerData = SEED_BROKERS.map(b => ({ name: b.name.split(" ")[0], rev: b.revenue, conv: b.conversion }));
  return (
    <div>
      <SectionHeader title="Revenue Analytics" subtitle="Global currency view · multi-market">
        <select value={period} onChange={e => setPeriod(e.target.value)} className="bg-input/40 border border-border rounded-md px-3 py-1.5 text-sm">
          <option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="12m">Last 12 months</option>
        </select>
      </SectionHeader>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GlowCard>
          <h3 className="font-semibold mb-3">Monthly Revenue ($K)</h3>
          <div className="h-72"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" /><XAxis dataKey="m" stroke="oklch(0.7 0.03 255)" fontSize={11} /><YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} /><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Line dataKey="rev" stroke="var(--neon)" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
        </GlowCard>
        <GlowCard>
          <h3 className="font-semibold mb-3">Lead → Deal Funnel</h3>
          <div className="h-72"><ResponsiveContainer><BarChart data={funnel} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" /><XAxis type="number" stroke="oklch(0.7 0.03 255)" fontSize={11} /><YAxis dataKey="s" type="category" stroke="oklch(0.7 0.03 255)" fontSize={11} width={80} /><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Bar dataKey="v" fill="var(--neon)" radius={6} /></BarChart></ResponsiveContainer></div>
        </GlowCard>
        <GlowCard>
          <h3 className="font-semibold mb-3">Broker Performance ($M closed)</h3>
          <div className="h-72"><ResponsiveContainer><BarChart data={brokerData}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" /><XAxis dataKey="name" stroke="oklch(0.7 0.03 255)" fontSize={11} /><YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} /><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Bar dataKey="rev" fill="oklch(0.7 0.25 300)" radius={6} /></BarChart></ResponsiveContainer></div>
        </GlowCard>
        <GlowCard>
          <h3 className="font-semibold mb-3">AI Revenue Forecast</h3>
          <div className="h-72"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" /><XAxis dataKey="m" stroke="oklch(0.7 0.03 255)" fontSize={11} /><YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} /><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Legend /><Line dataKey="rev" name="Actual" stroke="var(--neon)" strokeWidth={2} /><Line dataKey="deals" name="Forecast" stroke="oklch(0.85 0.18 200)" strokeWidth={2} strokeDasharray="4 4" /></LineChart></ResponsiveContainer></div>
        </GlowCard>
      </div>
    </div>
  );
}

// =============== Brokers ===============
export function BrokersSection() {
  const [open, setOpen] = useState<string | null>(null);
  const sel = SEED_BROKERS.find(b => b.id === open);
  return (
    <div>
      <SectionHeader title="Broker Performance" subtitle="Global team leaderboard" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {SEED_BROKERS.map(b => (
          <GlowCard key={b.id} onClick={() => setOpen(b.id)}>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 ring-2 ring-primary/30"><AvatarFallback className="bg-primary/30 font-semibold">{b.name.split(" ").map(n=>n[0]).join("")}</AvatarFallback></Avatar>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{b.name}</div>
                <div className="text-xs text-muted-foreground">{b.region}</div>
              </div>
              <Badge variant="outline" className="border-primary/40 text-primary">#{b.rank}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
              <Mini label="Leads" value={String(b.leads)} />
              <Mini label="Response" value={b.response} />
              <Mini label="Conv. %" value={`${b.conversion}%`} />
              <Mini label="Revenue" value={`$${b.revenue}M`} />
            </div>
          </GlowCard>
        ))}
      </div>
      <Dialog open={!!sel} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="glass-strong max-w-md">
          {sel && <><DialogHeader><DialogTitle>{sel.name}</DialogTitle></DialogHeader><div className="text-sm text-muted-foreground">Region: {sel.region}</div><div className="grid grid-cols-2 gap-2 mt-3"><Mini label="Leads handled" value={String(sel.leads)} /><Mini label="Avg response" value={sel.response} /><Mini label="Conversion" value={`${sel.conversion}%`} /><Mini label="Revenue closed" value={`$${sel.revenue}M`} /></div></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============== Investor Intelligence (InvestorIntelligenceSection.tsx) ===============
export { InvestorSection } from "./InvestorIntelligenceSection";

// =============== Reports ===============
type ReportDef = { name: string; rows: Array<Record<string, string | number>>; insights: string[] };

function useReportData(): Record<string, ReportDef> {
  const { leads, appointments, properties } = useDashboard();
  return {
    "Lead Report": {
      name: "Lead Report",
      rows: leads.map(l => ({ Name: l.name, Country: l.country, City: l.city, Budget: l.budget, AIScore: l.aiScore, Urgency: l.urgency, Source: l.source })),
      insights: ["Hot leads represent 38% of pipeline value", "Critical-urgency leads need contact within 4 hours", "Investor segment yields 2.4x higher conversion"],
    },
    "Revenue Report": {
      name: "Revenue Report",
      rows: SEED_BROKERS.map(b => ({ Broker: b.name, Region: b.region, RevenueM: b.revenue, Conversion: b.conversion, Leads: b.leads })),
      insights: ["Middle East leads global revenue contribution", "Quarter-end push expected to add $2.4M", "Top performer Layla Hassan drives 28% of regional GMV"],
    },
    "Broker Report": {
      name: "Broker Report",
      rows: SEED_BROKERS.map(b => ({ Name: b.name, Rank: b.rank, Region: b.region, Response: b.response, Conv: `${b.conversion}%`, Revenue: `$${b.revenue}M` })),
      insights: ["Avg response time across team: 3.05 min", "Top 2 brokers handle 41% of pipeline"],
    },
    "AI Forecast Report": {
      name: "AI Forecast Report",
      rows: [{ Period: "Next 30d", Revenue: "$2.4M", Confidence: "87%" }, { Period: "Next 90d", Revenue: "$8.4M", Confidence: "82%" }, { Period: "Next 180d", Revenue: "$16.1M", Confidence: "74%" }],
      insights: ["Confidence decays beyond 90 days", "Demand index trending +24% MoM", "Risk: rate volatility in EU markets"],
    },
    "Trust Verification Report": {
      name: "Trust Verification Report",
      rows: [{ Check: "Ownership", Verified: "98%" }, { Check: "Builder reputation", Verified: "92%" }, { Check: "Fraud signals", Flagged: "4%" }, { Check: "Cross-border risk", Flagged: "18%" }],
      insights: ["Ownership verification at all-time high", "Cross-border risk slightly elevated — review KYC threshold"],
    },
    "Property Report": {
      name: "Property Report",
      rows: properties.map(p => ({ Title: p.title, City: p.city, Price: p.price, ROI: p.roi, Yield: `${p.yield}%`, Appreciation: `${p.appreciation}%` })),
      insights: ["Marina Skyline tops ROI chart at 92", "Avg appreciation across luxury inventory: 11.5%"],
    },
    "Appointment Report": {
      name: "Appointment Report",
      rows: appointments.map(a => ({ Lead: a.leadName, Property: a.property, Date: a.date, Time: a.time, Status: a.status, Broker: a.broker ?? "—" })),
      insights: ["Confirmed-to-attended ratio: 88%", "Pending visits aging beyond 48h: review"],
    },
  };
}

function downloadCsv(name: string, rows: Array<Record<string, string | number>>) {
  if (!rows.length) { toast.error("No data to export"); return; }
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = [headers.join(","), ...rows.map(r => headers.map(h => escape(r[h])).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${name.replace(/\s+/g, "_")}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export function ReportsSection() {
  const reports = useReportData();
  const { pushActivity } = useDashboard();
  const [open, setOpen] = useState<string | null>(null);
  const [tab, setTab] = useState("overview");
  const [refreshKey, setRefreshKey] = useState(0);
  const sel = open ? reports[open] : null;

  return (
    <div>
      <SectionHeader title="Reports" subtitle="Export-ready insights · CSV / PDF" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.keys(reports).map(r => (
          <GlowCard key={r}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center"><FileText className="h-5 w-5 text-primary" /></div>
              <div className="font-semibold flex-1">{r}</div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">Aggregated insights with AI commentary and trends.</p>
            <div className="flex gap-2 mt-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => { setOpen(r); setTab("overview"); }}>View</Button>
              <Button size="sm" variant="outline" onClick={() => { downloadCsv(r, reports[r].rows); pushActivity(`Report downloaded: ${r}`, "sparkles", "report"); toast.success(`${r}.csv downloaded`); }}><Download className="h-3.5 w-3.5" /> CSV</Button>
              <Button size="sm" variant="outline" onClick={() => { window.print(); }}>PDF</Button>
              <Button size="sm" variant="ghost" onClick={() => { setRefreshKey(k => k + 1); toast.success("Report refreshed"); }}>↻</Button>
            </div>
          </GlowCard>
        ))}
      </div>

      <Dialog open={!!sel} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {sel && (
            <>
              <DialogHeader><DialogTitle>{sel.name}</DialogTitle></DialogHeader>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="glass">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="data">Data Table</TabsTrigger>
                  <TabsTrigger value="charts">Charts</TabsTrigger>
                  <TabsTrigger value="ai">AI Insights</TabsTrigger>
                  <TabsTrigger value="recs">Recommendations</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" key={refreshKey}>
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <Mini label="Rows" value={String(sel.rows.length)} />
                    <Mini label="Insights" value={String(sel.insights.length)} />
                    <Mini label="Generated" value="just now" />
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{sel.insights[0]}</p>
                </TabsContent>
                <TabsContent value="data">
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-sm">
                      <thead><tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border/40">{Object.keys(sel.rows[0] ?? {}).map(h => <th key={h} className="py-2 pr-3">{h}</th>)}</tr></thead>
                      <tbody>{sel.rows.slice(0, 12).map((r, i) => <tr key={i} className="border-b border-border/20">{Object.values(r).map((v, j) => <td key={j} className="py-2 pr-3">{String(v)}</td>)}</tr>)}</tbody>
                    </table>
                  </div>
                </TabsContent>
                <TabsContent value="charts">
                  <div className="h-64 mt-3"><ResponsiveContainer><BarChart data={sel.rows.slice(0, 8).map((r, i) => ({ name: String(Object.values(r)[0]).slice(0, 10), v: Number(Object.values(r).find(x => typeof x === "number")) || (i + 1) * 10 }))}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" /><XAxis dataKey="name" stroke="oklch(0.7 0.03 255)" fontSize={11} /><YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} /><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Bar dataKey="v" fill="var(--neon)" radius={6} /></BarChart></ResponsiveContainer></div>
                </TabsContent>
                <TabsContent value="ai">
                  <ul className="space-y-2 mt-3">{sel.insights.map((s, i) => <li key={i} className="glass rounded-lg p-3 text-sm flex gap-2"><Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" /> {s}</li>)}</ul>
                </TabsContent>
                <TabsContent value="recs">
                  <div className="space-y-2 mt-3">
                    <div className="glass rounded-lg p-3 text-sm">→ Schedule executive review with top performers</div>
                    <div className="glass rounded-lg p-3 text-sm">→ Increase outbound capacity by 18% in next 30 days</div>
                    <div className="glass rounded-lg p-3 text-sm">→ Re-target dormant high-AI-score leads via WhatsApp</div>
                  </div>
                </TabsContent>
              </Tabs>
              <div className="flex gap-2 justify-end pt-3"><Button variant="outline" onClick={() => downloadCsv(sel.name, sel.rows)}><Download className="h-4 w-4" /> CSV</Button></div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============== Settings ===============
type IntegrationName =
  | "Supabase"
  | "n8n"
  | "OpenAI"
  | "WhatsApp API"
  | "Google Maps"
  | "Stripe"
  | "Zapier"
  | "SMTP Email"
  | "Twilio"
  | "Slack";

type IntegrationItem = {
  name: IntegrationName;
  status: "Connected" | "Disconnected" | "Needs Attention";
  apiHealth: "Healthy" | "Degraded" | "Down";
  lastSynced: string;
};

type SupabaseConfig = {
  projectUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  databaseStatus: "Online" | "Offline";
  realtimeStatus: "Connected" | "Disconnected";
};

type N8nConfig = {
  webhookUrl: string;
  apiKey: string;
  workflowStatus: "Active" | "Paused";
};

const INTEGRATION_SEED: IntegrationItem[] = [
  { name: "Supabase", status: "Connected", apiHealth: "Healthy", lastSynced: "2m ago" },
  { name: "n8n", status: "Needs Attention", apiHealth: "Degraded", lastSynced: "12m ago" },
  { name: "OpenAI", status: "Connected", apiHealth: "Healthy", lastSynced: "1m ago" },
  { name: "WhatsApp API", status: "Disconnected", apiHealth: "Down", lastSynced: "never" },
  { name: "Google Maps", status: "Connected", apiHealth: "Healthy", lastSynced: "3m ago" },
  { name: "Stripe", status: "Connected", apiHealth: "Healthy", lastSynced: "4m ago" },
  { name: "Zapier", status: "Connected", apiHealth: "Healthy", lastSynced: "6m ago" },
  { name: "SMTP Email", status: "Needs Attention", apiHealth: "Degraded", lastSynced: "15m ago" },
  { name: "Twilio", status: "Disconnected", apiHealth: "Down", lastSynced: "never" },
  { name: "Slack", status: "Connected", apiHealth: "Healthy", lastSynced: "5m ago" },
];

type SettingsState = {
  team: { invite: string; defaultRole: "Admin" | "Manager" | "Broker" | "Analyst" | "Viewer" };
  integrations: { whatsapp: boolean; slack: boolean; hubspot: boolean; zapier: boolean };
  security: { mfa: boolean; sessionTimeout: string; ipAllowlist: string };
  notifications: { email: boolean; push: boolean; weeklyDigest: boolean };
  prefs: { country: string; currency: string; locale: string };
  ai: { creativity: number; tone: "Formal" | "Friendly" | "Direct"; autoReply: boolean };
  workflow: { autoAssign: boolean; followUpHours: number; coldThresholdDays: number };
  roles: { canExport: boolean; canDeleteLeads: boolean; canEditBilling: boolean };
  branding: { brandName: string; primaryColor: string; logoUrl: string };
  data: { retentionDays: number; autoBackup: boolean; backupFreq: "Daily" | "Weekly" | "Monthly" };
};

const DEFAULT_SETTINGS: SettingsState = {
  team: { invite: "", defaultRole: "Broker" },
  integrations: { whatsapp: true, slack: false, hubspot: true, zapier: false },
  security: { mfa: true, sessionTimeout: "30 min", ipAllowlist: "" },
  notifications: { email: true, push: true, weeklyDigest: true },
  prefs: { country: "India", currency: "INR", locale: "en-IN" },
  ai: { creativity: 60, tone: "Friendly", autoReply: true },
  workflow: { autoAssign: true, followUpHours: 4, coldThresholdDays: 2 },
  roles: { canExport: true, canDeleteLeads: false, canEditBilling: false },
  branding: { brandName: "RealEstateOS", primaryColor: "#22d3ee", logoUrl: "" },
  data: { retentionDays: 365, autoBackup: true, backupFreq: "Daily" },
};

export function SettingsSection() {
  const { user, updateUserProfile, pushActivity } = useDashboard();
  const [s, setS] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [profileDraft, setProfileDraft] = useState({ name: user.name, role: user.role, email: user.email, company: user.company, avatar: user.avatar });
  const [profileDirty, setProfileDirty] = useState(false);
  const [integrationItems, setIntegrationItems] = useState<IntegrationItem[]>(INTEGRATION_SEED);
  const [supabaseOpen, setSupabaseOpen] = useState(false);
  const [n8nOpen, setN8nOpen] = useState(false);
  const [genericOpen, setGenericOpen] = useState<IntegrationName | null>(null);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [supabaseCfg, setSupabaseCfg] = useState<SupabaseConfig>({
    projectUrl: "https://demo-project.supabase.co",
    anonKey: "eyJ...anon-demo",
    serviceRoleKey: "eyJ...service-role-demo",
    databaseStatus: "Online",
    realtimeStatus: "Connected",
  });
  const [n8nCfg, setN8nCfg] = useState<N8nConfig>({
    webhookUrl: "https://n8n.example.com/webhook/lead-sync",
    apiKey: "n8n_demo_key",
    workflowStatus: "Active",
  });

  useEffect(() => {
    setProfileDraft({ name: user.name, role: user.role, email: user.email, company: user.company, avatar: user.avatar });
    setProfileDirty(false);
  }, [user]);

  const upd = <K extends keyof SettingsState>(k: K, patch: Partial<SettingsState[K]>) => {
    setS(prev => ({ ...prev, [k]: { ...prev[k], ...patch } }));
    setDirty(d => ({ ...d, [k]: true }));
  };
  const save = (k: keyof SettingsState) => {
    setDirty(d => ({ ...d, [k]: false }));
    toast.success("Saved", { description: `${String(k)} updated` });
  };
  const reset = (k: keyof SettingsState) => {
    setS(prev => ({ ...prev, [k]: DEFAULT_SETTINGS[k] }));
    setDirty(d => ({ ...d, [k]: false }));
    toast("Reset to defaults");
  };
  const TabSaveBar = ({ k }: { k: keyof SettingsState }) => (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
      {dirty[k] ? <Badge variant="outline" className="border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]">Unsaved changes</Badge> : <span className="text-xs text-muted-foreground">All changes saved</span>}
      <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => reset(k)}>Reset</Button><Button size="sm" onClick={() => save(k)}>Save</Button></div>
    </div>
  );
  const saveProfile = () => {
    if (!profileDraft.email.includes("@")) { toast.error("Invalid email"); return; }
    updateUserProfile(profileDraft);
    setProfileDirty(false);
    pushActivity(`Profile updated from settings: ${profileDraft.name}`, "user", "profile");
  };
  const resetProfile = () => {
    setProfileDraft({ name: user.name, role: user.role, email: user.email, company: user.company, avatar: user.avatar });
    setProfileDirty(false);
    toast("Profile reset");
  };

  const ProfileSaveBar = () => (
    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
      {profileDirty ? <Badge variant="outline" className="border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]">Unsaved changes</Badge> : <span className="text-xs text-muted-foreground">All changes saved</span>}
      <div className="flex gap-2"><Button variant="ghost" size="sm" onClick={resetProfile}>Reset</Button><Button size="sm" onClick={saveProfile}>Save</Button></div>
    </div>
  );

  const updateIntegration = (name: IntegrationName, patch: Partial<IntegrationItem>) => {
    setIntegrationItems(prev => prev.map(item => item.name === name ? { ...item, ...patch } : item));
  };

  const runIntegrationAction = (key: string, onDone: () => void) => {
    setLoadingAction(key);
    setTimeout(() => {
      setLoadingAction(null);
      onDone();
    }, 900);
  };

  const reconnectIntegration = (name: IntegrationName) => {
    runIntegrationAction(`reconnect-${name}`, () => {
      const failed = Math.random() < 0.15;
      if (failed) {
        updateIntegration(name, { status: "Needs Attention", apiHealth: "Degraded", lastSynced: "just now" });
        toast.error(`${name} reconnect failed`);
        pushActivity(`${name} reconnect failed`, "alert-triangle", "integration");
        return;
      }
      updateIntegration(name, { status: "Connected", apiHealth: "Healthy", lastSynced: "just now" });
      toast.success(`${name} reconnected`);
      pushActivity(`${name} reconnected`, "sparkles", "integration");
    });
  };

  const disconnectIntegration = (name: IntegrationName) => {
    runIntegrationAction(`disconnect-${name}`, () => {
      updateIntegration(name, { status: "Disconnected", apiHealth: "Down", lastSynced: "just now" });
      toast(`${name} disconnected`);
      pushActivity(`${name} disconnected`, "x-circle", "integration");
    });
  };

  const saveSupabase = () => {
    runIntegrationAction("supabase-save", () => {
      updateIntegration("Supabase", { status: "Connected", apiHealth: "Healthy", lastSynced: "just now" });
      toast.success("Supabase configuration saved");
      pushActivity("Supabase connection saved", "database", "integration");
    });
  };

  const testSupabase = () => {
    runIntegrationAction("supabase-test", () => {
      const ok = supabaseCfg.projectUrl.includes("http") && supabaseCfg.anonKey.length > 6;
      if (!ok) {
        setSupabaseCfg(prev => ({ ...prev, databaseStatus: "Offline", realtimeStatus: "Disconnected" }));
        updateIntegration("Supabase", { status: "Needs Attention", apiHealth: "Degraded", lastSynced: "just now" });
        toast.error("Supabase test failed");
        pushActivity("Supabase test failed", "alert-triangle", "integration");
        return;
      }
      setSupabaseCfg(prev => ({ ...prev, databaseStatus: "Online", realtimeStatus: "Connected" }));
      updateIntegration("Supabase", { status: "Connected", apiHealth: "Healthy", lastSynced: "just now" });
      toast.success("Supabase test passed");
      pushActivity("Supabase test connection passed", "database", "integration");
    });
  };

  const saveN8n = () => {
    runIntegrationAction("n8n-save", () => {
      updateIntegration("n8n", { status: "Connected", apiHealth: "Healthy", lastSynced: "just now" });
      toast.success("n8n connection saved");
      pushActivity("n8n connection saved", "bot", "integration");
    });
  };

  const testN8n = () => {
    runIntegrationAction("n8n-test", () => {
      const ok = n8nCfg.webhookUrl.startsWith("http") && n8nCfg.apiKey.length > 4;
      if (!ok) {
        updateIntegration("n8n", { status: "Needs Attention", apiHealth: "Degraded", lastSynced: "just now" });
        toast.error("n8n workflow test failed");
        pushActivity("n8n workflow test failed", "alert-triangle", "integration");
        return;
      }
      updateIntegration("n8n", { status: "Connected", apiHealth: "Healthy", lastSynced: "just now" });
      toast.success("n8n workflow test passed");
      pushActivity("n8n workflow test passed", "bot", "integration");
    });
  };

  const triggerN8nAutomation = () => {
    runIntegrationAction("n8n-trigger", () => {
      toast.success("Sample automation triggered");
      pushActivity("n8n sample automation triggered", "sparkles", "integration");
      updateIntegration("n8n", { lastSynced: "just now" });
    });
  };

  const openConfigure = (name: IntegrationName) => {
    if (name === "Supabase") {
      setSupabaseOpen(true);
    } else if (name === "n8n") {
      setN8nOpen(true);
    } else {
      setGenericOpen(name);
      pushActivity(`${name} configuration opened`, "settings", "integration");
    }
  };

  const healthClass = (health: IntegrationItem["apiHealth"]) =>
    health === "Healthy"
      ? "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]"
      : health === "Degraded"
      ? "border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]"
      : "border-destructive/40 text-destructive";

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Account, team, security, AI, workflow, branding & data" />
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="glass flex-wrap h-auto">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="prefs">Country & Currency</TabsTrigger>
          <TabsTrigger value="ai">AI Config</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="data">Data & Backups</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <GlowCard>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-2 ring-primary/40"><AvatarFallback className="bg-gradient-to-br from-primary/40 to-[oklch(0.7_0.25_300_/_0.4)] text-lg font-semibold">{profileDraft.avatar}</AvatarFallback></Avatar>
              <div><div className="text-lg font-semibold">{profileDraft.name}</div><div className="text-sm text-muted-foreground">{profileDraft.role}</div></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              <Field label="Full Name" value={profileDraft.name} onChange={v => { setProfileDraft(prev => ({ ...prev, name: v })); setProfileDirty(true); }} />
              <Field label="Role" value={profileDraft.role} onChange={v => { setProfileDraft(prev => ({ ...prev, role: v })); setProfileDirty(true); }} />
              <Field label="Email" value={profileDraft.email} onChange={v => { setProfileDraft(prev => ({ ...prev, email: v })); setProfileDirty(true); }} />
              <Field label="Company" value={profileDraft.company} onChange={v => { setProfileDraft(prev => ({ ...prev, company: v })); setProfileDirty(true); }} />
              <Field label="Avatar Initials" value={profileDraft.avatar} onChange={v => { setProfileDraft(prev => ({ ...prev, avatar: v.slice(0, 2).toUpperCase() })); setProfileDirty(true); }} />
            </div>
            <div className="mt-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Permissions</div>
              <div className="flex flex-wrap gap-2">
                {user.permissions.map(p => <Badge key={p} variant="outline">{p}</Badge>)}
              </div>
            </div>
            <ProfileSaveBar />
          </GlowCard>
        </TabsContent>

        <TabsContent value="team">
          <GlowCard>
            <h3 className="font-semibold mb-3">Invite teammates</h3>
            <div className="flex gap-2"><Input value={s.team.invite} onChange={e => upd("team", { invite: e.target.value })} placeholder="teammate@email.com" className="bg-input/40" /><Button onClick={() => { if (!s.team.invite.includes("@")) { toast.error("Invalid email"); return; } toast.success(`Invite sent to ${s.team.invite}`); upd("team", { invite: "" }); }}>Send Invite</Button></div>
            <div className="mt-4"><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Default role for new invites</div>
              <select value={s.team.defaultRole} onChange={e => upd("team", { defaultRole: e.target.value as SettingsState["team"]["defaultRole"] })} className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm w-full">{["Admin","Manager","Broker","Analyst","Viewer"].map(r => <option key={r}>{r}</option>)}</select>
            </div>
            <TabSaveBar k="team" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="integrations">
          <GlowCard>
            <h3 className="font-semibold mb-1">Services Integration Center</h3>
            <p className="text-xs text-muted-foreground mb-3">Monitor API health, reconnect quickly, and configure integrations.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {integrationItems.map(item => (
                <div key={item.name} className="glass rounded-lg p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{item.name}</div>
                      <div className="text-xs text-muted-foreground">Last synced: {item.lastSynced}</div>
                    </div>
                    <Badge variant="outline" className={healthClass(item.apiHealth)}>{item.apiHealth}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="outline">{item.status}</Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => openConfigure(item.name)}>Configure</Button>
                    <Button size="sm" variant="outline" disabled={loadingAction === `reconnect-${item.name}`} onClick={() => reconnectIntegration(item.name)}>
                      {loadingAction === `reconnect-${item.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reconnect"}
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive" disabled={loadingAction === `disconnect-${item.name}`} onClick={() => disconnectIntegration(item.name)}>
                      {loadingAction === `disconnect-${item.name}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Disconnect"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <TabSaveBar k="integrations" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="security">
          <GlowCard>
            <div className="flex items-center justify-between glass rounded-lg p-3"><div><div className="text-sm font-medium">Multi-factor authentication</div><div className="text-xs text-muted-foreground">Require 2FA for all admin actions</div></div><Switch checked={s.security.mfa} onCheckedChange={v => upd("security", { mfa: v })} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <Field label="Session timeout" value={s.security.sessionTimeout} onChange={v => upd("security", { sessionTimeout: v })} />
              <Field label="IP allowlist (comma-separated)" value={s.security.ipAllowlist} onChange={v => upd("security", { ipAllowlist: v })} />
            </div>
            <TabSaveBar k="security" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="billing">
          <BillingTabPanel />
        </TabsContent>

        <TabsContent value="notifications">
          <GlowCard>
            <div className="space-y-2">{(["email","push","weeklyDigest"] as const).map(key => (
              <div key={key} className="flex items-center justify-between glass rounded-lg p-3"><div className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</div><Switch checked={s.notifications[key]} onCheckedChange={v => upd("notifications", { [key]: v })} /></div>
            ))}</div>
            <TabSaveBar k="notifications" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="prefs">
          <GlowCard>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Country" value={s.prefs.country} onChange={v => upd("prefs", { country: v })} />
              <Field label="Currency" value={s.prefs.currency} onChange={v => upd("prefs", { currency: v })} />
              <Field label="Locale" value={s.prefs.locale} onChange={v => upd("prefs", { locale: v })} />
            </div>
            <TabSaveBar k="prefs" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="ai">
          <GlowCard>
            <div className="space-y-3">
              <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Creativity (0–100)</div><Input type="number" value={s.ai.creativity} onChange={e => upd("ai", { creativity: Number(e.target.value) })} className="bg-input/40" /></div>
              <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tone</div><select value={s.ai.tone} onChange={e => upd("ai", { tone: e.target.value as SettingsState["ai"]["tone"] })} className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm w-full">{["Formal","Friendly","Direct"].map(t => <option key={t}>{t}</option>)}</select></div>
              <div className="flex items-center justify-between glass rounded-lg p-3"><div className="text-sm">Auto-reply to inbound conversations</div><Switch checked={s.ai.autoReply} onCheckedChange={v => upd("ai", { autoReply: v })} /></div>
            </div>
            <TabSaveBar k="ai" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="workflow">
          <GlowCard>
            <div className="flex items-center justify-between glass rounded-lg p-3 mb-2"><div className="text-sm">Auto-assign new leads</div><Switch checked={s.workflow.autoAssign} onCheckedChange={v => upd("workflow", { autoAssign: v })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Follow-up SLA (hours)</div><Input type="number" value={s.workflow.followUpHours} onChange={e => upd("workflow", { followUpHours: Number(e.target.value) })} className="bg-input/40" /></div>
              <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Cold-lead threshold (days)</div><Input type="number" value={s.workflow.coldThresholdDays} onChange={e => upd("workflow", { coldThresholdDays: Number(e.target.value) })} className="bg-input/40" /></div>
            </div>
            <TabSaveBar k="workflow" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="roles">
          <GlowCard>
            <div className="space-y-2">{(["canExport","canDeleteLeads","canEditBilling"] as const).map(key => (
              <div key={key} className="flex items-center justify-between glass rounded-lg p-3"><div className="text-sm">{key.replace(/([A-Z])/g, " $1").replace("can ", "Can ")}</div><Switch checked={s.roles[key]} onCheckedChange={v => upd("roles", { [key]: v })} /></div>
            ))}</div>
            <TabSaveBar k="roles" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="branding">
          <GlowCard>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Brand name" value={s.branding.brandName} onChange={v => upd("branding", { brandName: v })} />
              <Field label="Primary color" value={s.branding.primaryColor} onChange={v => upd("branding", { primaryColor: v })} />
              <Field label="Logo URL" value={s.branding.logoUrl} onChange={v => upd("branding", { logoUrl: v })} />
            </div>
            <TabSaveBar k="branding" />
          </GlowCard>
        </TabsContent>

        <TabsContent value="data">
          <GlowCard>
            <div className="grid grid-cols-2 gap-3">
              <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Retention (days)</div><Input type="number" value={s.data.retentionDays} onChange={e => upd("data", { retentionDays: Number(e.target.value) })} className="bg-input/40" /></div>
              <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Backup frequency</div><select value={s.data.backupFreq} onChange={e => upd("data", { backupFreq: e.target.value as SettingsState["data"]["backupFreq"] })} className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm w-full">{["Daily","Weekly","Monthly"].map(f => <option key={f}>{f}</option>)}</select></div>
            </div>
            <div className="flex items-center justify-between glass rounded-lg p-3 mt-3"><div className="text-sm">Automatic backups</div><Switch checked={s.data.autoBackup} onCheckedChange={v => upd("data", { autoBackup: v })} /></div>
            <Button variant="outline" className="mt-3" onClick={() => toast.success("Backup started")}>Run Backup Now</Button>
            <TabSaveBar k="data" />
          </GlowCard>
        </TabsContent>
      </Tabs>

      <Dialog open={supabaseOpen} onOpenChange={setSupabaseOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>Supabase Configuration</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Project URL" value={supabaseCfg.projectUrl} onChange={v => setSupabaseCfg(prev => ({ ...prev, projectUrl: v }))} />
            <Field label="Anon Key" value={supabaseCfg.anonKey} onChange={v => setSupabaseCfg(prev => ({ ...prev, anonKey: v }))} />
            <Field label="Service Role Key" value={supabaseCfg.serviceRoleKey} onChange={v => setSupabaseCfg(prev => ({ ...prev, serviceRoleKey: v }))} />
            <div className="grid grid-cols-2 gap-2">
              <div className="glass rounded-md p-2"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Database Status</div><div className="text-sm">{supabaseCfg.databaseStatus}</div></div>
              <div className="glass rounded-md p-2"><div className="text-[10px] uppercase tracking-wider text-muted-foreground">Realtime Status</div><div className="text-sm">{supabaseCfg.realtimeStatus}</div></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" disabled={loadingAction === "supabase-test"} onClick={testSupabase}>{loadingAction === "supabase-test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test Connection"}</Button>
              <Button variant="outline" disabled={loadingAction === "reconnect-Supabase"} onClick={() => reconnectIntegration("Supabase")}>{loadingAction === "reconnect-Supabase" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Reconnect"}</Button>
              <Button disabled={loadingAction === "supabase-save"} onClick={saveSupabase}>{loadingAction === "supabase-save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={n8nOpen} onOpenChange={setN8nOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader><DialogTitle>n8n Configuration</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Field label="Webhook URL" value={n8nCfg.webhookUrl} onChange={v => setN8nCfg(prev => ({ ...prev, webhookUrl: v }))} />
            <Field label="API Key" value={n8nCfg.apiKey} onChange={v => setN8nCfg(prev => ({ ...prev, apiKey: v }))} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Workflow Status</div>
              <select value={n8nCfg.workflowStatus} onChange={e => setN8nCfg(prev => ({ ...prev, workflowStatus: e.target.value as N8nConfig["workflowStatus"] }))} className="bg-input/40 border border-border rounded-md px-3 py-2 text-sm w-full">
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" disabled={loadingAction === "n8n-test"} onClick={testN8n}>{loadingAction === "n8n-test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Test Workflow"}</Button>
              <Button variant="outline" disabled={loadingAction === "n8n-trigger"} onClick={triggerN8nAutomation}>{loadingAction === "n8n-trigger" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Trigger Sample Automation"}</Button>
              <Button disabled={loadingAction === "n8n-save"} onClick={saveN8n}>{loadingAction === "n8n-save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save Connection"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!genericOpen} onOpenChange={o => !o && setGenericOpen(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader><DialogTitle>{genericOpen} Configuration</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Mock configuration panel is active. Use reconnect/disconnect on the card to validate state and health updates.</p>
          <Button onClick={() => {
            if (!genericOpen) return;
            updateIntegration(genericOpen, { status: "Connected", apiHealth: "Healthy", lastSynced: "just now" });
            pushActivity(`${genericOpen} config saved`, "settings", "integration");
            toast.success(`${genericOpen} configuration saved`);
            setGenericOpen(null);
          }}>Save Configuration</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div><div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{label}</div><Input value={value} onChange={e => onChange(e.target.value)} className="bg-input/40" /></div>;
}

// =============== AI Insights ===============
const STATUS_COLOR: Record<string, string> = {
  "New": "border-primary/40 text-primary",
  "In Progress": "border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]",
  "Resolved": "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]",
  "Ignored": "border-muted text-muted-foreground",
};

export function AIInsightsSection() {
  const { insights, updateInsight, pushActivity, setActive } = useDashboard();
  const [open, setOpen] = useState<string | null>(null);
  const sel = insights.find(i => i.id === open);

  const setStatus = (id: string, status: "New" | "In Progress" | "Resolved" | "Ignored", label: string) => {
    updateInsight(id, { status });
    pushActivity(`Insight ${label}: ${insights.find(i => i.id === id)?.title}`, "sparkles", "ai");
    toast.success(`Insight marked ${status}`);
  };

  return (
    <div>
      <SectionHeader title="AI Insights" subtitle="What happened · why · supporting data · suggested action · risk if ignored" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {insights.map(i => (
          <GlowCard key={i.id} onClick={() => setOpen(i.id)}>
            <div className="flex items-center justify-between gap-2">
              <Badge variant="outline" className={urgencyColor(i.urgency)}>{i.urgency}</Badge>
              <Badge variant="outline" className={STATUS_COLOR[i.status]}>{i.status}</Badge>
            </div>
            <div className="mt-2 font-semibold">{i.title}</div>
            <p className="text-sm text-muted-foreground mt-1">{i.desc}</p>
          </GlowCard>
        ))}
      </div>
      <Dialog open={!!sel} onOpenChange={o => !o && setOpen(null)}>
        <DialogContent className="glass-strong max-w-xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {sel && (
            <>
              <DialogHeader><DialogTitle className="flex items-center gap-2">{sel.title} <Badge variant="outline" className={STATUS_COLOR[sel.status]}>{sel.status}</Badge></DialogTitle></DialogHeader>
              <div className="space-y-3">
                <Block label="What happened" body={sel.what} />
                <Block label="Why it matters" body={sel.why} />
                <Block label="Supporting data" body={sel.data} />
                <Block label="Suggested action" body={sel.action} accent />
                <Block label="Risk if ignored" body={sel.risk} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-3 border-t border-border/40">
                <Button size="sm" variant="outline" onClick={() => { setActive("leads"); setOpen(null); }}>View Leads</Button>
                <Button size="sm" variant="outline" onClick={() => { setStatus(sel.id, "In Progress", "follow-up created"); }}>Create Follow-up</Button>
                <Button size="sm" variant="outline" onClick={() => { setStatus(sel.id, "In Progress", "broker assigned"); }}>Assign Broker</Button>
                <Button size="sm" onClick={() => { setStatus(sel.id, "Resolved", "resolved"); setOpen(null); }} className="bg-[oklch(0.82_0.2_150)] text-black">Mark Done</Button>
                <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setStatus(sel.id, "Ignored", "ignored"); setOpen(null); }}>Ignore</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Block({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return <div className={`glass rounded-lg p-3 ${accent ? "neon-border" : ""}`}><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div><div className={`text-sm ${accent ? "neon-text font-medium" : ""}`}>{body}</div></div>;
}

// =============== Forecast (AI Market Forecasting Engine) ===============
export function ForecastSection() {
  const data = Array.from({ length: 6 }, (_, i) => ({ m: ["Jun","Jul","Aug","Sep","Oct","Nov"][i], rev: 1200 + i * 180 + Math.sin(i) * 100, leads: 120 + i * 22, demand: 65 + i * 4 }));
  const pie = [{ n: "Buy", v: 42 }, { n: "Invest", v: 31 }, { n: "Rent", v: 18 }, { n: "Lease", v: 9 }];
  const COLORS = ["var(--neon)", "oklch(0.7 0.25 300)", "oklch(0.85 0.18 200)", "oklch(0.82 0.2 150)"];
  return (
    <div>
      <SectionHeader title="AI Market Forecasting Engine" subtitle="Revenue · conversions · area growth · rental demand · investor activity · risk" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlowCard><div className="text-xs uppercase tracking-widest text-muted-foreground">Predicted Revenue</div><div className="text-3xl font-bold mt-1 neon-text">$8.4M</div><div className="text-xs text-muted-foreground">next 6 months · 87% confidence</div></GlowCard>
        <GlowCard><div className="text-xs uppercase tracking-widest text-muted-foreground">Lead Conversions</div><div className="text-3xl font-bold mt-1">412</div><div className="text-xs text-muted-foreground">expected · +24% MoM</div></GlowCard>
        <GlowCard><div className="text-xs uppercase tracking-widest text-muted-foreground">AI Confidence</div><div className="text-3xl font-bold mt-1 text-[oklch(0.82_0.2_150)]">94%</div><div className="text-xs text-muted-foreground">model precision</div></GlowCard>
        <GlowCard className="lg:col-span-2"><h3 className="font-semibold mb-3">Multi-signal Forecast</h3><div className="h-72"><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="oklch(0.4 0.06 250 / 0.15)" /><XAxis dataKey="m" stroke="oklch(0.7 0.03 255)" fontSize={11} /><YAxis stroke="oklch(0.7 0.03 255)" fontSize={11} /><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Legend /><Line dataKey="rev" name="Revenue" stroke="var(--neon)" strokeWidth={2} /><Line dataKey="leads" name="Leads" stroke="oklch(0.7 0.25 300)" strokeWidth={2} /><Line dataKey="demand" name="Demand Index" stroke="oklch(0.85 0.18 200)" strokeWidth={2} /></LineChart></ResponsiveContainer></div></GlowCard>
        <GlowCard><h3 className="font-semibold mb-3">Investor Opportunity Mix</h3><div className="h-72"><ResponsiveContainer><PieChart><Pie data={pie} dataKey="v" nameKey="n" innerRadius={50} outerRadius={90} paddingAngle={3}>{pie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><RTooltip contentStyle={{ background: "oklch(0.18 0.03 265)", border: "1px solid oklch(0.4 0.06 250 / 0.4)" }} /><Legend /></PieChart></ResponsiveContainer></div></GlowCard>
        <GlowCard className="lg:col-span-3">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Trust disclaimer</div>
          <p className="text-sm text-muted-foreground">Forecasts use multi-signal ensemble models calibrated on 18 months of regional data. Confidence intervals widen beyond 90 days. Decisions should incorporate broker context.</p>
        </GlowCard>
      </div>
    </div>
  );
}

export { HeatmapsSection } from "./HeatmapsSection";
