import { useMemo, useState, useEffect, useCallback, type MouseEvent } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { GlowCard, SectionHeader, urgencyColor, scoreColor } from "../utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  SlidersHorizontal,
  ShieldCheck,
  X,
  Phone,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
  MapPin,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BUDGETS, BUYER_TYPES, PROPERTY_TYPES, SOURCES, PURPOSES, COUNTRIES } from "@/lib/dashboard-data";
import {
  buildFullPhoneNumber,
  formatPhoneNumber,
  getNationalDigits,
  getPhonePlaceholder,
  getPhoneValidationError,
  getWhatsAppWaMeDigits,
  inferCountryCodeFromE164,
  resolveLeadPhoneFromRow,
  sanitizeNationalPhoneInput,
  getPhoneMaxNationalLength,
} from "@/lib/lead-phone-otp";
import type { Lead } from "@/lib/dashboard-data";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import {
  fetchLeads,
  fetchProfileByUserId,
  fetchWorkspaceIdFromMember,
  subscribeToLeadUpdates,
  updateLead,
  deleteLead,
} from "@/services/leadsService";
import { cn } from "@/lib/utils";
import type { LeadRow } from "@/types/lead";
import { toast } from "sonner";

const FILTERS_DISABLED = true;

const LEAD_STATUSES = [
  "New",
  "Contacted",
  "Qualified",
  "Site Visit",
  "Proposal",
  "Closed",
  "Lost",
] as const;

type LeadRowDb = LeadRow &
  Record<string, unknown> & {
    full_name?: string;
    name?: string;
    full_phone_number?: string;
    country_code?: string;
    area?: string;
    currency?: string;
    budget_range?: string;
    budget?: string;
    property_type?: string;
    buyer_type?: string;
    lead_source?: string;
    source?: string;
    purpose?: string;
    priority?: string;
    lead_score?: number;
    ai_score?: number;
    assigned_broker?: string;
    notes?: string;
    country?: string;
    city?: string;
  };

export type LeadRecord = Lead & {
  rowKey: string;
  status: string;
  fullPhoneNumber: string;
  phoneLocal: string;
  area: string;
  currency: string;
  priority: string;
  assignedBroker: string;
};

type EditLeadForm = {
  fullName: string;
  email: string;
  phone: string;
  fullPhoneNumber: string;
  countryCode: string;
  country: string;
  city: string;
  area: string;
  budgetRange: string;
  currency: string;
  propertyType: string;
  buyerType: string;
  purpose: string;
  leadSource: string;
  status: string;
  priority: string;
  leadScore: number;
  assignedBroker: string;
  notes: string;
};

function normalizeUrgency(status?: string | null, priority?: string | null): Lead["urgency"] {
  const raw = (priority ?? status ?? "medium").toLowerCase();
  if (raw === "critical") return "Critical";
  if (raw === "high") return "High";
  if (raw === "low") return "Low";
  return "Medium";
}

function mapLeadRowToLead(r: LeadRowDb, index: number): LeadRecord {
  const score =
    typeof r.lead_score === "number"
      ? r.lead_score
      : typeof r.ai_score === "number"
        ? r.ai_score
        : 0;

  const id = r.id != null && String(r.id).length > 0 ? String(r.id) : `lead-${index}`;
  const resolved = resolveLeadPhoneFromRow({
    country_code: r.country_code,
    phone: r.phone,
    full_phone_number: r.full_phone_number,
  });

  return {
    id,
    rowKey: `${id}-${index}`,
    name: String(r.full_name ?? r.name ?? "").trim(),
    phone: resolved.displayPhone || "—",
    countryCode: resolved.countryCode,
    email: String(r.email ?? "").trim(),
    budget: String(r.budget_range ?? r.budget ?? "").trim(),
    country: String(r.country ?? "").trim(),
    city: String(r.city ?? "").trim(),
    area: String(r.area ?? "").trim(),
    currency: String(r.currency ?? "").trim(),
    propertyType: String(r.property_type ?? "").trim(),
    buyerType: String(r.buyer_type ?? "").trim(),
    purpose: String(r.purpose ?? "Buy").trim(),
    timeline: "",
    source: String(r.lead_source ?? r.source ?? "").trim(),
    notes: String(r.notes ?? "").trim(),
    aiScore: score,
    urgency: normalizeUrgency(r.status, r.priority),
    recommendedAction: r.assigned_broker ? `Broker: ${r.assigned_broker}` : "Follow up",
    verified: Boolean(r.verified),
    createdAt: r.created_at ? Date.parse(String(r.created_at)) : Date.now(),
    status: String(r.status ?? "New").trim() || "New",
    fullPhoneNumber: resolved.fullPhoneE164,
    phoneLocal: resolved.phoneLocal,
    priority: String(r.priority ?? "").trim(),
    assignedBroker: String(r.assigned_broker ?? "").trim(),
  };
}

