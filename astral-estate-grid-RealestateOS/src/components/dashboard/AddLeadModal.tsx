import { useState } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import { COUNTRIES, BUDGETS, PROPERTY_TYPES, BUYER_TYPES, PURPOSES, TIMELINES, SOURCES, calcAiScore, calcUrgency, calcAction, type Lead } from "@/lib/dashboard-data";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AddLeadModal() {
  const { addLeadOpen, setAddLeadOpen, addLead } = useDashboard();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [openC, setOpenC] = useState(false);
  const [phone, setPhone] = useState("");
  const [otpStage, setOtpStage] = useState<"idle" | "sent" | "verifying" | "verified">("idle");
  const [otp, setOtp] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", budget: "", interestedCountry: "", city: "",
    propertyType: "", buyerType: "", purpose: "", timeline: "", source: "", notes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({ name: "", email: "", budget: "", interestedCountry: "", city: "", propertyType: "", buyerType: "", purpose: "", timeline: "", source: "", notes: "" });
    setPhone(""); setOtp(""); setOtpStage("idle"); setCountry(COUNTRIES[0]);
  };

  const sendOtp = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) {
      toast.error("Enter a valid phone number (7-15 digits)");
      return;
    }
    setOtpStage("sent");
    toast.success("OTP sent", { description: "Demo: enter any 4-digit code." });
  };

  const verifyOtp = () => {
    if (!/^\d{4}$/.test(otp)) {
      toast.error("Enter a 4-digit OTP");
      return;
    }
    setOtpStage("verifying");
    setTimeout(() => { setOtpStage("verified"); toast.success("Phone verified"); }, 600);
  };

  const submit = () => {
    if (!form.name || !phone || !form.budget || !form.interestedCountry || !form.propertyType || !form.buyerType || !form.purpose || !form.timeline || !form.source) {
      toast.error("Please fill all required fields");
      return;
    }
    const verified = otpStage === "verified";
    const fullPhone = `${country.code}${phone.replace(/\D/g, "")}`;
    const partial: Partial<Lead> = {
      budget: form.budget, buyerType: form.buyerType, timeline: form.timeline, purpose: form.purpose, verified,
    };
    const aiScore = calcAiScore(partial);
    const urgency = calcUrgency(form.timeline);
    const recommendedAction = calcAction(partial, urgency);
    addLead({
      id: Math.random().toString(36).slice(2, 10),
      name: form.name, phone: fullPhone, countryCode: country.code, email: form.email,
      budget: form.budget, country: form.interestedCountry, city: form.city,
      propertyType: form.propertyType, buyerType: form.buyerType, purpose: form.purpose,
      timeline: form.timeline, source: form.source, notes: form.notes,
      aiScore, urgency, recommendedAction, verified, createdAt: Date.now(),
    });
    reset();
    setAddLeadOpen(false);
  };

  return (
    <Dialog open={addLeadOpen} onOpenChange={(o) => { setAddLeadOpen(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl glass-strong border-border/60 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Lead</DialogTitle>
          <DialogDescription>AI will score this lead instantly upon submission.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Field label="Full Name *">
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. John Smith" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="name@email.com" />
          </Field>

          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
            <div className="flex gap-2 mt-1.5">
              <Popover open={openC} onOpenChange={setOpenC}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-[140px] justify-between bg-input/40">
                    <span>{country.flag} {country.code}</span>
                    <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[260px] p-0 glass-strong">
                  <Command>
                    <CommandInput placeholder="Search country…" />
                    <CommandList>
                      <CommandEmpty>No country.</CommandEmpty>
                      <CommandGroup>
                        {COUNTRIES.map(c => (
                          <CommandItem key={c.name + c.code} onSelect={() => { setCountry(c); setOpenC(false); }}>
                            <Check className={cn("h-4 w-4", country.name === c.name ? "opacity-100" : "opacity-0")} />
                            {c.flag} {c.name} <span className="ml-auto text-muted-foreground">{c.code}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Input value={phone} onChange={e => { setPhone(e.target.value); setOtpStage("idle"); }} placeholder="Phone number" className="flex-1" inputMode="tel" />
              {otpStage === "verified" ? (
                <Button disabled variant="outline" className="border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]">
                  <ShieldCheck className="h-4 w-4" /> Verified
                </Button>
              ) : (
                <Button type="button" onClick={sendOtp} variant="outline">Verify</Button>
              )}
            </div>
            {otpStage !== "idle" && otpStage !== "verified" && (
              <div className="flex gap-2 mt-2 items-center">
                <Input maxLength={4} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="4-digit OTP" className="w-32" />
                <Button onClick={verifyOtp} size="sm" disabled={otpStage === "verifying"}>
                  {otpStage === "verifying" && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Confirm
                </Button>
                <span className="text-xs text-muted-foreground">Demo: any 4-digit code works</span>
              </div>
            )}
          </div>

          <SelectField label="Budget Range *" value={form.budget} onChange={v => set("budget", v)} options={BUDGETS} />
          <Field label="Interested Country *">
            <Input value={form.interestedCountry} onChange={e => set("interestedCountry", e.target.value)} placeholder="e.g. UAE" />
          </Field>
          <Field label="City / Area">
            <Input value={form.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Dubai Marina" />
          </Field>
          <SelectField label="Property Type *" value={form.propertyType} onChange={v => set("propertyType", v)} options={PROPERTY_TYPES} />
          <SelectField label="Buyer Type *" value={form.buyerType} onChange={v => set("buyerType", v)} options={BUYER_TYPES} />
          <SelectField label="Purpose *" value={form.purpose} onChange={v => set("purpose", v)} options={PURPOSES} />
          <SelectField label="Timeline *" value={form.timeline} onChange={v => set("timeline", v)} options={TIMELINES} />
          <SelectField label="Lead Source *" value={form.source} onChange={v => set("source", v)} options={SOURCES} />

          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Additional context…" className="mt-1.5 bg-input/40" rows={3} />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => setAddLeadOpen(false)}>Cancel</Button>
          <Button onClick={submit} className="neon-border">Add Lead</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-input/40"><SelectValue placeholder="Select…" /></SelectTrigger>
        <SelectContent className="glass-strong">
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </Field>
  );
}
