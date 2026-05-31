import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import validator from "validator";
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
  getNationalDigits,
  getPhonePlaceholder,
  getPhoneMaxNationalLength,
  buildFullPhoneNumber,
  formatPhoneNumber,
  getPhoneValidationError,
  isValidPhoneNumberForCountry,
  sanitizeNationalPhoneInput,
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
import { Check, ChevronsUpDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function AddLeadModal() {
  const { addLeadOpen, setAddLeadOpen, addLead } = useDashboard();
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [openC, setOpenC] = useState(false);
  const [phone, setPhone] = useState("");
  const nationalDigits = useMemo(() => getNationalDigits(phone), [phone]);
  const phoneValid = useMemo(() => isValidPhoneNumberForCountry(country.code, nationalDigits), [country.code, nationalDigits]);
  const phoneError = useMemo(
    () => (nationalDigits.length > 0 ? getPhoneValidationError(country.code, nationalDigits) : null),
    [country.code, nationalDigits],
  );
  const formattedPhonePreview = useMemo(
    () => formatPhoneNumber(country.code, nationalDigits),
    [country.code, nationalDigits],
  );

  const phonePlaceholder = useMemo(() => getPhonePlaceholder(country.code), [country.code]);
  const phoneMaxLen = useMemo(() => getPhoneMaxNationalLength(country.code), [country.code]);

  const currencyPrefix = useMemo(() => {
    switch (country.code) {
      case "+91":
        return "INR ";
      case "+44":
        return "GBP ";
      case "+971":
        return "AED ";
      case "+65":
        return "SGD ";
      case "+61":
        return "AUD ";
      case "+49":
      case "+33":
        return "EUR ";
      case "+966":
        return "SAR ";
      case "+974":
        return "QAR ";
      case "+1":
      default:
        return "$";
    }
  }, [country.code]);

  const budgetOptions = useMemo(() => BUDGETS.map((b) => b.replace(/\$/g, currencyPrefix)), [currencyPrefix]);

  const PROVIDER_DOMAINS = useMemo(
    () => ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "proton.me"],
    [],
  );

  const TYPO_DOMAIN_MAP = useMemo(
    () => ({
      "gmai.com": "gmail.com",
      "gmial.com": "gmail.com",
      "yaho.com": "yahoo.com",
      "yaho.co": "yahoo.com",
      "outlok.com": "outlook.com",
      "hotmial.com": "hotmail.com",
    }),
    [],
  );

  function levenshtein(a: string, b: string): number {
    if (a === b) return 0;
    const alen = a.length;
    const blen = b.length;
    if (alen === 0) return blen;
    if (blen === 0) return alen;

    const v0 = new Array(blen + 1).fill(0);
    const v1 = new Array(blen + 1).fill(0);
    for (let i = 0; i <= blen; i++) v0[i] = i;

    for (let i = 0; i < alen; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < blen; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= blen; j++) v0[j] = v1[j];
    }
    return v1[blen];
  }

  function getDomainSuggestion(domainRaw: string): string | null {
    const domain = domainRaw.trim().toLowerCase();
    if (!domain) return null;
    if (PROVIDER_DOMAINS.includes(domain)) return null; // already valid provider domain
    const mapped = (TYPO_DOMAIN_MAP as Record<string, string>)[domain];
    if (mapped) return mapped;

    const labels = domain.split(".");
    if (labels.length < 2) return null;
    const dTld = labels[labels.length - 1] ?? "";
    const dSld = labels.slice(0, labels.length - 1).join(".");

    for (const provider of PROVIDER_DOMAINS) {
      const pLabels = provider.split(".");
      if (pLabels.length !== 2) continue; // keep logic minimal for this app
      const pTld = pLabels[1];
      const pSld = pLabels[0];

      // Heuristic: small edit distance in both the SLD and the TLD.
      if (levenshtein(dSld, pSld) <= 1 && levenshtein(dTld, pTld) <= 1) return provider;
    }
    return null;
  }

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

  const emailValidForRealTime = useMemo(() => {
    const email = form.email;
    if (!email) return false;
    const formatOk = validator.isEmail(email, { allow_utf8_local_part: false });
    if (!formatOk) return false;
    const domain = email.split("@")[1] ?? "";
    const suggestion = getDomainSuggestion(domain);
    return suggestion == null;
  }, [form.email, PROVIDER_DOMAINS, TYPO_DOMAIN_MAP]);

  const emailDomainSuggestion = useMemo(() => {
    const email = form.email;
    if (!email) return null;
    if (!validator.isEmail(email, { allow_utf8_local_part: false })) return null;
    const domain = email.split("@")[1] ?? "";
    return getDomainSuggestion(domain);
  }, [form.email, PROVIDER_DOMAINS, TYPO_DOMAIN_MAP]);

  const applyEmailSuggestion = () => {
    if (!emailDomainSuggestion) return;
    const local = form.email.split("@")[0] ?? "";
    if (!local) return;
    set("email", `${local}@${emailDomainSuggestion}`);
  };

  // Keep input digits compatible with the selected country's max length.
  useEffect(() => {
    setPhone((p) => sanitizeNationalPhoneInput(p, country.code));
  }, [country.code]);

  // Auto-update the budget currency when the phone country changes.
  useEffect(() => {
    setForm((prev) => {
      if (!prev.budget) return prev;

      const base = prev.budget
        .replace(/\bINR\s?/g, "$")
        .replace(/\bGBP\s?/g, "$")
        .replace(/\bAED\s?/g, "$")
        .replace(/\bSGD\s?/g, "$")
        .replace(/\bAUD\s?/g, "$")
        .replace(/\bEUR\s?/g, "$")
        .replace(/\bSAR\s?/g, "$")
        .replace(/\bQAR\s?/g, "$");

      const idx = BUDGETS.indexOf(base);
      if (idx >= 0 && budgetOptions[idx]) {
        if (prev.budget === budgetOptions[idx]) return prev;
        return { ...prev, budget: budgetOptions[idx] };
      }

      // Unknown label format — fall back to first budget tier to avoid empty required state.
      return { ...prev, budget: budgetOptions[0] ?? prev.budget };
    });
  }, [budgetOptions]);

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
    setCountry(COUNTRIES[0]);
  }, []);

  const handlePhoneChange = (v: string) => setPhone(sanitizeNationalPhoneInput(v, country.code));

  const handleCountrySelect = (c: (typeof COUNTRIES)[number]) => {
    setCountry(c);
    setOpenC(false);
  };

  const handleChangeNumber = useCallback(() => setPhone(""), []);

  const submit = () => {
    if (!phoneValid) {
      toast.error("Please enter a valid phone number for the selected country");
      return;
    }
    if (!emailValidForRealTime) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!form.name || !phone || !form.budget || !form.interestedCountry || !form.propertyType || !form.buyerType || !form.purpose || !form.timeline || !form.source) {
      toast.error("Please fill all required fields");
      return;
    }
    const fullPhone = buildFullPhoneNumber(country.code, nationalDigits);
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
      phone: nationalDigits,
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
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
              {form.email.length > 0 ? (
                <Badge
                  variant="outline"
                  className={
                    emailValidForRealTime
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300/90 gap-1 text-[10px]"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300/90 gap-1 text-[10px]"
                  }
                >
                  {emailValidForRealTime ? "Valid Email" : "Invalid Email"}
                </Badge>
              ) : null}
            </div>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => {
                // Normalize input: trim, lowercase, and collapse repeated spaces.
                const normalized = e.target.value
                  .replace(/\s+/g, " ")
                  .trim()
                  .toLowerCase();
                set("email", normalized);
              }}
              placeholder="name@email.com"
              className="bg-input/40"
            />
            <p className="text-xs text-white/40">Enter a valid business or personal email</p>

            {emailDomainSuggestion ? (
              <div className="pt-1">
                <div className="text-[11px] text-white/45">Did you mean</div>
                <button
                  type="button"
                  onClick={applyEmailSuggestion}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-left text-xs text-cyan-300/90 transition hover:bg-white/10"
                >
                  {emailDomainSuggestion}?
                </button>
              </div>
            ) : null}
          </div>

          <div className="md:col-span-2 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Phone Number *</Label>
              {phoneValid ? (
                <Badge
                  variant="outline"
                  className="border-emerald-400/30 bg-emerald-400/10 text-emerald-300/90 gap-1 text-[10px]"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Valid number
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-rose-400/30 bg-rose-400/10 text-rose-300/90 gap-1 text-[10px]"
                >
                  <span className="text-[12px] leading-none">!</span>
                  Invalid number
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
                  placeholder={phonePlaceholder}
                  className="flex-1 min-w-0 bg-input/40"
                  inputMode="tel"
                  maxLength={phoneMaxLen}
                  autoComplete="tel-national"
                />
              </div>
            </div>
            {phoneError ? <p className="text-xs text-rose-400">{phoneError}</p> : null}
            {formattedPhonePreview && phoneValid ? (
              <p className="text-xs text-muted-foreground">Will save as: {formattedPhonePreview}</p>
            ) : null}

            <div className="flex flex-wrap gap-2 items-center">
              <Button type="button" variant="ghost" size="sm" onClick={handleChangeNumber} className="text-muted-foreground">
                Change Number
              </Button>
            </div>
          </div>

          <SelectField label="Budget Range *" value={form.budget} onChange={(v) => set("budget", v)} options={budgetOptions} />
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
          <Button onClick={submit} className="neon-border" disabled={!phoneValid}>
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