function leadToEditForm(lead: LeadRecord): EditLeadForm {
  const countryCode =
    lead.countryCode || inferCountryCodeFromE164(lead.fullPhoneNumber) || COUNTRIES[0].code;
  const phoneLocal = lead.phoneLocal || getNationalDigits(lead.fullPhoneNumber);
  return {
    fullName: lead.name,
    email: lead.email,
    phone: phoneLocal,
    fullPhoneNumber: lead.fullPhoneNumber || buildFullPhoneNumber(countryCode, phoneLocal),
    countryCode,
    country: lead.country,
    city: lead.city,
    area: lead.area,
    budgetRange: lead.budget,
    currency: lead.currency,
    propertyType: lead.propertyType,
    buyerType: lead.buyerType,
    purpose: lead.purpose,
    leadSource: lead.source,
    status: lead.status || "New",
    priority: lead.priority,
    leadScore: lead.aiScore,
    assignedBroker: lead.assignedBroker,
    notes: lead.notes ?? "",
  };
}

function editFormToPatch(form: EditLeadForm): Partial<LeadRow> & Record<string, unknown> {
  const national = getNationalDigits(form.phone);
  const countryCode = form.countryCode;
  const fullPhone = buildFullPhoneNumber(countryCode, national);
  return {
    full_name: form.fullName,
    name: form.fullName,
    email: form.email || null,
    phone: national || null,
    full_phone_number: fullPhone || null,
    country_code: countryCode || null,
    country: form.country || null,
    city: form.city || null,
    area: form.area || null,
    budget_range: form.budgetRange || null,
    budget: form.budgetRange || null,
    currency: form.currency || null,
    property_type: form.propertyType || null,
    buyer_type: form.buyerType || null,
    purpose: form.purpose || null,
    lead_source: form.leadSource || null,
    source: form.leadSource || null,
    status: form.status || null,
    priority: form.priority || null,
    lead_score: form.leadScore,
    ai_score: form.leadScore,
    assigned_broker: form.assignedBroker || null,
    notes: form.notes || null,
  };
}

function getTelHref(lead: LeadRecord): string | null {
  const digits = getWhatsAppWaMeDigits(lead.fullPhoneNumber);
  return digits ? `tel:+${digits}` : null;
}

