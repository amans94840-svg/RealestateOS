import { Component, useCallback, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader, Mini, urgencyColor } from "../utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Send, Heart, Edit, Share2, Sparkles, Loader2, Calendar as CalIcon, Plus, FileText, Download, MapPin, Copy, Mail, Linkedin, Globe } from "lucide-react";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { BUDGETS, BUYER_TYPES, COUNTRIES, SEED_BROKERS, SOURCES, type Appointment } from "@/lib/dashboard-data";
import { BillingTabPanel } from "@/components/dashboard/settings/BillingTabPanel";
import { uploadPropertyImage, updatePropertyImages } from "@/lib/property-api";
import { RevenueCommandCenter } from "./RevenueCommandCenter";
import { BrokerPerformanceCommandCenter } from "./BrokerPerformanceCommandCenter";
import { AiIntelligenceCommandHub } from "./AiIntelligenceCommandHub";
import { AiMarketForecastingEngine } from "./AiMarketForecastingEngine";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import {
  createAppointment as createAppointmentRow,
  fetchAppointmentsWithMeta,
  subscribeToAppointmentUpdates,
  updateAppointment as updateAppointmentRow,
} from "@/services/appointmentsService";
import type { AppointmentRow } from "@/types/appointment";

const APPOINTMENT_TYPES = ["Site Visit", "Call", "Video Meeting", "Office Meeting", "Follow-up"] as const;
const APPOINTMENT_STATUSES = ["Pending", "Confirmed", "Rescheduled", "Cancelled", "Completed"] as const;
const APPOINTMENT_DURATIONS = ["15 min", "30 min", "45 min", "60 min", "90 min", "2 hours"] as const;
const APPOINTMENT_URGENCIES = ["Critical", "High", "Medium", "Low"] as const;

const APPOINTMENT_PHONE_RULES: Record<string, { min: number; max: number; placeholder: string }> = {
  India: { min: 10, max: 10, placeholder: "9876543210" },
  USA: { min: 10, max: 10, placeholder: "4155552671" },
  Canada: { min: 10, max: 10, placeholder: "6045552671" },
  UK: { min: 10, max: 11, placeholder: "7911123456" },
  UAE: { min: 9, max: 9, placeholder: "501234567" },
  Singapore: { min: 8, max: 8, placeholder: "81234567" },
  Australia: { min: 9, max: 9, placeholder: "412345678" },
  Germany: { min: 10, max: 11, placeholder: "15123456789" },
  France: { min: 9, max: 9, placeholder: "612345678" },
  "Saudi Arabia": { min: 9, max: 9, placeholder: "512345678" },
  Qatar: { min: 8, max: 8, placeholder: "33123456" },
  Oman: { min: 8, max: 8, placeholder: "91234567" },
  Kuwait: { min: 8, max: 8, placeholder: "50012345" },
  Bahrain: { min: 8, max: 8, placeholder: "33123456" },
  "South Africa": { min: 9, max: 9, placeholder: "712345678" },
  Other: { min: 8, max: 12, placeholder: "Enter number" },
};

type AppointmentFormState = {
  leadName: string;
  phone: string;
  email: string;
  country: string;
  cityArea: string;
  buyerType: string;
  budget: string;
  leadSource: string;
  urgency: string;
  appointmentType: (typeof APPOINTMENT_TYPES)[number];
  date: string;
  time: string;
  duration: string;
  propertyInterested: string;
  assignedBroker: string;
  meetingLocation: string;
  notes: string;
  status: (typeof APPOINTMENT_STATUSES)[number];
};

function sanitizeDigits(value: string) {
  return value.replace(/[^\d]/g, "");
}

function isUuid(value?: string): value is string {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function getAppointmentCountryRule(country: string) {
  return APPOINTMENT_PHONE_RULES[country] ?? APPOINTMENT_PHONE_RULES.Other;
}

function createAppointmentForm(): AppointmentFormState {
  return {
    leadName: "",
    phone: "",
    email: "",
    country: COUNTRIES[0]?.name ?? "India",
    cityArea: "",
    buyerType: BUYER_TYPES[0] ?? "End User",
    budget: BUDGETS[0] ?? "Below $100K",
    leadSource: SOURCES[0] ?? "Website",
    urgency: "Medium",
    appointmentType: "Site Visit",
    date: "",
    time: "",
    duration: "30 min",
    propertyInterested: "",
    assignedBroker: SEED_BROKERS[0]?.name ?? "",
    meetingLocation: "",
    notes: "",
    status: "Pending",
  };
}

function mapAppointmentStatus(status?: string): Appointment["status"] {
  const raw = (status || "Pending").toLowerCase();
  if (raw === "confirmed") return "Confirmed";
  if (raw === "cancelled" || raw === "canceled") return "Cancelled";
  if (raw === "rescheduled") return "Rescheduled";
  if (raw === "completed") return "Completed";
  return "Pending";
}

function statusToRow(status: Appointment["status"] | string): string {
  if (status === "Confirmed") return "confirmed";
  if (status === "Cancelled") return "cancelled";
  if (status === "Rescheduled") return "rescheduled";
  if (status === "Completed") return "completed";
  return "scheduled";
}

function mapAppointmentRow(row: AppointmentRow, propertyTitle?: string): Appointment {
  return {
    id: row.id,
    leadId: row.lead_id,
    leadName: row.lead_name || "Unnamed lead",
    phone: row.lead_phone || "",
    email: row.lead_email || "",
    appointmentType: row.appointment_type as Appointment["appointmentType"],
    property: propertyTitle || row.property_id || "TBD",
    propertyId: row.property_id,
    date: row.meeting_date || "",
    time: row.meeting_time || "",
    meetingLocation: row.location || "",
    notes: row.notes || "",
    status: mapAppointmentStatus(row.appointment_status),
    assignedBroker: row.assigned_broker || "",
    broker: row.assigned_broker || "",
    createdAt: row.created_at ? Date.parse(row.created_at) : undefined,
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : undefined,
  };
}

function appointmentToRow(input: Appointment): Partial<AppointmentRow> {
  return {
    lead_id: input.leadId,
    property_id: isUuid(input.propertyId) ? input.propertyId : undefined,
    appointment_type: input.appointmentType,
    appointment_status: statusToRow(input.status),
    lead_name: input.leadName,
    lead_phone: input.phone,
    lead_email: input.email,
    meeting_date: input.date,
    meeting_time: input.time,
    location: input.meetingLocation,
    assigned_broker: input.assignedBroker || input.broker,
    notes: input.notes,
  };
}

class AppointmentsErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[AppointmentsSection] render crash", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div>
          <SectionHeader title="Appointments" subtitle="Site visits and broker scheduling" />
          <GlowCard className="py-12 text-center text-muted-foreground">
            <div className="mb-2 text-red-300">Appointments page failed to render.</div>
            <div className="text-xs">{this.state.error.message}</div>
          </GlowCard>
        </div>
      );
    }
    return this.props.children;
  }
}

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
export { PropertiesSection } from "./PropertiesSection";

