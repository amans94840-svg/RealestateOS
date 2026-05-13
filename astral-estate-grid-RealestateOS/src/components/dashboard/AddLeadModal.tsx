import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useDashboard } from "@/lib/dashboard-store";
import {
  COUNTRIES,
  BUDGETS,
  PROPERTY_TYPES,
  BUYER_TYPES,
  PURPOSES,
  TIMELINES,
  SOURCES,
  calcAiScore,
  calcUrgency,
  calcAction,
  type Lead,
} from "@/lib/dashboard-data";
import {
  buildFullPhoneNumber,
  getNationalDigits,
  isValidNationalPhoneDigits,
  resendOtp,
  sendOtp,
  verifyOtp,
} from "@/lib/lead-phone-otp";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [devMockOtp, setDevMockOtp] = useState<string | null>(null);
  const [resendCooldownUntil, setResendCooldownUntil] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [form, setForm] = useState({
    name: "",
    email: "",
    budget: "",
    interestedCountry: "",
    city: "",
    propertyType: "",
    buyerType: "",
    purpose: "",
    timeline: "",
    source: "",
    notes: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const nationalDigits = useMemo(() => getNationalDigits(phone), [phone]);
  const phoneValid = isValidNationalPhoneDigits(nationalDigits);

  useEffect(() => {
    if (!resendCooldownUntil || Date.now() >= resendCooldownUntil) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [resendCooldownUntil]);

  const resendCooldownLeftSec = useMemo(() => {
    if (!resendCooldownUntil) return 0;
    return Math.max(0, Math.ceil((resendCooldownUntil - nowTick) / 1000));
  }, [resendCooldownUntil, nowTick]);

  const reset = useCallback(() => {
    setForm({
      name: "",
      email: "",
      budget: "",
      interestedCountry: "",
      city: "",
      propertyType: "",
      buyerType: "",
      purpose: "",
      timeline: "",
      source: "",
      notes: "",
    });
    setPhone("");
    setPhoneVerified(false);
    setOtpSent(false);
    setOtp("");
    setDevMockOtp(null);
    setResendCooldownUntil(null);
    setSending(false);
    setVerifying(false);
    setCountry(COUNTRIES[0]);
  }, []);

  const invalidateOtpFlow = useCallback(() => {
    setOtpSent(false);
    setOtp("");
    setDevMockOtp(null);
    setResendCooldownUntil(null);
  }, []);

  const handlePhoneChange = (v: string) => {
    if (phoneVerified) return;
    setPhone(v);
    invalidateOtpFlow();
  };

  const handleCountrySelect = (c: (typeof COUNTRIES)[number]) => {
    if (phoneVerified) return;
    setCountry(c);
    setOpenC(false);
    invalidateOtpFlow();
  };

  const runSendOrResend = useCallback(async () => {
    if (phoneVerified) return;
    if (!isValidNationalPhoneDigits(nationalDigits)) {
      toast.error("Please enter a valid phone number");
      return;
    }
    const dest = buildFullPhoneNumber(country.code, nationalDigits);
    setSending(true);
    try {
      const result = await sendOtp(dest);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setOtpSent(true);
      setOtp("");
      setDevMockOtp(result.devMockOtp ?? null);
      setResendCooldownUntil(Date.now() + 30_000);
      toast.success("OTP sent successfully");
    } finally {
      setSending(false);
    }
  }, [country.code, nationalDigits, phoneVerified]);

  const handleResend = useCallback(async () => {
    if (phoneVerified || !otpSent || resendCooldownLeftSec > 0 || sending) return;
    setSending(true);
    try {
      const dest = buildFullPhoneNumber(country.code, nationalDigits);
      const result = await resendOtp(dest);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setOtp("");
      setDevMockOtp(result.devMockOtp ?? null);
      setResendCooldownUntil(Date.now() + 30_000);
      toast.success("OTP sent successfully");
    } finally {
      setSending(false);
    }
  }, [country.code, nationalDigits, otpSent, phoneVerified, resendCooldownLeftSec, sending]);

  const handleVerifyOtp = useCallback(async () => {
    if (phoneVerified || !otpSent) return;
    const cleaned = otp.replace(/\D/g, "");
    if (cleaned.length !== 6) {
      toast.error("Please enter the 6-digit OTP");
      return;
    }
    setVerifying(true);
    try {
      const dest = buildFullPhoneNumber(country.code, nationalDigits);
      const ok = await verifyOtp(dest, cleaned);
      if (!ok) {
        toast.error("Invalid OTP");
        return;
      }
      setPhoneVerified(true);
      setOtpSent(false);
      setOtp("");
      setDevMockOtp(null);
      setResendCooldownUntil(null);
      toast.success("Phone number verified successfully");
    } finally {
      setVerifying(false);
    }
  }, [country.code, nationalDigits, otp, otpSent, phoneVerified]);

  const handleChangeNumber = useCallback(() => {
    setPhoneVerified(false);
    setOtpSent(false);
    setOtp("");
    setDevMockOtp(null);
    setResendCooldownUntil(null);
  }, []);

  const submit = () => {
    if (!phoneVerified) {
      toast.error("Please verify phone number before saving lead");
      return;
    }
    if (!form.name || !phone || !form.budget || !form.interestedCountry || !form.propertyType || !form.buyerType || !form.purpose || !form.timeline || !form.source) {
      toast.error("Please fill all required fields");
      return;
    }
    const national = getNationalDigits(phone);
    const fullPhone = buildFullPhoneNumber(country.code, national);
    const partial: Partial<Lead> = {
      budget: form.budget,
      buyerType: form.buyerType,
      timeline: form.timeline,
      purpose: form.purpose,
      verified: true,
    };
    const aiScore = calcAiScore(partial);
    const urgency = calcUrgency(form.timeline);
    const recommendedAction = calcAction(partial, urgency);
    addLead({
      id: Math.random().toString(36).slice(2, 10),
      name: form.name,
      phone: fullPhone,
      countryCode: country.code,
      email: form.email,
      budget: form.budget,
      country: form.interestedCountry,
      city: form.city,
      propertyType: form.propertyType,
      buyerType: form.buyerType,
      purpose: form.purpose,
      timeline: form.timeline,
      source: form.source,
      notes: form.notes,
      aiScore,
      urgency,
      recommendedAction,
      verified: true,
      createdAt: Date.now(),
    });
    reset();
    setAddLeadOpen(false);
  };

  const phoneLocked = phoneVerified;

  return (
    <Dialog
      open={addLeadOpen}
      onOpenChange={(o) => {
        setAddLeadOpen(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-2xl glass-strong border-border/60 max-h-[90vh] overflow-y-auto scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Lead</DialogTitle>
          <DialogDescription>AI will score this lead instantly upon submission.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <Field label="Full Name *">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. John Smith" />
          </Field>
          <Field label="Email">
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@email.com" />
          </Field>

          <div className="md:col-span-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
              {phoneVerified && (
                <Badge variant="outline" className="border-[oklch(0.82_0.2_150_/_0.55)] bg-[oklch(0.82_0.2_150_/_0.12)] text-[oklch(0.82_0.2_150)] gap-1 text-[10px]">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
              <div className="flex gap-2 flex-1 min-w-0">
                <Popover open={openC} onOpenChange={setOpenC}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={phoneLocked}
                      className="w-[140px] shrink-0 justify-between bg-input/40"
                    >
                      <span>
                        {country.flag} {country.code}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0 glass-strong">
                    <Command>
                      <CommandInput placeholder="Search country…" />
                      <CommandList>
                        <CommandEmpty>No country.</CommandEmpty>
                        <CommandGroup>
                          {COUNTRIES.map((c) => (
                            <CommandItem
                              key={c.name + c.code}
                              onSelect={() => handleCountrySelect(c)}
                            >
                              <Check className={cn("h-4 w-4", country.name === c.name ? "opacity-100" : "opacity-0")} />
                              {c.flag} {c.name} <span className="ml-auto text-muted-foreground">{c.code}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <Input
                  value={phone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="National number (7–15 digits)"
                  className="flex-1 min-w-0 bg-input/40"
                  inputMode="tel"
                  disabled={phoneLocked}
                  autoComplete="tel-national"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {!phoneVerified && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={sending || !phoneValid || otpSent}
                    onClick={() => void runSendOrResend()}
                  >
                    {sending && !otpSent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Send OTP
                  </Button>
                  {otpSent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={sending || resendCooldownLeftSec > 0}
                      onClick={() => void handleResend()}
                    >
                      {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      Resend OTP
                      {resendCooldownLeftSec > 0 ? (
                        <span className="ml-1.5 tabular-nums text-muted-foreground">({resendCooldownLeftSec}s)</span>
                      ) : null}
                    </Button>
                  )}
                </>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={handleChangeNumber} className="text-muted-foreground">
                Change Number
              </Button>
            </div>

            {import.meta.env.DEV && devMockOtp && !phoneVerified && otpSent && (
              <p className="text-xs text-amber-400/90 font-mono">Mock OTP: {devMockOtp}</p>
            )}

            {otpSent && !phoneVerified && (
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center pt-1">
                <Input
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6-digit OTP"
                  className="w-full sm:w-40 bg-input/40"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <Button type="button" size="sm" disabled={verifying || otp.replace(/\D/g, "").length !== 6} onClick={() => void handleVerifyOtp()}>
                  {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Verify OTP
                </Button>
              </div>
            )}
          </div>

          <SelectField label="Budget Range *" value={form.budget} onChange={(v) => set("budget", v)} options={BUDGETS} />
          <Field label="Interested Country *">
            <Input
              value={form.interestedCountry}
              onChange={(e) => set("interestedCountry", e.target.value)}
              placeholder="e.g. UAE"
            />
          </Field>
          <Field label="City / Area">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Dubai Marina" />
          </Field>
          <SelectField label="Property Type *" value={form.propertyType} onChange={(v) => set("propertyType", v)} options={PROPERTY_TYPES} />
          <SelectField label="Buyer Type *" value={form.buyerType} onChange={(v) => set("buyerType", v)} options={BUYER_TYPES} />
          <SelectField label="Purpose *" value={form.purpose} onChange={(v) => set("purpose", v)} options={PURPOSES} />
          <SelectField label="Timeline *" value={form.timeline} onChange={(v) => set("timeline", v)} options={TIMELINES} />
          <SelectField label="Lead Source *" value={form.source} onChange={(v) => set("source", v)} options={SOURCES} />

          <div className="md:col-span-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Additional context…"
              className="mt-1.5 bg-input/40"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 flex-wrap">
          <Button variant="ghost" onClick={() => setAddLeadOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} className="neon-border" disabled={!phoneVerified}>
            Add Lead
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
function SelectField({
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
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="bg-input/40">
          <SelectValue placeholder="Select…" />
        </SelectTrigger>
        <SelectContent className="glass-strong">
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
