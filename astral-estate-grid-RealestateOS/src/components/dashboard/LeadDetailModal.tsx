import { useDashboard } from "@/lib/dashboard-store";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Calendar, UserCheck, Flame, ShieldCheck, MapPin, Mail } from "lucide-react";
import { toast } from "sonner";
import { urgencyColor } from "@/components/dashboard/utils";

export function LeadDetailModal() {
  const { selectedLeadId, setSelectedLeadId, leads, updateLead, addAppointment, pushActivity } = useDashboard();
  const lead = leads.find(l => l.id === selectedLeadId) ?? null;

  if (!lead) return null;

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && setSelectedLeadId(null)}>
      <DialogContent className="max-w-2xl glass-strong border-border/60 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="sr-only">{lead.name}</DialogTitle>
        </DialogHeader>

        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 ring-2 ring-primary/40">
            <AvatarFallback className="bg-gradient-to-br from-primary/40 to-[oklch(0.7_0.25_300_/_0.4)] text-lg font-semibold">
              {lead.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-semibold">{lead.name}</h2>
              {lead.verified && <Badge variant="outline" className="border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
              <Badge variant="outline" className={urgencyColor(lead.urgency)}>{lead.urgency}</Badge>
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-3 mt-1 flex-wrap">
              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</span>
              {lead.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</span>}
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lead.city}, {lead.country}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-bold neon-text">{lead.aiScore}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Score</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <Stat label="Budget" value={lead.budget} />
          <Stat label="Property Type" value={lead.propertyType} />
          <Stat label="Buyer Type" value={lead.buyerType} />
          <Stat label="Purpose" value={lead.purpose} />
          <Stat label="Timeline" value={lead.timeline} />
          <Stat label="Source" value={lead.source} />
        </div>

        <div className="glass rounded-xl p-4 mt-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Recommended Action</div>
          <div className="text-base font-medium neon-text">→ {lead.recommendedAction}</div>
        </div>

        {lead.notes && (
          <div className="glass rounded-xl p-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Notes</div>
            <div className="text-sm">{lead.notes}</div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-2">
          <Button onClick={() => toast("Calling lead…", { description: lead.phone })} variant="outline"><Phone className="h-4 w-4" /> Call</Button>
          <Button onClick={() => toast("Opening WhatsApp follow-up…", { description: lead.name })} variant="outline"><MessageCircle className="h-4 w-4" /> WhatsApp</Button>
          <Button onClick={() => {
            addAppointment({
              id: Math.random().toString(36).slice(2), leadName: lead.name, property: "Auto-matched listing",
              date: new Date(Date.now() + 3 * 86400_000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              time: "11:00 AM", status: "Pending",
            });
            toast.success("Site visit booked");
          }} variant="outline"><Calendar className="h-4 w-4" /> Book Visit</Button>
          <Button onClick={() => { updateLead(lead.id, { recommendedAction: "Broker assigned: Layla Hassan" }); pushActivity(`Broker assigned to ${lead.name}`, "user-check", "broker"); toast.success("Broker assigned"); }} variant="outline"><UserCheck className="h-4 w-4" /> Assign</Button>
          <Button onClick={() => { updateLead(lead.id, { aiScore: 90, urgency: "High" }); toast.success("Marked as Hot Lead"); }} className="bg-gradient-to-r from-[oklch(0.65_0.24_22)] to-[oklch(0.7_0.25_50)] text-white"><Flame className="h-4 w-4" /> Hot</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-0.5 truncate">{value}</div>
    </div>
  );
}