function PropertiesSectionLegacy() {
  const { properties, toggleFavorite, addProperty, updateProperty, leads, pushActivity } = useDashboard();

  const [q, setQ] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);

  const [editForm, setEditForm] = useState(() => ({
    title: "",
    country: "",
    city: "",
    area: "",
    address: "",
    price: "",
    currency: "USD",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    size: "",
    status: "Active" as "Verified" | "Active" | "Off Market",
    description: "",
    coverImageUrl: "",
    galleryImageUrls: "",
  }));

  const [addForm, setAddForm] = useState(() => ({
    title: "",
    country: "",
    city: "",
    area: "",
    address: "",
    price: "",
    currency: "USD",
    propertyType: "Apartment",
    bedrooms: 2,
    bathrooms: 2,
    size: "",
    status: "Active" as "Verified" | "Active" | "Off Market",
    description: "",
    coverImageUrl: "",
    galleryImageUrls: "",
    galleryImageFiles: [] as File[],
    coverImageFile: null as File | null,
  }));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return properties;
    return properties.filter(
      (p) =>
        p.title.toLowerCase().includes(term) ||
        p.city.toLowerCase().includes(term) ||
        (p.country ?? "").toLowerCase().includes(term),
    );
  }, [properties, q]);

  const viewProp = useMemo(() => properties.find((p) => p.id === viewId) ?? null, [properties, viewId]);
  const editProp = useMemo(() => properties.find((p) => p.id === editId) ?? null, [properties, editId]);
  const shareProp = useMemo(() => properties.find((p) => p.id === shareId) ?? null, [properties, shareId]);
  const matchProp = useMemo(() => properties.find((p) => p.id === matchId) ?? null, [properties, matchId]);

  const legacyPropertyType = (p: NonNullable<typeof viewProp>) => p.propertyType ?? p.type ?? "";

  const matchingLeads = (target: typeof viewProp) => {
    if (!target) return [];
    const t = legacyPropertyType(target);
    return leads.filter((l) => (l.propertyType ?? "") === t).slice(0, 5);
  };

  const matchingCount = (target: typeof viewProp) => {
    if (!target) return 0;
    const t = legacyPropertyType(target);
    return leads.filter((l) => (l.propertyType ?? "") === t).length;
  };

  const getGallery = (p: NonNullable<typeof viewProp>) => {
    const gallery = (p.galleryImages ?? []).filter(Boolean);
    const cover = p.imageUrl ? [p.imageUrl] : [];
    const merged = [...gallery, ...cover].filter(Boolean);
    return merged.length ? merged : [];
  };

  const coverImageSrc = (p: NonNullable<typeof viewProp>) => {
    return p.imageUrl ?? p.galleryImages?.[0] ?? "";
  };

  const premiumPlaceholder = (p: NonNullable<typeof viewProp>) => {
    // Keep the existing futuristic neon vibe; show emoji if present, else a generic icon.
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-[oklch(0.7_0.25_300_/_0.2)] to-[oklch(0.85_0.18_200_/_0.2)] flex items-center justify-center text-6xl grid-bg">
        {p.image ?? "🏙️"}
      </div>
    );
  };

  const getPriceLabel = (p: NonNullable<typeof viewProp>) => {
    // `price` already includes currency in current seed; keep it.
    return p.price;
  };

  const isVerified = (p: NonNullable<typeof viewProp>) => {
    return Boolean(p.verified) || p.status === "Verified";
  };

  const roi = (p: NonNullable<typeof viewProp>) => p.roi ?? 0;
  const rentalYield = (p: NonNullable<typeof viewProp>) => p.rentalYield ?? p.yield ?? 0;
  const appreciationForecast = (p: NonNullable<typeof viewProp>) => p.appreciationForecast ?? p.appreciation ?? 0;

  const openEdit = (id: string) => {
    const p = properties.find((x) => x.id === id);
    if (!p) return;
    setEditForm({
      title: p.title ?? "",
      country: p.country ?? "",
      city: p.city ?? "",
      area: p.area ?? "",
      address: p.address ?? "",
      price: p.price ?? "",
      currency: p.currency ?? "USD",
      propertyType: legacyPropertyType(p as any) || "Apartment",
      bedrooms: p.bedrooms ?? 2,
      bathrooms: p.bathrooms ?? 2,
      size: p.size ?? "",
      status: (p.status ?? (p.verified ? "Verified" : "Active")) as any,
      description: p.description ?? "",
      coverImageUrl: p.imageUrl ?? "",
      galleryImageUrls: (p.galleryImages ?? []).join(","),
    });
    setEditId(id);
  };

  const submitEdit = async () => {
    if (!editId) return;
    const galleryUrls = editForm.galleryImageUrls
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Placeholder for R2/Supabase persistence.
    await updatePropertyImages({
      propertyId: editId,
      coverImageUrl: editForm.coverImageUrl || undefined,
      galleryImageUrls: galleryUrls.length ? galleryUrls : undefined,
    });

    updateProperty(editId, {
      title: editForm.title,
      country: editForm.country,
      city: editForm.city,
      area: editForm.area,
      address: editForm.address,
      price: editForm.price,
      currency: editForm.currency,
      propertyType: editForm.propertyType,
      bedrooms: editForm.bedrooms,
      bathrooms: editForm.bathrooms,
      size: editForm.size,
      status: editForm.status,
      description: editForm.description,
      imageUrl: editForm.coverImageUrl || undefined,
      galleryImages: galleryUrls.length ? galleryUrls : undefined,

      // Maintain legacy fields for older UI pieces.
      type: editForm.propertyType,
      roi: editProp?.roi ?? 80,
      yield: editProp ? rentalYield(editProp as any) : 5,
      appreciation: editProp ? appreciationForecast(editProp as any) : 10,
      verified: editForm.status === "Verified",
    } as any);

    pushActivity(`Property updated: ${editForm.title}`, "sparkles", "property");
    toast.success("Property updated");
    setEditId(null);
  };

  const buildShareUrl = (p: NonNullable<typeof viewProp>) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/p/${p.id}`;

  const shareMessage = (p: NonNullable<typeof viewProp>, url: string) => {
    const loc = [p.city, p.country].filter(Boolean).join(", ");
    return `${p.title} — ${getPriceLabel(p)}\n${loc}\n${url}`;
  };

  const copyShare = (p: NonNullable<typeof viewProp>) => {
    const url = buildShareUrl(p);
    navigator.clipboard?.writeText(url).catch(() => {});
    pushActivity(`Property shared: ${p.title}`, "sparkles", "property");
    toast.success("Share link copied", { description: url });
  };

  const submitAdd = async () => {
    const title = addForm.title.trim();
    const city = addForm.city.trim();
    const price = addForm.price.trim();
    if (!title || !city || !price) {
      toast.error("Title, city, price required");
      return;
    }

    const galleryUrls = addForm.galleryImageUrls
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    // Upload files (placeholder: returns temporary object URLs for now).
    const coverUrlFromFile = addForm.coverImageFile
      ? await uploadPropertyImage(addForm.coverImageFile)
      : "";
    const galleryFromFiles = addForm.galleryImageFiles.length
      ? await Promise.all(addForm.galleryImageFiles.map((f) => uploadPropertyImage(f)))
      : [];

    const finalCover = coverUrlFromFile || addForm.coverImageUrl;
    const finalGallery = [...galleryUrls, ...galleryFromFiles].filter(Boolean);

    addProperty({
      id: Math.random().toString(36).slice(2),
      title,
      country: addForm.country || "—",
      city,
      area: addForm.area || "",
      address: addForm.address || "",
      price,
      currency: addForm.currency || "USD",
      propertyType: addForm.propertyType,
      bedrooms: addForm.bedrooms,
      bathrooms: addForm.bathrooms,
      size: addForm.size,
      status: addForm.status,
      description: addForm.description,
      imageUrl: finalCover || undefined,
      galleryImages: finalGallery.length ? finalGallery : undefined,
      verified: addForm.status === "Verified",

      // Legacy fields used across the rest of the app.
      type: addForm.propertyType,
      roi: 80,
      rentalYield: 5,
      appreciationForecast: 10,
      yield: 5,
      appreciation: 10,
      image: finalCover ? "🏙️" : "🏙️",
    } as any);

    toast.success("Property added");
    setAddOpen(false);
    setAddForm({
      title: "",
      country: "",
      city: "",
      area: "",
      address: "",
      price: "",
      currency: "USD",
      propertyType: "Apartment",
      bedrooms: 2,
      bathrooms: 2,
      size: "",
      status: "Active",
      description: "",
      coverImageUrl: "",
      galleryImageUrls: "",
      galleryImageFiles: [],
      coverImageFile: null,
    });
  };

  return (
    <div>
      <SectionHeader title="Global Properties" subtitle="Multi-market inventory with predictive ROI">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search properties…" className="w-56 bg-input/40" />
        <Button onClick={() => setAddOpen(true)} className="neon-border bg-primary/90">
          <Plus className="h-4 w-4" /> Add Property
        </Button>
      </SectionHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <GlowCard key={p.id}>
            <div className="relative aspect-video rounded-xl overflow-hidden mb-3 grid-bg">
              {p.imageUrl ? (
                <img
                  src={p.imageUrl}
                  alt={p.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                premiumPlaceholder(p as any)
              )}

              <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#050a18] via-transparent to-transparent opacity-70" />

              <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                <Badge className="bg-[oklch(0.82_0.2_150_/_0.2)] text-[oklch(0.82_0.2_150)] border-[oklch(0.82_0.2_150_/_0.5)]">
                  Global Property
                </Badge>
                {roi(p as any) >= 85 ? (
                  <Badge className="bg-emerald-400/10 text-emerald-300 border-emerald-400/30">
                    High ROI
                  </Badge>
                ) : null}
                {isVerified(p as any) ? (
                  <Badge className="bg-sky-400/10 text-sky-300 border-sky-400/30">
                    Verified
                  </Badge>
                ) : null}
                {roi(p as any) >= 92 ? (
                  <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">
                    Hot Deal
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {p.city}, {p.country}
                </div>
              </div>
              <button
                onClick={() => {
                  toggleFavorite(p.id);
                  toast(p.favorite ? "Removed from favorites" : "Added to favorites");
                }}
                aria-label="Favorite"
              >
                <Heart className={`h-4 w-4 ${p.favorite ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 text-center">
              <Mini label="Price" value={p.price} />
              <Mini label="ROI" value={`${roi(p as any)}`} />
              <Mini label="Yield" value={`${rentalYield(p as any)}%`} />
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setViewId(p.id)}>
                View
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(p.id)} aria-label="Edit property">
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShareId(p.id)} aria-label="Share property">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setMatchId(p.id)} aria-label="Match leads">
                Match
              </Button>
            </div>
          </GlowCard>
        ))}
      </div>

      {/* View Details */}
      <Dialog open={!!viewProp} onOpenChange={(o) => !o && setViewId(null)}>
        <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          {viewProp && (
            <>
              <DialogHeader>
                <DialogTitle>{viewProp.title}</DialogTitle>
              </DialogHeader>

              <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
                {viewProp.imageUrl ? (
                  <img src={viewProp.imageUrl} alt={viewProp.title} className="h-full w-full object-cover" />
                ) : (
                  premiumPlaceholder(viewProp as any)
                )}
              </div>

              {/* Gallery Thumbnails */}
              {(() => {
                const gallery = getGallery(viewProp as any);
                if (!gallery.length) return null;
                return (
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
                    {gallery.slice(0, 8).map((src, idx) => (
                      <button
                        key={src + idx}
                        type="button"
                        className="h-16 w-24 shrink-0 rounded-lg overflow-hidden border border-border/50 hover:border-cyan-400/40 transition"
                        aria-label={`Gallery image ${idx + 1}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt={`${viewProp.title} ${idx + 1}`} className="h-full w-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                );
              })()}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <Mini label="Price" value={getPriceLabel(viewProp as any)} />
                <Mini label="ROI Score" value={`${roi(viewProp as any)}`} />
                <Mini label="Rental Yield" value={`${rentalYield(viewProp as any)}%`} />
                <Mini label="Appreciation" value={`${appreciationForecast(viewProp as any)}%/yr`} />
              </div>

              <Card className="glass-strong border-border/40 p-4 mb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">Location</div>
                    <div className="font-semibold">
                      {viewProp.city}, {viewProp.country}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {viewProp.area || viewProp.address || "—"}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {isVerified(viewProp as any) ? (
                      <Badge className="bg-sky-400/10 text-sky-300 border-sky-400/30">Verified</Badge>
                    ) : null}
                    {roi(viewProp as any) >= 85 ? (
                      <Badge className="bg-emerald-400/10 text-emerald-300 border-emerald-400/30">High ROI</Badge>
                    ) : null}
                    {roi(viewProp as any) >= 92 ? (
                      <Badge className="bg-violet-500/10 text-violet-300 border-violet-500/30">Hot Deal</Badge>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Mini label="Type" value={legacyPropertyType(viewProp as any) || "—"} />
                  <Mini label="Bedrooms" value={`${viewProp.bedrooms ?? 0}`} />
                  <Mini label="Bathrooms" value={`${viewProp.bathrooms ?? 0}`} />
                  <Mini label="Size" value={viewProp.size || "—"} />
                </div>

                <div className="mt-4">
                  <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">AI Property Insight</div>
                  <div className="neon-text text-sm">
                    {roi(viewProp as any) >= 90
                      ? "Projected upside is strong. Prioritize verified leads and push for fast decision-making."
                      : "Steady growth profile. Focus on conversion via targeted lead matches and itinerary follow-ups."}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {viewProp.description ? viewProp.description : "—"}
                  </div>
                </div>
              </Card>

              <div className="mb-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                  Matching Leads <span className="text-muted-foreground/70">({matchingCount(viewProp as any)})</span>
                </div>
                {matchingLeads(viewProp as any).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No matches yet.</p>
                ) : (
                  matchingLeads(viewProp as any).map((l) => (
                    <div key={l.id} className="flex items-center gap-3 py-2 border-b border-border/30">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-xs">
                          {l.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="text-sm">{l.name}</div>
                        <div className="text-xs text-muted-foreground">{l.budget}</div>
                      </div>
                      <Badge variant="outline">AI {l.aiScore}</Badge>
                    </div>
                  ))
                )}
              </div>

              <div className="flex gap-2 justify-end pt-2 flex-wrap">
                <Button variant="outline" onClick={() => { setShareId(viewProp.id); setViewId(null); }}>
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button variant="outline" onClick={() => { openEdit(viewProp.id); setViewId(null); }}>
                  <Edit className="h-4 w-4" /> Edit
                </Button>
                <Button onClick={() => { setMatchId(viewProp.id); setViewId(null); }}>Match Leads</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={!!editProp} onOpenChange={(o) => !o && setEditId(null)}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
          </DialogHeader>
          {editProp && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} placeholder="Title" className="bg-input/40" />
                <Input value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} placeholder="Price (e.g. $2.4M)" className="bg-input/40" />
                <Input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} placeholder="Country" className="bg-input/40" />
                <Input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} placeholder="City" className="bg-input/40" />
                <Input value={editForm.area} onChange={(e) => setEditForm({ ...editForm, area: e.target.value })} placeholder="Area" className="bg-input/40" />
                <Input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" className="bg-input/40" />
                <Input value={editForm.currency} onChange={(e) => setEditForm({ ...editForm, currency: e.target.value })} placeholder="Currency (USD)" className="bg-input/40" />
                <Input value={editForm.propertyType} onChange={(e) => setEditForm({ ...editForm, propertyType: e.target.value })} placeholder="Property Type" className="bg-input/40" />
                <Input type="number" value={editForm.bedrooms} onChange={(e) => setEditForm({ ...editForm, bedrooms: Number(e.target.value) })} placeholder="Bedrooms" className="bg-input/40" />
                <Input type="number" value={editForm.bathrooms} onChange={(e) => setEditForm({ ...editForm, bathrooms: Number(e.target.value) })} placeholder="Bathrooms" className="bg-input/40" />
                <Input value={editForm.size} onChange={(e) => setEditForm({ ...editForm, size: e.target.value })} placeholder="Size (e.g. 1200 sq ft)" className="bg-input/40" />
                <Input value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })} placeholder="Status (Active/Verified/Off Market)" className="bg-input/40" />
              </div>
              <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" className="bg-input/40" rows={4} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input value={editForm.coverImageUrl} onChange={(e) => setEditForm({ ...editForm, coverImageUrl: e.target.value })} placeholder="Cover image URL" className="bg-input/40" />
                <Input value={editForm.galleryImageUrls} onChange={(e) => setEditForm({ ...editForm, galleryImageUrls: e.target.value })} placeholder="Gallery image URLs (comma-separated)" className="bg-input/40" />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                <Button onClick={() => void submitEdit()}>Save</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share */}
      <Dialog open={!!shareProp} onOpenChange={(o) => !o && setShareId(null)}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Property</DialogTitle>
          </DialogHeader>
          {shareProp && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Share{" "}
                <span className="text-foreground font-medium">{shareProp.title}</span> via:
              </div>

              {(() => {
                const url = buildShareUrl(shareProp as any);
                const msg = shareMessage(shareProp as any, url);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => copyShare(shareProp as any)}>
                      <Copy className="h-4 w-4 mr-2" /> Copy Link
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                        pushActivity(`Property shared on WhatsApp: ${shareProp.title}`, "sparkles");
                      }}
                    >
                      <Globe className="h-4 w-4 mr-2" /> WhatsApp
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const subject = `RealEstateOS: ${shareProp.title}`;
                        window.open(
                          `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}`,
                          "_blank",
                        );
                        pushActivity(`Property shared by email: ${shareProp.title}`, "sparkles");
                      }}
                    >
                      <Mail className="h-4 w-4 mr-2" /> Email
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(
                          `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
                          "_blank",
                        );
                        pushActivity(`Property shared on LinkedIn: ${shareProp.title}`, "sparkles");
                      }}
                    >
                      <Linkedin className="h-4 w-4 mr-2" /> LinkedIn
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast("PDF export coming soon");
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" /> Download PDF
                    </Button>
                    <Button variant="outline" onClick={() => copyShare(shareProp as any)}>
                      <Share2 className="h-4 w-4 mr-2" /> Copy Link (Alt)
                    </Button>
                  </div>
                );
              })()}

              <div className="glass rounded-lg border border-border/40 p-3 text-xs text-muted-foreground">
                Later: wire actual share analytics + PDF generation UI.
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Match Leads */}
      <Dialog open={!!matchProp} onOpenChange={(o) => !o && setMatchId(null)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Lead Matches — {matchProp?.title}</DialogTitle>
          </DialogHeader>
          {matchProp && (
            <>
              {matchingLeads(matchProp).length === 0 ? (
                <p className="text-sm text-muted-foreground">No matching leads found for this property type.</p>
              ) : (
                <div className="space-y-2">
                  {matchingLeads(matchProp).map((l) => (
                    <div key={l.id} className="flex items-center gap-3 p-2 glass rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-primary/20">
                          {l.name.split(" ").map((n) => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm truncate">{l.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {l.budget} • {l.city}
                        </div>
                      </div>
                      <Badge variant="outline">AI {l.aiScore}</Badge>
                      <Button
                        size="sm"
                        onClick={() => {
                          pushActivity(`Lead ${l.name} matched to ${matchProp.title}`, "user-check");
                          toast.success("Match initiated");
                        }}
                      >
                        Push
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input value={addForm.title} onChange={(e) => setAddForm({ ...addForm, title: e.target.value })} placeholder="Title" className="bg-input/40" />
              <Input value={addForm.price} onChange={(e) => setAddForm({ ...addForm, price: e.target.value })} placeholder="Price (e.g. $2.4M)" className="bg-input/40" />
              <Input value={addForm.country} onChange={(e) => setAddForm({ ...addForm, country: e.target.value })} placeholder="Country" className="bg-input/40" />
              <Input value={addForm.city} onChange={(e) => setAddForm({ ...addForm, city: e.target.value })} placeholder="City" className="bg-input/40" />
              <Input value={addForm.area} onChange={(e) => setAddForm({ ...addForm, area: e.target.value })} placeholder="Area" className="bg-input/40" />
              <Input value={addForm.address} onChange={(e) => setAddForm({ ...addForm, address: e.target.value })} placeholder="Address" className="bg-input/40" />
              <Input value={addForm.currency} onChange={(e) => setAddForm({ ...addForm, currency: e.target.value })} placeholder="Currency (USD)" className="bg-input/40" />
              <Input value={addForm.propertyType} onChange={(e) => setAddForm({ ...addForm, propertyType: e.target.value })} placeholder="Property Type" className="bg-input/40" />
              <Input type="number" value={addForm.bedrooms} onChange={(e) => setAddForm({ ...addForm, bedrooms: Number(e.target.value) })} className="bg-input/40" />
              <Input type="number" value={addForm.bathrooms} onChange={(e) => setAddForm({ ...addForm, bathrooms: Number(e.target.value) })} className="bg-input/40" />
              <Input value={addForm.size} onChange={(e) => setAddForm({ ...addForm, size: e.target.value })} placeholder="Size (e.g. 1200 sq ft)" className="bg-input/40" />
              <Input value={addForm.status} onChange={(e) => setAddForm({ ...addForm, status: e.target.value as any })} placeholder="Status (Active/Verified/Off Market)" className="bg-input/40" />
            </div>

            <Textarea
              value={addForm.description}
              onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
              placeholder="Description"
              className="bg-input/40"
              rows={4}
            />

            {/* Image upload fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="glass-strong border-border/40 p-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Cover Image</div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    setAddForm({ ...addForm, coverImageFile: file });
                  }}
                  className="bg-input/40"
                />
                <div className="mt-2">
                  <Input
                    value={addForm.coverImageUrl}
                    onChange={(e) => setAddForm({ ...addForm, coverImageUrl: e.target.value })}
                    placeholder="Cover image URL (optional)"
                    className="bg-input/40"
                  />
                </div>
              </Card>

              <Card className="glass-strong border-border/40 p-4">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Gallery Images</div>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    setAddForm({ ...addForm, galleryImageFiles: files });
                  }}
                  className="bg-input/40"
                />
                <div className="mt-2">
                  <Input
                    value={addForm.galleryImageUrls}
                    onChange={(e) => setAddForm({ ...addForm, galleryImageUrls: e.target.value })}
                    placeholder="Gallery URLs (comma-separated, optional)"
                    className="bg-input/40"
                  />
                </div>
              </Card>
            </div>

            <div className="flex justify-end gap-2 flex-wrap">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => void submitAdd()}>Add</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============== Appointments ===============
export function AppointmentsSection() {
  return (
    <AppointmentsErrorBoundary>
      <AppointmentsSectionContent />
    </AppointmentsErrorBoundary>
  );
}

function AppointmentsSectionContent() {
  const { properties, pushActivity } = useDashboard();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [reschedId, setReschedId] = useState<string | null>(null);
  const [rDate, setRDate] = useState("");
  const [rTime, setRTime] = useState("");
  const [rNotes, setRNotes] = useState("");
  const [form, setForm] = useState<AppointmentFormState>(() => createAppointmentForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const safeProperties = useMemo(() => (Array.isArray(properties) ? properties.filter(Boolean) : []), [properties]);
  const propertyTitleById = useMemo(
    () => new Map(safeProperties.map((property) => [property.id, property.title || "Untitled property"])),
    [safeProperties],
  );

  const loadAppointments = useCallback(async (nextWorkspaceId: string) => {
    setLoading(true);
    const result = await fetchAppointmentsWithMeta(nextWorkspaceId);
    const rows = Array.isArray(result.data) ? result.data.filter(Boolean) : [];
    const mapped = rows.map((row) => mapAppointmentRow(row, row.property_id ? propertyTitleById.get(row.property_id) : undefined));
    console.log("[AppointmentsSection] appointments count", mapped.length);
    console.log("[AppointmentsSection] fetch errors", result.error);
    setAppointments(mapped);
    setError(result.error);
    setLoading(false);
  }, [propertyTitleById]);

  const resolveWorkspaceAndLoad = useCallback(async () => {
    setLoading(true);
    setError(null);
    setAppointments([]);

    if (!isSupabaseConfigured()) {
      setError("Supabase is not configured");
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setError("Supabase client unavailable");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = await sb.auth.getUser();
    const userId = authData?.user?.id;
    if (authError || !userId) {
      setError(authError?.message ?? "No authenticated user session");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await sb
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const nextWorkspaceId = (profile as { workspace_id?: string | null } | null)?.workspace_id ?? null;
    console.log("[AppointmentsSection] workspace_id", nextWorkspaceId);
    setWorkspaceId(nextWorkspaceId);
    if (!nextWorkspaceId) {
      console.log("[AppointmentsSection] fetch errors", "workspace_id not found on profile");
      setError("workspace_id not found on profile");
      setLoading(false);
      return;
    }

    await loadAppointments(nextWorkspaceId);
  }, [loadAppointments]);

  useEffect(() => {
    void resolveWorkspaceAndLoad();
  }, [resolveWorkspaceAndLoad]);

  useEffect(() => {
    if (!workspaceId) return;
    return subscribeToAppointmentUpdates(workspaceId, (payload) => {
      const event = payload as { eventType?: string; new?: AppointmentRow; old?: AppointmentRow };
      if (event.eventType === "DELETE" && event.old?.id) {
        setAppointments((prev) => prev.filter((item) => item.id !== event.old!.id));
        return;
      }
      if (!event.new?.id) return;
      const mapped = mapAppointmentRow(
        event.new,
        event.new.property_id ? propertyTitleById.get(event.new.property_id) : undefined,
      );
      setAppointments((prev) => {
        const exists = prev.some((item) => item.id === mapped.id);
        return exists ? prev.map((item) => (item.id === mapped.id ? mapped : item)) : [mapped, ...prev];
      });
    });
  }, [workspaceId, propertyTitleById]);

  const statusBadge = (s: string) =>
    s === "Confirmed"
      ? "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]"
      : s === "Pending"
        ? "border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]"
        : s === "Completed"
          ? "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]"
          : s === "Rescheduled"
            ? "border-[oklch(0.7_0.25_300_/_0.5)] text-[oklch(0.78_0.22_300)]"
            : "border-destructive/40 text-destructive";

  const country = COUNTRIES.find((item) => item.name === form.country) ?? COUNTRIES[0];
  const phoneRule = getAppointmentCountryRule(form.country);
  const phoneDigits = sanitizeDigits(form.phone);
  const phoneValid = phoneDigits.length >= phoneRule.min && phoneDigits.length <= phoneRule.max;
  const emailValid = !form.email.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
  const propertyLabel = safeProperties.find((p) => p.id === form.propertyInterested)?.title || form.propertyInterested || "TBD";

  const resetForm = () => {
    setForm(createAppointmentForm());
    setErrors({});
  };

  const open = (id: string) => {
    const a = appointments.find((x) => x.id === id);
    setReschedId(id);
    setRDate(a?.date ?? "");
    setRTime(a?.time ?? "");
    setRNotes(a?.notes ?? "");
  };

  const replaceAppointment = useCallback((next: Appointment) => {
    setAppointments((prev) => prev.map((item) => (item.id === next.id ? next : item)));
  }, []);

  const updateAppointmentStatus = useCallback(
    async (appointment: Appointment, status: Appointment["status"]) => {
      const optimistic = { ...appointment, status, updatedAt: Date.now() };
      replaceAppointment(optimistic);
      try {
        const updated = await updateAppointmentRow(appointment.id, { appointment_status: statusToRow(status) });
        if (updated) {
          replaceAppointment(mapAppointmentRow(updated, updated.property_id ? propertyTitleById.get(updated.property_id) : undefined));
        }
        pushActivity(`Appointment ${status.toLowerCase()}: ${appointment.leadName}`, "calendar", "visit");
        toast.success(status === "Cancelled" ? "Appointment cancelled" : `Appointment ${status.toLowerCase()}`);
      } catch (err) {
        console.error(err);
        replaceAppointment(appointment);
        toast.error("Failed to update appointment");
      }
    },
    [propertyTitleById, pushActivity, replaceAppointment],
  );

  const submitReschedule = async () => {
    if (!reschedId) return;
    if (!rDate.trim() || !rTime.trim()) {
      toast.error("Date and time required");
      return;
    }
    const current = appointments.find((item) => item.id === reschedId);
    if (!current) return;
    const optimistic: Appointment = { ...current, date: rDate, time: rTime, notes: rNotes, status: "Rescheduled", updatedAt: Date.now() };
    replaceAppointment(optimistic);
    try {
      const updated = await updateAppointmentRow(reschedId, {
        meeting_date: rDate,
        meeting_time: rTime,
        notes: rNotes,
        appointment_status: statusToRow("Rescheduled"),
      });
      if (updated) replaceAppointment(mapAppointmentRow(updated, updated.property_id ? propertyTitleById.get(updated.property_id) : undefined));
      pushActivity(`Appointment rescheduled to ${rDate} ${rTime}`, "calendar", "visit");
      toast.success("Appointment rescheduled");
      setReschedId(null);
    } catch (err) {
      console.error(err);
      replaceAppointment(current);
      toast.error("Failed to reschedule appointment");
    }
  };

  const submitAdd = async () => {
    const nextErrors: Record<string, string> = {};
    if (!form.leadName.trim()) nextErrors.leadName = "Lead name is required.";
    if (!phoneDigits) nextErrors.phone = "Phone number is required.";
    if (!phoneValid) nextErrors.phone = `Phone number must have ${phoneRule.min}${phoneRule.min !== phoneRule.max ? `-${phoneRule.max}` : ""} digits.`;
    if (!form.date.trim()) nextErrors.date = "Date is required.";
    if (!form.time.trim()) nextErrors.time = "Time is required.";
    if (!form.appointmentType) nextErrors.appointmentType = "Appointment type is required.";
    if (!emailValid) nextErrors.email = "Please enter a valid email address.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (!workspaceId) {
      toast.error("Workspace not ready");
      return;
    }

    const selectedProperty = safeProperties.find((p) => p.id === form.propertyInterested) ?? null;
    const appointment: Appointment = {
      id: `appt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      leadName: form.leadName.trim(),
      phone: `${country.code}${phoneDigits}`,
      email: form.email.trim().toLowerCase(),
      country: form.country,
      city: form.cityArea.trim(),
      buyerType: form.buyerType,
      budget: form.budget,
      leadSource: form.leadSource,
      urgency: form.urgency as Appointment["urgency"],
      appointmentType: form.appointmentType,
      property: selectedProperty?.title || form.propertyInterested || "TBD",
      propertyId: selectedProperty?.id,
      date: form.date.trim(),
      time: form.time.trim(),
      duration: form.duration,
      meetingLocation: form.meetingLocation.trim() || selectedProperty?.address || "",
      notes: form.notes.trim(),
      status: form.status,
      assignedBroker: form.assignedBroker,
      broker: form.assignedBroker,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    try {
      const created = await createAppointmentRow(workspaceId, appointmentToRow(appointment));
      const mapped = created
        ? mapAppointmentRow(created, created.property_id ? propertyTitleById.get(created.property_id) : selectedProperty?.title)
        : appointment;
      setAppointments((prev) => [mapped, ...prev]);
      toast.success("Appointment booked successfully");
      setAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
      toast.error("Failed to book appointment");
    }
  };

  return (
    <div>
      <SectionHeader title="Appointments" subtitle="Site visits and broker scheduling">
        <Button onClick={() => setAddOpen(true)} className="neon-border bg-primary/90" disabled={!workspaceId || loading}>
          <Plus className="h-4 w-4" /> New Appointment
        </Button>
      </SectionHeader>

      {loading ? (
        <GlowCard className="py-12 text-center text-muted-foreground">Loading appointments…</GlowCard>
      ) : error ? (
        <GlowCard className="py-12 text-center text-muted-foreground">
          <div className="mb-3 text-red-300">{error}</div>
          <Button type="button" variant="outline" onClick={() => void resolveWorkspaceAndLoad()}>
            Retry
          </Button>
        </GlowCard>
      ) : appointments.length === 0 ? (
        <GlowCard className="py-12 text-center text-muted-foreground">No appointments found for this workspace.</GlowCard>
      ) : (
        <div className="grid gap-3">
          {appointments.map((a) => (
          <GlowCard key={a.id}>
            <div className="flex flex-wrap items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
                <CalIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">
                  {a.leadName || "Unnamed lead"} <span className="text-muted-foreground">→</span> {a.property || "TBD"}
                </div>
                <div className="text-sm text-muted-foreground">
                  {a.date || "Date TBD"} • {a.time || "Time TBD"}
                  {a.appointmentType ? ` • ${a.appointmentType}` : ""}
                  {a.buyerType ? ` • ${a.buyerType}` : ""}
                  {a.broker ? ` • ${a.broker}` : ""}
                </div>
              </div>
              <Badge variant="outline" className={statusBadge(a.status || "Pending")}>
                {a.status || "Pending"}
              </Badge>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(a.status || "Pending") === "Confirmed"}
                  onClick={() => void updateAppointmentStatus(a, "Confirmed")}
                >
                  Confirm
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={(a.status || "Pending") === "Completed"}
                  onClick={() => void updateAppointmentStatus(a, "Completed")}
                >
                  Complete
                </Button>
                <Button size="sm" variant="outline" onClick={() => open(a.id)}>
                  Reschedule
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  disabled={(a.status || "Pending") === "Cancelled"}
                  onClick={() => void updateAppointmentStatus(a, "Cancelled")}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </GlowCard>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[96vh] w-[calc(100vw-1rem)] overflow-y-auto border-white/10 bg-slate-950 text-white sm:max-w-5xl">
          <DialogHeader className="space-y-2 pr-10">
            <DialogTitle>New Appointment</DialogTitle>
            <DialogDescription className="text-slate-400">
              Capture full client and meeting details before booking the visit or follow-up.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Lead / Client Details</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-slate-200">Lead Name *</Label>
                    <Input value={form.leadName} onChange={(e) => setForm((prev) => ({ ...prev, leadName: e.target.value }))} placeholder="Aman Sharma" className="bg-black/40 border-white/10 text-white" />
                    {errors.leadName ? <p className="text-xs text-red-400">{errors.leadName}</p> : null}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-slate-200">Phone Number *</Label>
                    <div className="flex gap-2">
                      <div className="flex items-center rounded-xl border border-white/10 bg-black/40 px-3 text-sm text-cyan-100">{country.code}</div>
                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            phone: sanitizeDigits(e.target.value).slice(0, phoneRule.max),
                          }))
                        }
                        placeholder={phoneRule.placeholder}
                        className="bg-black/40 border-white/10 text-white"
                        maxLength={phoneRule.max}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500">Country code updates automatically from the selected country.</div>
                    {errors.phone ? <p className="text-xs text-red-400">{errors.phone}</p> : null}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-slate-200">Email</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value.trimStart().toLowerCase().replace(/\s+/g, " ") }))}
                      placeholder="buyer@example.com"
                      className="bg-black/40 border-white/10 text-white"
                    />
                    {!emailValid ? <p className="text-xs text-red-400">Please enter a valid email address.</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Country</Label>
                    <Select value={form.country} onValueChange={(value) => setForm((prev) => ({ ...prev, country: value, phone: "" }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((item) => (
                          <SelectItem key={item.name} value={item.name}>
                            {item.flag} {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">City / Area</Label>
                    <Input value={form.cityArea} onChange={(e) => setForm((prev) => ({ ...prev, cityArea: e.target.value }))} placeholder="Dubai Marina / Sector 150" className="bg-black/40 border-white/10 text-white" />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Buyer Type</Label>
                    <Select value={form.buyerType} onValueChange={(value) => setForm((prev) => ({ ...prev, buyerType: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Buyer type" /></SelectTrigger>
                      <SelectContent>
                        {BUYER_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Budget Range</Label>
                    <Select value={form.budget} onValueChange={(value) => setForm((prev) => ({ ...prev, budget: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Budget" /></SelectTrigger>
                      <SelectContent>
                        {BUDGETS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Lead Source</Label>
                    <Select value={form.leadSource} onValueChange={(value) => setForm((prev) => ({ ...prev, leadSource: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Lead source" /></SelectTrigger>
                      <SelectContent>
                        {SOURCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Urgency Level</Label>
                    <Select value={form.urgency} onValueChange={(value) => setForm((prev) => ({ ...prev, urgency: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Urgency" /></SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_URGENCIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4 space-y-4">
                <div className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Appointment Details</div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-slate-200">Appointment Type *</Label>
                    <Select value={form.appointmentType} onValueChange={(value) => setForm((prev) => ({ ...prev, appointmentType: value as AppointmentFormState["appointmentType"] }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Appointment type" /></SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_TYPES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {errors.appointmentType ? <p className="text-xs text-red-400">{errors.appointmentType}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Date *</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} className="bg-black/40 border-white/10 text-white" />
                    {errors.date ? <p className="text-xs text-red-400">{errors.date}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Time *</Label>
                    <Input type="time" value={form.time} onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))} className="bg-black/40 border-white/10 text-white" />
                    {errors.time ? <p className="text-xs text-red-400">{errors.time}</p> : null}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Duration</Label>
                    <Select value={form.duration} onValueChange={(value) => setForm((prev) => ({ ...prev, duration: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Duration" /></SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_DURATIONS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Status</Label>
                    <Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value as AppointmentFormState["status"] }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Status" /></SelectTrigger>
                      <SelectContent>
                        {APPOINTMENT_STATUSES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-slate-200">Property Interested</Label>
                    <Select value={form.propertyInterested} onValueChange={(value) => setForm((prev) => ({ ...prev, propertyInterested: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Select property" /></SelectTrigger>
                      <SelectContent>
                        {safeProperties.length ? (
                          safeProperties.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title || "Untitled property"} • {p.city || "City N/A"}, {p.country || "Country N/A"}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="TBD">No properties available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <div className="text-[11px] text-slate-500">Current selection: {propertyLabel}</div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Assigned Broker</Label>
                    <Select value={form.assignedBroker} onValueChange={(value) => setForm((prev) => ({ ...prev, assignedBroker: value }))}>
                      <SelectTrigger className="bg-black/40 border-white/10 text-white"><SelectValue placeholder="Assign broker" /></SelectTrigger>
                      <SelectContent>
                        {SEED_BROKERS.map((item) => <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-slate-200">Meeting Location</Label>
                    <Input value={form.meetingLocation} onChange={(e) => setForm((prev) => ({ ...prev, meetingLocation: e.target.value }))} placeholder="On-site / Office / Google Meet" className="bg-black/40 border-white/10 text-white" />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs text-slate-200">Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} placeholder="Context, preferences, or follow-up notes" className="min-h-24 bg-black/40 border-white/10 text-white" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button variant="ghost" onClick={() => { setAddOpen(false); resetForm(); }}>
                Close
              </Button>
              <Button onClick={() => void submitAdd()} className="neon-border bg-primary/90">
                Book Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reschedId} onOpenChange={(o) => !o && setReschedId(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">New date</div>
              <Input value={rDate} onChange={(e) => setRDate(e.target.value)} placeholder="May 22, 2026" className="bg-input/40" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">New time</div>
              <Input value={rTime} onChange={(e) => setRTime(e.target.value)} placeholder="3:00 PM" className="bg-input/40" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Notes</div>
              <Input value={rNotes} onChange={(e) => setRNotes(e.target.value)} placeholder="Reason / context" className="bg-input/40" />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setReschedId(null)}>
                Cancel
              </Button>
              <Button onClick={() => void submitReschedule()}>Save</Button>
            </div>
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
  return <RevenueCommandCenter />;
}

// =============== Brokers ===============
export function BrokersSection() {
  return <BrokerPerformanceCommandCenter />;
}

// =============== Investor Intelligence (AreaGrowthSection.tsx) ===============
export { InvestorSection } from "./AreaGrowthSection";

// =============== Reports ===============
import { cn } from "@/lib/utils";
import {
  type ReportRecord,
  type ReportFilters,
  type ReportType,
  type ReportStatus,
  fetchReports,
  fetchReportById,
  createReport,
  updateReport,
  deleteReport,
  downloadReportCSV,
  subscribeToReportsUpdates,
} from "@/lib/reports-api";

const REPORT_TYPES: ReportType[] = [
  "Lead Report",
  "Revenue Report",
  "Broker Performance Report",
  "Property Report",
  "Appointment Report",
  "Trust Verification Report",
  "AI Forecast Report",
  "Global Market Report",
];

const REPORT_STATUS: ReportStatus[] = ["Draft", "Ready", "Running", "Failed", "Archived"];

type ReportFilterState = {
  type: "All" | ReportType;
  country: "All" | string;
  status: "All" | ReportStatus;
  createdBy: "All" | string;
  dateRange: { startDate: string; endDate: string };
};

export function ReportsSection() {
  const { pushActivity } = useDashboard();
  const [reports, setReports] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<ReportFilterState>({
    type: "All",
    country: "All",
    status: "All",
    createdBy: "All",
    dateRange: { startDate: "", endDate: "" },
  });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<ReportRecord | null>(null);

  const [shareOpen, setShareOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const filterOptions = useMemo(() => {
    const creators = Array.from(new Set(reports.map((r) => r.created_by)));
    const countries = Array.from(new Set(reports.map((r) => r.country)));
    return {
      creators,
      countries,
    };
  }, [reports]);

  const appliedFilters = useMemo<Partial<ReportFilters>>(
    () => ({
      type: filters.type,
      country: filters.country,
      status: filters.status,
      createdBy: filters.createdBy,
      dateRange: filters.dateRange,
    }),
    [filters],
  );

  const loadReports = async () => {
    setLoading(true);
    const toastId = toast.loading("Loading reports…");
    try {
      const data = await fetchReports(appliedFilters);
      setReports(data);
      toast.success("Reports updated", { id: toastId });
    } catch {
      toast.error("Failed to load reports", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appliedFilters]);

  useEffect(() => {
    const unsub = subscribeToReportsUpdates((next) => {
      setReports((prev) => prev.map((r) => (r.report_id === next.report_id ? next : r)));
    });
    return () => {
      unsub?.();
    };
  }, []);

  const selected = useMemo(() => reports.find((r) => r.report_id === activeId) ?? null, [reports, activeId]);

  const handleView = async (reportId: string) => {
    setActiveId(reportId);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = await fetchReportById(reportId);
      setDetail(data);
      if (!data) toast.error("Report not found");
    } catch {
      toast.error("Failed to load report");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadCsv = async (reportId: string) => {
    const csv = await downloadReportCSV(reportId);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    const report = reports.find((r) => r.report_id === reportId);
    const name = report?.title ?? reportId;
    const url = URL.createObjectURL(blob);
    a.href = url;
    a.download = `${name.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushActivity(`Report CSV exported: ${name}`, "sparkles", "report");
    toast.success("CSV downloaded");
  };

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    void loadReports();
    toast.success("Reports refreshed");
  };

  const handleShare = () => {
    if (!selected) return;
    setShareOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      const ok = await deleteReport(deleteId);
      if (ok) {
        setReports((prev) => prev.filter((r) => r.report_id !== deleteId));
        toast.success("Report deleted");
      } else {
        toast.error("Failed to delete report");
      }
    } catch {
      toast.error("Failed to delete report");
    } finally {
      setDeleteId(null);
      setDeleteLoading(false);
    }
  };

  const handleCreateQuickReport = async () => {
    const base: Omit<ReportRecord, "report_id" | "created_at" | "updated_at" | "last_updated"> = {
      title: "Custom Lead Snapshot",
      type: "Lead Report",
      description: "Ad-hoc snapshot of current lead funnel (mock).",
      status: "Running",
      date_range: "Today",
      country: "Global",
      created_by: "System",
      data_count: 0,
      download_url: null,
    };
    const created = await createReport(base);
    setReports((prev) => [created, ...prev]);
    toast.success("Report generation queued (mock)");
  };

  const summaryCounts = useMemo(() => {
    const total = reports.length;
    const ready = reports.filter((r) => r.status === "Ready").length;
    const running = reports.filter((r) => r.status === "Running").length;
    const failed = reports.filter((r) => r.status === "Failed").length;
    return { total, ready, running, failed };
  }, [reports]);

  return (
    <div>
      <SectionHeader
        title="Reports"
        subtitle="Supabase-ready report catalog with CSV exports and AI-ready summaries."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <Download className="mr-2 h-3.5 w-3.5" />
            Refresh
          </Button>
          <Button size="sm" className="neon-border" onClick={() => void handleCreateQuickReport()}>
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            Quick Lead Snapshot
          </Button>
        </div>
      </SectionHeader>

      {/* Filters */}
      <GlowCard className="mb-4 !p-4 overflow-hidden">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(5,minmax(180px,1fr))]">
          <div className="space-y-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Report Type</div>
            <Select
              value={filters.type}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, type: v as ReportFilterState["type"] }))}
            >
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                {REPORT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Country</div>
            <Select
              value={filters.country}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, country: v as ReportFilterState["country"] }))}
            >
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                {filterOptions.countries.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Status</div>
            <Select
              value={filters.status}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, status: v as ReportFilterState["status"] }))}
            >
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                {REPORT_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Created By</div>
            <Select
              value={filters.createdBy}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, createdBy: v as ReportFilterState["createdBy"] }))}
            >
              <SelectTrigger className="border-white/10 bg-black/30 text-white">
                <SelectValue placeholder="Created By" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 text-white border-white/10">
                <SelectItem value="All">All</SelectItem>
                {filterOptions.creators.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Date Range</div>
            <div className="flex gap-2 flex-wrap">
              <Input
                type="date"
                value={filters.dateRange.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, startDate: e.target.value } }))
                }
                className="bg-input/40 border border-white/10 text-xs min-w-0 flex-1"
              />
              <Input
                type="date"
                value={filters.dateRange.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, endDate: e.target.value } }))
                }
                className="bg-input/40 border border-white/10 text-xs min-w-0 flex-1"
              />
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2 justify-between items-center">
          <div className="flex gap-2">
            <Badge variant="outline" className="border-white/10">
              Total: {summaryCounts.total}
            </Badge>
            <Badge variant="outline" className="border-emerald-400/40 text-emerald-300">
              Ready: {summaryCounts.ready}
            </Badge>
            <Badge variant="outline" className="border-cyan-400/40 text-cyan-200">
              Running: {summaryCounts.running}
            </Badge>
            {summaryCounts.failed ? (
              <Badge variant="outline" className="border-red-400/40 text-red-300">
                Failed: {summaryCounts.failed}
              </Badge>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setFilters({
                  type: "All",
                  country: "All",
                  status: "All",
                  createdBy: "All",
                  dateRange: { startDate: "", endDate: "" },
                })
              }
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </GlowCard>

      {/* Cards / table responsive layout */}
      <div className="hidden md:block">
        <GlowCard className="!p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10">
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date Range</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading reports…
                    </div>
                  </TableCell>
                </TableRow>
              ) : reports.length ? (
                reports.map((r) => (
                  <TableRow key={r.report_id} className="border-border/20 hover:bg-white/5">
                    <TableCell className="max-w-[220px]">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-primary/10 border border-primary/40 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{r.title}</div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {r.created_by} · {r.country}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{r.type}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{r.country}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border-white/10",
                          r.status === "Ready"
                            ? "text-emerald-300 border-emerald-400/40"
                            : r.status === "Running"
                              ? "text-cyan-200 border-cyan-400/40"
                              : r.status === "Failed"
                                ? "text-red-300 border-red-400/40"
                                : "text-slate-200",
                        )}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{r.date_range}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{r.data_count}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {new Date(r.last_updated).toLocaleString()}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-right">
                      <div className="inline-flex gap-1">
                        <Button size="xs" variant="outline" onClick={() => void handleView(r.report_id)}>
                          View
                        </Button>
                        <Button size="xs" variant="outline" onClick={() => void handleDownloadCsv(r.report_id)}>
                          CSV
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => toast.info("PDF export coming soon")}
                        >
                          PDF
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => {
                            setDeleteId(r.report_id);
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                    No reports found with current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </GlowCard>
      </div>

      {/* Mobile cards */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {loading ? (
          <GlowCard className="flex items-center gap-2 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading reports…</span>
          </GlowCard>
        ) : reports.length ? (
          reports.map((r) => (
            <GlowCard key={r.report_id} className="!p-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-md bg-primary/10 border border-primary/40 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.type} · {r.country}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    Rows: {r.data_count} · {new Date(r.last_updated).toLocaleTimeString()}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "border-white/10 text-[10px]",
                    r.status === "Ready"
                      ? "text-emerald-300 border-emerald-400/40"
                      : r.status === "Running"
                        ? "text-cyan-200 border-cyan-400/40"
                        : r.status === "Failed"
                          ? "text-red-300 border-red-400/40"
                          : "text-slate-200",
                  )}
                >
                  {r.status}
                </Badge>
              </div>

              <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.description}</p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="xs" className="neon-border" onClick={() => void handleView(r.report_id)}>
                  View Report
                </Button>
                <Button size="xs" variant="outline" onClick={() => void handleDownloadCsv(r.report_id)}>
                  CSV
                </Button>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => toast.info("PDF export coming soon")}
                >
                  PDF
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => {
                    setDeleteId(r.report_id);
                  }}
                >
                  Delete
                </Button>
              </div>
            </GlowCard>
          ))
        ) : (
          <GlowCard className="text-sm text-muted-foreground text-center py-6">
            No reports found with current filters.
          </GlowCard>
        )}
      </div>

      {/* Detail drawer (desktop) / full-screen (mobile) */}
      <Dialog
        open={detailOpen}
        onOpenChange={(o) => {
          if (!o) {
            setDetailOpen(false);
            setActiveId(null);
            setDetail(null);
            setShareOpen(false);
          }
        }}
      >
        <DialogContent className="glass-strong max-w-4xl max-h-[90vh] overflow-hidden p-0">
          <div className="h-full flex flex-col">
            <div className="px-6 pt-5 pb-3 border-b border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <DialogTitle className="text-lg">
                    {detail ? detail.title : selected?.title ?? "Report"}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-1">
                    {selected
                      ? `${selected.type} · ${selected.country} · ${selected.date_range}`
                      : null}
                  </DialogDescription>
                </div>
                {selected ? (
                  <Badge variant="outline" className="border-white/10 text-[11px]">
                    {selected.status}
                  </Badge>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4 space-y-4">
              {detailLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading report…
                </div>
              )}

              {selected && !detailLoading && (
                <>
                  {/* Summary KPIs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Mini label="Rows" value={String(selected.data_count)} />
                    <Mini
                      label="Status"
                      value={selected.status}
                      tone={
                        selected.status === "Ready"
                          ? "success"
                          : selected.status === "Running"
                            ? "info"
                            : selected.status === "Failed"
                              ? "danger"
                              : "muted"
                      }
                    />
                    <Mini
                      label="Last updated"
                      value={new Date(selected.last_updated).toLocaleString()}
                    />
                  </div>

                  {/* AI insight & description */}
                  <GlowCard className="!p-4">
                    <div className="flex items-start gap-3">
                      <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                      <div>
                        <div className="text-sm font-semibold">AI-ready description</div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selected.description}
                        </p>
                      </div>
                    </div>
                  </GlowCard>

                  {/* Placeholder data table + chart skeleton */}
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
                    <Card className="glass border-white/10 p-3">
                      <div className="text-sm font-semibold mb-2">Sample data table</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Later connect this to Supabase `reports` + `report_exports`.
                      </div>
                      <div className="border border-border/40 rounded-lg p-3 text-xs text-muted-foreground">
                        Data rows for this report will be hydrated from Supabase. For now we only
                        track meta fields like counts and status.
                      </div>
                    </Card>
                    <Card className="glass border-white/10 p-3">
                      <div className="text-sm font-semibold mb-2">Chart placeholder</div>
                      <div className="text-xs text-muted-foreground mb-2">
                        Plug charts into `report_exports` aggregated metrics.
                      </div>
                      <div className="h-32 rounded-lg border border-dashed border-border/50 flex items-center justify-center text-[11px] text-muted-foreground">
                        Chart area (connect to Supabase metrics later)
                      </div>
                    </Card>
                  </div>

                  {/* Recommended actions */}
                  <Card className="glass border-white/10 p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="text-sm font-semibold">Recommendations</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Use this report to drive weekly revenue and broker reviews.
                        </div>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDownloadCsv(selected.report_id)}
                        >
                          <Download className="mr-2 h-3.5 w-3.5" />
                          Export CSV
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toast.info("PDF export coming soon")}
                        >
                          <FileText className="mr-2 h-3.5 w-3.5" />
                          Download PDF
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleShare}
                        >
                          <Share2 className="mr-2 h-3.5 w-3.5" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share modal */}
      <Dialog open={shareOpen} onOpenChange={(o) => !o && setShareOpen(false)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>Share report</DialogTitle>
            <DialogDescription className="text-slate-400">
              Share via WhatsApp, email, or copy a link for this report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                const title = selected?.title ?? "Report";
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/reports/${selected?.report_id ?? ""}`
                    : "";
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`,
                  "_blank",
                  "noopener,noreferrer",
                );
                toast.success("WhatsApp opened");
              }}
              disabled={!selected}
            >
              <Share2 className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => {
                const title = selected?.title ?? "Report";
                const url =
                  typeof window !== "undefined"
                    ? `${window.location.origin}/reports/${selected?.report_id ?? ""}`
                    : "";
                window.location.href = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
                  url,
                )}`;
                toast.success("Email draft opened");
              }}
              disabled={!selected}
            >
              <Mail className="mr-2 h-4 w-4" />
              Email
            </Button>
            <Button
              className="w-full"
              variant="outline"
              onClick={async () => {
                try {
                  const url =
                    typeof window !== "undefined"
                      ? `${window.location.origin}/reports/${selected?.report_id ?? ""}`
                      : "";
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                } catch {
                  toast.error("Failed to copy link");
                }
              }}
              disabled={!selected}
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && !deleteLoading && setDeleteId(null)}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete report?</DialogTitle>
            <DialogDescription className="text-slate-400">
              This will remove the report metadata from the command center. Exports already
              downloaded will not be affected.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDelete()}
              disabled={deleteLoading}
            >
              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
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
  return <AiIntelligenceCommandHub />;
}

function Block({ label, body, accent }: { label: string; body: string; accent?: boolean }) {
  return <div className={`glass rounded-lg p-3 ${accent ? "neon-border" : ""}`}><div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">{label}</div><div className={`text-sm ${accent ? "neon-text font-medium" : ""}`}>{body}</div></div>;
}

// =============== Forecast (AI Market Forecasting Engine) ===============
export function ForecastSection() {
  return <AiMarketForecastingEngine />;
}

export { HeatmapsSection } from "./HeatmapsSection";