function formatCreatedDate(ts: number): string {
  if (!ts || Number.isNaN(ts)) return "—";
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function stopCardClick(e: MouseEvent) {
  e.stopPropagation();
}

export function LeadsSection() {
  const { setAddLeadOpen, leadFilters, setLeadFilters } = useDashboard();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState("ai");
  const [filterOpen, setFilterOpen] = useState(false);

  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [detailLeadId, setDetailLeadId] = useState<string | null>(null);
  const [editLeadId, setEditLeadId] = useState<string | null>(null);
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditLeadForm | null>(null);
  const [saving, setSaving] = useState(false);

  const detailLead = useMemo(
    () => leads.find((l) => l.id === detailLeadId) ?? null,
    [leads, detailLeadId],
  );
  const deleteLeadRecord = useMemo(
    () => leads.find((l) => l.id === deleteLeadId) ?? null,
    [leads, deleteLeadId],
  );

  const replaceLeadInList = useCallback((row: LeadRowDb) => {
    setLeads((prev) => {
      const idx = prev.findIndex((l) => l.id === String(row.id));
      const mapped = mapLeadRowToLead(row, idx >= 0 ? idx : prev.length);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...mapped, rowKey: prev[idx].rowKey };
        return next;
      }
      return [{ ...mapped, rowKey: `${mapped.id}-${prev.length}` }, ...prev];
    });
  }, []);

  const loadLeads = useCallback(async (wsId: string) => {
    try {
      const rows = await fetchLeads(wsId);
      const mapped = rows.map((row, index) => mapLeadRowToLead(row as LeadRowDb, index));
      setLeads(mapped);
      setFetchError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load leads";
      setFetchError(msg);
      setLeads([]);
    }
  }, []);

  const resolveWorkspaceAndFetch = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setLeads([]);

    if (!isSupabaseConfigured()) {
      setFetchError("Supabase is not configured");
      setLoading(false);
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setFetchError("Supabase client unavailable");
      setLoading(false);
      return;
    }

    const { data: authData, error: authErr } = await sb.auth.getUser();
    if (authErr || !authData?.user?.id) {
      setFetchError(authErr?.message ?? "No authenticated user session");
      setLoading(false);
      return;
    }

    const profile = await fetchProfileByUserId(authData.user.id);
    let wsId = profile.workspace_id ?? (await fetchWorkspaceIdFromMember(authData.user.id));
    setWorkspaceId(wsId);

    if (!wsId) {
      setFetchError("workspace_id not found on profile or workspace_members");
      setLoading(false);
      return;
    }

    await loadLeads(wsId);
    setLoading(false);
  }, [loadLeads]);

  useEffect(() => {
    void resolveWorkspaceAndFetch();
  }, [resolveWorkspaceAndFetch]);

  useEffect(() => {
    if (!workspaceId) return;
    const unsub = subscribeToLeadUpdates(workspaceId, (payload) => {
      const p = payload as {
        eventType?: string;
        new?: LeadRowDb;
        old?: LeadRowDb;
      };
      if (p.eventType === "DELETE" && p.old?.id) {
        const deletedId = String(p.old.id);
        setLeads((prev) => prev.filter((l) => l.id !== deletedId));
        if (detailLeadId === deletedId) setDetailLeadId(null);
        if (editLeadId === deletedId) setEditLeadId(null);
        return;
      }
      const row = p.new;
      if (!row?.id) return;
      replaceLeadInList(row);
    });
    return unsub;
  }, [workspaceId, replaceLeadInList, detailLeadId, editLeadId]);

  const handleWhatsApp = useCallback((lead: LeadRecord, e?: MouseEvent) => {
    e?.stopPropagation();
    const digits = getWhatsAppWaMeDigits(lead.fullPhoneNumber);
    if (!digits) {
      toast.error("Phone number not available");
      return;
    }
    window.open(`https://wa.me/${digits}`, "_blank", "noopener,noreferrer");
  }, []);

  const handleCall = useCallback((lead: LeadRecord, e?: MouseEvent) => {
    e?.stopPropagation();
    const href = getTelHref(lead);
    if (!href) {
      toast.error("Phone number not available");
      return;
    }
    window.location.href = href;
  }, []);

  const handleEmail = useCallback((lead: LeadRecord, e?: MouseEvent) => {
    e?.stopPropagation();
    if (!lead.email?.trim()) {
      toast.error("Email not available");
      return;
    }
    window.location.href = `mailto:${encodeURIComponent(lead.email.trim())}`;
  }, []);

  const handleStatusChange = useCallback(
    async (leadId: string, status: string) => {
      try {
        const row = await updateLead(leadId, { status });
        if (row) replaceLeadInList(row as LeadRowDb);
        else {
          setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status } : l)));
        }
        toast.success("Status updated");
      } catch (err) {
        console.error(err);
        toast.error("Failed to update status");
      }
    },
    [replaceLeadInList],
  );

  const openEdit = useCallback((lead: LeadRecord, e?: MouseEvent) => {
    e?.stopPropagation();
    setEditForm(leadToEditForm(lead));
    setEditLeadId(lead.id);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editLeadId || !editForm) return;
    const phoneErr = getPhoneValidationError(editForm.countryCode, editForm.phone);
    if (phoneErr) {
      toast.error(phoneErr);
      return;
    }
    setSaving(true);
    try {
      const row = await updateLead(editLeadId, editFormToPatch(editForm));
      if (row) replaceLeadInList(row as LeadRowDb);
      toast.success("Lead updated");
      setEditLeadId(null);
      setEditForm(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save lead");
    } finally {
      setSaving(false);
    }
  }, [editLeadId, editForm, replaceLeadInList]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteLeadId) return;
    setSaving(true);
    try {
      await deleteLead(deleteLeadId);
      setLeads((prev) => prev.filter((l) => l.id !== deleteLeadId));
      if (detailLeadId === deleteLeadId) setDetailLeadId(null);
      toast.success("Lead deleted");
      setDeleteLeadId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete lead");
    } finally {
      setSaving(false);
    }
  }, [deleteLeadId, detailLeadId]);

  const filtered = useMemo(() => {
    if (FILTERS_DISABLED) return leads;
    let out = leads.slice();
    if (leadFilters.hot) out = out.filter((l) => l.aiScore >= 75);
    if (leadFilters.budget) out = out.filter((l) => l.budget === leadFilters.budget);
    if (leadFilters.propertyType) out = out.filter((l) => l.propertyType === leadFilters.propertyType);
    if (leadFilters.buyerType) out = out.filter((l) => l.buyerType === leadFilters.buyerType);
    if (leadFilters.urgency) out = out.filter((l) => l.urgency === leadFilters.urgency);
    if (leadFilters.source) out = out.filter((l) => l.source === leadFilters.source);
    if (leadFilters.country)
      out = out.filter((l) => l.country.toLowerCase().includes(leadFilters.country!.toLowerCase()));
    if (leadFilters.city) out = out.filter((l) => l.city.toLowerCase().includes(leadFilters.city!.toLowerCase()));
    if (q) {
      const lo = q.toLowerCase();
      out = out.filter(
        (l) =>
          l.name.toLowerCase().includes(lo) ||
          l.phone.includes(q) ||
          l.city.toLowerCase().includes(lo) ||
          l.email.toLowerCase().includes(lo),
      );
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
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search leads…"
            className="pl-9 w-56 bg-input/40"
            disabled={FILTERS_DISABLED}
          />
        </div>
        <Button variant="outline" onClick={() => setFilterOpen(true)}>
          <SlidersHorizontal className="h-4 w-4" /> Filters
        </Button>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-44 bg-input/40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass-strong">
            <SelectItem value="ai">AI Priority</SelectItem>
            <SelectItem value="recent">Most Recent</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setAddLeadOpen(true)} className="neon-border bg-primary/90 hover:bg-primary">
          <Plus className="h-4 w-4" /> Add Lead
        </Button>
      </SectionHeader>

      {loading ? (
        <GlowCard className="text-center py-16 text-muted-foreground">Loading workspace and leads…</GlowCard>
      ) : fetchError && leads.length === 0 ? (
        <GlowCard className="text-center py-16 text-muted-foreground">{fetchError}</GlowCard>
      ) : filtered.length === 0 ? (
        <GlowCard className="text-center py-16 text-muted-foreground">No leads found for this workspace.</GlowCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((l) => (
            <GlowCard
              key={l.rowKey}
              className="cursor-pointer"
              onClick={() => setDetailLeadId(l.id)}
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12 ring-2 ring-primary/30">
                  <AvatarFallback className="bg-gradient-to-br from-primary/40 to-[oklch(0.7_0.25_300_/_0.4)] text-sm font-semibold">
                    {l.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold truncate">{l.name || "Unnamed lead"}</span>
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
                  <div className="text-xs text-muted-foreground truncate">
                    {l.phone && l.phone !== "—" ? l.phone : l.email || "—"}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${scoreColor(l.aiScore)}`}>{l.aiScore}</div>
                  <div className="text-[9px] uppercase tracking-widest text-muted-foreground">Score</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <Info label="Budget" value={l.budget || "—"} />
                <Info label="Location" value={[l.city, l.country].filter(Boolean).join(", ") || "—"} />
                <Info label="Property" value={l.propertyType || "—"} />
                <Info label="Status" value={l.status || "—"} />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <Badge variant="outline" className={urgencyColor(l.urgency)}>
                  {l.urgency}
                </Badge>
                {l.source ? <Badge variant="outline">{l.source}</Badge> : null}
              </div>
              <LeadQuickActions
                lead={l}
                onWhatsApp={handleWhatsApp}
                onCall={handleCall}
                onEmail={handleEmail}
                onEdit={openEdit}
                onDelete={(lead, e) => {
                  stopCardClick(e);
                  setDeleteLeadId(lead.id);
                }}
              />
            </GlowCard>
          ))}
        </div>
      )}

      <LeadDetailSheet
        lead={detailLead}
        open={!!detailLead}
        onOpenChange={(open) => !open && setDetailLeadId(null)}
        onWhatsApp={handleWhatsApp}
        onCall={handleCall}
        onEmail={handleEmail}
        onEdit={openEdit}
        onDelete={(lead) => setDeleteLeadId(lead.id)}
        onStatusChange={handleStatusChange}
      />

      <LeadEditDialog
        open={!!editLeadId && !!editForm}
        form={editForm}
        saving={saving}
        onOpenChange={(open) => {
          if (!open) {
            setEditLeadId(null);
            setEditForm(null);
          }
        }}
        onChange={setEditForm}
        onSave={() => void handleSaveEdit()}
      />

      <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete lead?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {deleteLeadRecord?.name || "this lead"} from your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Filter Leads</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <FSelect label="Budget" value={leadFilters.budget} onChange={(v) => setLeadFilters({ ...leadFilters, budget: v })} options={BUDGETS} />
            <FSelect
              label="Property Type"
              value={leadFilters.propertyType}
              onChange={(v) => setLeadFilters({ ...leadFilters, propertyType: v })}
              options={PROPERTY_TYPES}
            />
            <FSelect label="Buyer Type" value={leadFilters.buyerType} onChange={(v) => setLeadFilters({ ...leadFilters, buyerType: v })} options={BUYER_TYPES} />
            <FSelect label="Urgency" value={leadFilters.urgency} onChange={(v) => setLeadFilters({ ...leadFilters, urgency: v })} options={["Critical", "High", "Medium", "Low"]} />
            <FSelect label="Source" value={leadFilters.source} onChange={(v) => setLeadFilters({ ...leadFilters, source: v })} options={SOURCES} />
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">Country</div>
              <Input
                value={leadFilters.country ?? ""}
                onChange={(e) => setLeadFilters({ ...leadFilters, country: e.target.value })}
                className="bg-input/40"
              />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">City / Area</div>
              <Input value={leadFilters.city ?? ""} onChange={(e) => setLeadFilters({ ...leadFilters, city: e.target.value })} className="bg-input/40" />
            </div>
          </div>
          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => setLeadFilters({})}>
              Clear
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeadQuickActions({
  lead,
  onWhatsApp,
  onCall,
  onEmail,
  onEdit,
  onDelete,
}: {
  lead: LeadRecord;
  onWhatsApp: (l: LeadRecord, e: MouseEvent) => void;
  onCall: (l: LeadRecord, e: MouseEvent) => void;
  onEmail: (l: LeadRecord, e: MouseEvent) => void;
  onEdit: (l: LeadRecord, e: MouseEvent) => void;
  onDelete: (l: LeadRecord, e: MouseEvent) => void;
}) {
  return (
    <div
      className="mt-3 pt-3 border-t border-border/50 flex flex-wrap gap-1.5"
      onClick={stopCardClick}
      onKeyDown={(e) => e.stopPropagation()}
      role="group"
      aria-label="Lead actions"
    >
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => onWhatsApp(lead, e)}>
        <MessageCircle className="h-3.5 w-3.5" /> WA
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => onCall(lead, e)}>
        <Phone className="h-3.5 w-3.5" /> Call
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => onEmail(lead, e)}>
        <Mail className="h-3.5 w-3.5" /> Email
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1" onClick={(e) => onEdit(lead, e)}>
        <Pencil className="h-3.5 w-3.5" /> Edit
      </Button>
      <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-destructive hover:text-destructive" onClick={(e) => onDelete(lead, e)}>
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function LeadDetailSheet({
  lead,
  open,
  onOpenChange,
  onWhatsApp,
  onCall,
  onEmail,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  lead: LeadRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWhatsApp: (l: LeadRecord, e?: MouseEvent) => void;
  onCall: (l: LeadRecord, e?: MouseEvent) => void;
  onEmail: (l: LeadRecord, e?: MouseEvent) => void;
  onEdit: (l: LeadRecord, e?: MouseEvent) => void;
  onDelete: (l: LeadRecord) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto glass-strong border-border/60 max-sm:max-w-full max-sm:w-full max-sm:h-[100dvh] max-sm:rounded-none"
      >
        <SheetHeader className="text-left pr-8">
          <SheetTitle className="text-xl">{lead.name || "Lead details"}</SheetTitle>
          <SheetDescription className="flex items-center gap-1 flex-wrap">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {[lead.city, lead.area, lead.country].filter(Boolean).join(", ") || "Location not set"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center gap-3 mt-4">
          <div className={`text-3xl font-bold ${scoreColor(lead.aiScore)}`}>{lead.aiScore}</div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Lead score</div>
            {lead.verified && (
              <Badge variant="outline" className="mt-1 border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]">
                <ShieldCheck className="h-3 w-3 mr-1" /> Verified
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
          <Select value={lead.status || "New"} onValueChange={(v) => onStatusChange(lead.id, v)}>
            <SelectTrigger className="mt-1.5 bg-input/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong">
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
          <DetailField label="Full name" value={lead.name} />
          <DetailField label="Email" value={lead.email} />
          <DetailField label="Phone" value={lead.phone} />
          <DetailField
            label="Full phone number"
            value={formatPhoneNumber(lead.countryCode, lead.phoneLocal) || lead.phone}
          />
          <DetailField label="Country" value={lead.country} />
          <DetailField label="City" value={lead.city} />
          <DetailField label="Area" value={lead.area} />
          <DetailField label="Budget range" value={lead.budget} />
          <DetailField label="Currency" value={lead.currency} />
          <DetailField label="Property type" value={lead.propertyType} />
          <DetailField label="Buyer type" value={lead.buyerType} />
          <DetailField label="Purpose" value={lead.purpose} />
          <DetailField label="Lead source" value={lead.source} />
          <DetailField label="Priority" value={lead.priority} />
          <DetailField label="Assigned broker" value={lead.assignedBroker} />
          <DetailField label="Created" value={formatCreatedDate(lead.createdAt)} className="sm:col-span-2" />
        </div>

        {lead.notes ? (
          <div className="glass rounded-xl p-4 mt-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Notes</div>
            <p className="text-sm whitespace-pre-wrap">{lead.notes}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-6 sticky bottom-0 pb-2 bg-background/80 backdrop-blur-sm pt-2">
          <Button type="button" variant="outline" onClick={() => onWhatsApp(lead)}>
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button type="button" variant="outline" onClick={() => onCall(lead)}>
            <Phone className="h-4 w-4" /> Call
          </Button>
          <Button type="button" variant="outline" onClick={() => onEmail(lead)}>
            <Mail className="h-4 w-4" /> Email
          </Button>
          <Button type="button" variant="outline" onClick={() => onEdit(lead)}>
            <Pencil className="h-4 w-4" /> Edit
          </Button>
          <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(lead)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LeadEditDialog({
  open,
  form,
  saving,
  onOpenChange,
  onChange,
  onSave,
}: {
  open: boolean;
  form: EditLeadForm | null;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (f: EditLeadForm | null) => void;
  onSave: () => void;
}) {
  if (!form) return null;

  const set = (patch: Partial<EditLeadForm>) => onChange({ ...form, ...patch });
  const phoneError = getPhoneValidationError(form.countryCode, form.phone);
  const formattedPreview = formatPhoneNumber(form.countryCode, form.phone);
  const dialCountry =
    COUNTRIES.find((c) => c.code === form.countryCode) ?? COUNTRIES[0];
  const phoneMaxLen = getPhoneMaxNationalLength(form.countryCode || dialCountry.code);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit lead</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Full name" value={form.fullName} onChange={(v) => set({ fullName: v })} />
          <FormField label="Email" value={form.email} onChange={(v) => set({ email: v })} />
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone country *</Label>
            <Select
              value={form.countryCode || dialCountry.code}
              onValueChange={(code) => {
                const c = COUNTRIES.find((x) => x.code === code) ?? dialCountry;
                set({
                  countryCode: c.code,
                  phone: sanitizeNationalPhoneInput(form.phone, c.code),
                  fullPhoneNumber: buildFullPhoneNumber(c.code, sanitizeNationalPhoneInput(form.phone, c.code)),
                });
              }}
            >
              <SelectTrigger className="bg-input/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={`${c.name}-${c.code}`} value={c.code}>
                    {c.flag} {c.name} ({c.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone number *</Label>
            <Input
              className="bg-input/40"
              value={form.phone}
              onChange={(e) => {
                const national = sanitizeNationalPhoneInput(e.target.value, form.countryCode);
                set({
                  phone: national,
                  fullPhoneNumber: buildFullPhoneNumber(form.countryCode, national),
                });
              }}
              placeholder={getPhonePlaceholder(form.countryCode)}
              inputMode="tel"
              maxLength={phoneMaxLen}
            />
            {phoneError ? <p className="text-xs text-rose-400">{phoneError}</p> : null}
            {formattedPreview ? (
              <p className="text-xs text-muted-foreground">Formatted: {formattedPreview}</p>
            ) : null}
          </div>
          <FormField label="Country (location)" value={form.country} onChange={(v) => set({ country: v })} />
          <FormField label="City" value={form.city} onChange={(v) => set({ city: v })} />
          <FormField label="Area" value={form.area} onChange={(v) => set({ area: v })} />
          <FormField label="Currency" value={form.currency} onChange={(v) => set({ currency: v })} />
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Budget range</Label>
            <Select value={form.budgetRange || ""} onValueChange={(v) => set({ budgetRange: v })}>
              <SelectTrigger className="mt-1.5 bg-input/40">
                <SelectValue placeholder="Select budget" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {BUDGETS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Property type</Label>
            <Select value={form.propertyType || ""} onValueChange={(v) => set({ propertyType: v })}>
              <SelectTrigger className="mt-1.5 bg-input/40">
                <SelectValue placeholder="Property type" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {PROPERTY_TYPES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Buyer type</Label>
            <Select value={form.buyerType || ""} onValueChange={(v) => set({ buyerType: v })}>
              <SelectTrigger className="mt-1.5 bg-input/40">
                <SelectValue placeholder="Buyer type" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {BUYER_TYPES.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Purpose</Label>
            <Select value={form.purpose || ""} onValueChange={(v) => set({ purpose: v })}>
              <SelectTrigger className="mt-1.5 bg-input/40">
                <SelectValue placeholder="Purpose" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {PURPOSES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Lead source</Label>
            <Select value={form.leadSource || ""} onValueChange={(v) => set({ leadSource: v })}>
              <SelectTrigger className="mt-1.5 bg-input/40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {SOURCES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={form.status} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger className="mt-1.5 bg-input/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <FormField label="Priority" value={form.priority} onChange={(v) => set({ priority: v })} />
          <FormField label="Lead score" value={String(form.leadScore)} onChange={(v) => set({ leadScore: Number(v) || 0 })} />
          <FormField label="Assigned broker" value={form.assignedBroker} onChange={(v) => set({ assignedBroker: v })} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea className="mt-1.5 bg-input/40 min-h-[88px]" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onSave}
            disabled={saving || !!phoneError}
            className="neon-border"
          >
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetailField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("glass rounded-lg p-3", className)}>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 break-words">{value || "—"}</div>
    </div>
  );
}

function FormField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input className="mt-1.5 bg-input/40" value={value} onChange={(e) => onChange(e.target.value)} />
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

function FSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      <Select value={value ?? ""} onValueChange={onChange}>
        <SelectTrigger className="bg-input/40">
          <SelectValue placeholder="Any" />
        </SelectTrigger>
        <SelectContent className="glass-strong">
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
