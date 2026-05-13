import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { useDashboard } from "./dashboard-store";
import {
  fetchSubscription,
  generateInvoice,
  syncBillingState,
  syncPaymentStatus,
  updateSeatUsage,
} from "./billing-api";
import type {
  BillingCycle,
  InvoiceRow,
  PaymentMethodCard,
  PaymentStatus,
  PaymentSyncStatus,
  PlanTier,
  SeatRole,
  TeamMember,
  UsageMeters,
} from "./billing-types";
import { PLAN_CATALOG, effectiveMonthly, maxSeatsForPlan, periodCharge } from "./billing-types";
import type { UserPermission } from "./dashboard-store";

const STORAGE_KEY = "reos.billing.v1";

function nextSyncDelayMs() {
  return 15_000 + Math.floor(Math.random() * 5_000);
}

function permissionsForPlan(plan: PlanTier): UserPermission[] {
  if (plan === "Starter")
    return [
      "view_dashboard",
      "manage_leads",
      "manage_properties",
      "view_reports",
      "manage_settings",
    ];
  if (plan === "Growth")
    return [
      "view_dashboard",
      "manage_leads",
      "manage_properties",
      "view_reports",
      "manage_settings",
      "manage_team",
    ];
  return [
    "view_dashboard",
    "manage_leads",
    "manage_properties",
    "view_reports",
    "manage_settings",
    "manage_team",
  ];
}

function usageCapsForPlan(plan: PlanTier): Pick<UsageMeters, "aiCreditsCap" | "storageCapGb"> {
  if (plan === "Starter") return { aiCreditsCap: 8_000, storageCapGb: 5 };
  if (plan === "Growth") return { aiCreditsCap: 45_000, storageCapGb: 80 };
  return { aiCreditsCap: 250_000, storageCapGb: 500 };
}

function seedTeam(viewerEmail: string): TeamMember[] {
  const now = Date.now();
  const base: TeamMember[] = [
    {
      id: "m1",
      name: "Aman Singh",
      email: viewerEmail,
      role: "Admin",
      addedAt: now - 86400000 * 120,
    },
    {
      id: "m2",
      name: "Priya Nair",
      email: "priya.nair@realestateos.ai",
      role: "Manager",
      addedAt: now - 86400000 * 90,
    },
    {
      id: "m3",
      name: "Omar Haddad",
      email: "omar.h@realestateos.ai",
      role: "Broker",
      addedAt: now - 86400000 * 60,
    },
    {
      id: "m4",
      name: "Elena Rossi",
      email: "elena.r@realestateos.ai",
      role: "Broker",
      addedAt: now - 86400000 * 45,
    },
    {
      id: "m5",
      name: "Kenji Tanaka",
      email: "kenji.t@realestateos.ai",
      role: "Analyst",
      addedAt: now - 86400000 * 30,
    },
    {
      id: "m6",
      name: "Sofia Martins",
      email: "sofia.m@realestateos.ai",
      role: "Viewer",
      addedAt: now - 86400000 * 20,
    },
    {
      id: "m7",
      name: "Marcus Lee",
      email: "marcus.l@realestateos.ai",
      role: "Broker",
      addedAt: now - 86400000 * 14,
    },
    {
      id: "m8",
      name: "Hannah Cole",
      email: "hannah.c@realestateos.ai",
      role: "Manager",
      addedAt: now - 86400000 * 10,
    },
    {
      id: "m9",
      name: "Diego Alvarez",
      email: "diego.a@realestateos.ai",
      role: "Analyst",
      addedAt: now - 86400000 * 7,
    },
    {
      id: "m10",
      name: "Yuki Sato",
      email: "yuki.s@realestateos.ai",
      role: "Broker",
      addedAt: now - 86400000 * 5,
    },
    {
      id: "m11",
      name: "Amira Farouk",
      email: "amira.f@realestateos.ai",
      role: "Broker",
      addedAt: now - 86400000 * 3,
    },
    {
      id: "m12",
      name: "Lucas Meyer",
      email: "lucas.m@realestateos.ai",
      role: "Viewer",
      addedAt: now - 86400000 * 1,
    },
  ];
  return base;
}

function seedInvoices(): InvoiceRow[] {
  return [
    {
      id: "inv_8f2a9c1",
      amount: 7012.44,
      currency: "USD",
      status: "Paid",
      issuedAt: "2026-04-12",
      renewalPeriod: "Yearly · Enterprise",
    },
    {
      id: "inv_7d1b821",
      amount: 7012.44,
      currency: "USD",
      status: "Paid",
      issuedAt: "2025-04-12",
      renewalPeriod: "Yearly · Enterprise",
    },
    {
      id: "inv_6c0a710",
      amount: 548.0,
      currency: "USD",
      status: "Pending",
      issuedAt: "2026-05-01",
      renewalPeriod: "Add-on · AI credits",
    },
    {
      id: "inv_5b9a609",
      amount: 7012.44,
      currency: "USD",
      status: "Failed",
      issuedAt: "2024-04-12",
      renewalPeriod: "Yearly · Enterprise",
    },
    {
      id: "inv_4a89058",
      amount: 120.0,
      currency: "USD",
      status: "Processing",
      issuedAt: "2026-05-10",
      renewalPeriod: "Proration · seat pack",
    },
  ];
}

const DEFAULT_METHODS: PaymentMethodCard[] = [
  { id: "pm_1", brand: "Visa", last4: "4242", exp: "08 / 28", isDefault: true },
  { id: "pm_2", brand: "Mastercard", last4: "1881", exp: "02 / 27", isDefault: false },
];

export type SubscriptionState = {
  plan: PlanTier;
  cycle: BillingCycle;
  renewalAt: string;
  autoRenew: boolean;
  currency: string;
};

type BillingCtx = {
  subscription: SubscriptionState;
  subscriptionState: "active" | "past_due" | "trialing";
  teamMembers: TeamMember[];
  invoices: InvoiceRow[];
  paymentMethods: PaymentMethodCard[];
  billingAddress: string;
  taxId: string;
  usage: UsageMeters;
  paymentSyncStatus: PaymentSyncStatus;
  lastSyncedAt: string | null;
  upcomingCharge: number;
  failedInvoiceIds: string[];
  /** Derived */
  maxSeats: number;
  usedSeats: number;
  availableSeats: number;
  periodTotal: number;
  effectiveMonthly: number;
  changePlan: (plan: PlanTier, viewerEmail: string) => void;
  setCycle: (c: BillingCycle) => void;
  setAutoRenew: (v: boolean) => void;
  inviteMember: (email: string, name: string, role: SeatRole, viewerEmail: string) => void;
  removeMember: (id: string, viewerEmail: string) => void;
  updateMemberRole: (id: string, role: SeatRole) => void;
  setDefaultPaymentMethod: (id: string) => void;
  runManualSync: () => Promise<void>;
  issueInvoiceNow: () => Promise<void>;
  setBillingAddress: (v: string) => void;
  setTaxId: (v: string) => void;
  permissionNoteForPlan: string;
  updateInvoiceStatus: (id: string, status: PaymentStatus) => void;
};

const BillingContext = createContext<BillingCtx | null>(null);

function loadPersisted(): Partial<{
  subscription: SubscriptionState;
  teamMembers: TeamMember[];
}> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<{
      subscription: SubscriptionState;
      teamMembers: TeamMember[];
    }>;
  } catch {
    return null;
  }
}

function persist(sub: SubscriptionState, team: TeamMember[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ subscription: sub, teamMembers: team }),
  );
}

export function BillingProvider({ children }: { children: ReactNode }) {
  const { user, pushActivity, updateUserProfile } = useDashboard();
  const caps = usageCapsForPlan("Enterprise");
  const [subscription, setSubscription] = useState<SubscriptionState>(() => {
    const p = loadPersisted();
    const renewal = new Date();
    renewal.setDate(renewal.getDate() + 28);
    return (
      p?.subscription ?? {
        plan: "Enterprise",
        cycle: "Yearly",
        renewalAt: renewal.toISOString(),
        autoRenew: true,
        currency: "USD",
      }
    );
  });
  const [invoices, setInvoices] = useState<InvoiceRow[]>(seedInvoices);
  const subscriptionState = useMemo<"active" | "past_due" | "trialing">(() => {
    if (invoices.some((i) => i.status === "Failed")) return "past_due";
    return "active";
  }, [invoices]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const p = loadPersisted();
    return p?.teamMembers?.length ? p.teamMembers : seedTeam(user.email);
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodCard[]>(DEFAULT_METHODS);
  const [billingAddress, setBillingAddress] = useState(
    "RealEstateOS HQ · 221B Cyber Lane\nDubai Internet City · UAE",
  );
  const [taxId, setTaxId] = useState("AE · TRN 100200300400500");
  const [usage, setUsage] = useState<UsageMeters>(() => ({
    apiCallsPercent: 62,
    aiCreditsUsed: 118_400,
    aiCreditsCap: caps.aiCreditsCap,
    storageGb: 128.4,
    storageCapGb: caps.storageCapGb,
    workflowRunsPercent: 54,
  }));
  const [paymentSyncStatus, setPaymentSyncStatus] = useState<PaymentSyncStatus>("idle");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const syncing = useRef(false);
  const subscriptionRef = useRef(subscription);
  const usageRef = useRef(usage);
  const invoicesRef = useRef(invoices);
  useEffect(() => {
    subscriptionRef.current = subscription;
    usageRef.current = usage;
    invoicesRef.current = invoices;
  }, [subscription, usage, invoices]);

  const maxSeats = maxSeatsForPlan(subscription.plan);
  const usedSeats = teamMembers.length;
  const availableSeats = Math.max(0, maxSeats - usedSeats);
  const periodTotal = periodCharge(subscription.plan, subscription.cycle);
  const effectiveMonthlyVal = effectiveMonthly(subscription.plan, subscription.cycle);

  const failedInvoiceIds = useMemo(
    () => invoices.filter((i) => i.status === "Failed").map((i) => i.id),
    [invoices],
  );

  const upcomingCharge = useMemo(() => {
    const pending = invoices.filter((i) => i.status === "Pending" || i.status === "Processing");
    return pending.reduce((s, i) => s + i.amount, 0) || periodTotal * 0.02;
  }, [invoices, periodTotal]);

  const permissionNoteForPlan = useMemo(() => {
    if (subscription.plan === "Starter")
      return "Starter caps automation, integrations, and team seats. Upgrade to unlock CRM automation and realtime AI.";
    if (subscription.plan === "Growth")
      return "Growth unlocks multi-seat collaboration, CRM automation, and priority support. Enterprise adds broker ops and custom workflows.";
    return "Enterprise enables broker management, dedicated AI, unlimited automation, and advanced integrations.";
  }, [subscription.plan]);

  useEffect(() => {
    setTeamMembers((prev) => (prev.length ? prev : seedTeam(user.email)));
  }, [user.email]);

  useEffect(() => {
    persist(subscription, teamMembers);
  }, [subscription, teamMembers]);

  const applyPlanCaps = useCallback((plan: PlanTier) => {
    const c = usageCapsForPlan(plan);
    setUsage((u) => ({
      ...u,
      aiCreditsCap: c.aiCreditsCap,
      storageCapGb: c.storageCapGb,
      aiCreditsUsed: Math.min(u.aiCreditsUsed, c.aiCreditsCap),
      storageGb: Math.min(u.storageGb, c.storageCapGb),
    }));
  }, []);

  const trimTeamToCap = useCallback(
    (plan: PlanTier, viewerEmail: string) => {
      const cap = maxSeatsForPlan(plan);
      setTeamMembers((prev) => {
        if (prev.length <= cap) return prev;
        const viewer = prev.find((m) => m.email.toLowerCase() === viewerEmail.toLowerCase());
        const rest = prev.filter((m) => m.email.toLowerCase() !== viewerEmail.toLowerCase());
        const admins = rest.filter((m) => m.role === "Admin");
        const others = rest.filter((m) => m.role !== "Admin");
        const ordered = [viewer, ...admins, ...others].filter(Boolean) as TeamMember[];
        const trimmed = ordered.slice(0, cap);
        toast.warning("Seats adjusted to plan limit", {
          description: `${prev.length - trimmed.length} member(s) removed from billing seats. Export audit from Reports.`,
        });
        pushActivity(`Billing: seats trimmed to ${cap} for ${plan}`, "credit-card", "billing");
        return trimmed;
      });
    },
    [pushActivity],
  );

  const changePlan = useCallback(
    (plan: PlanTier, viewerEmail: string) => {
      const prev = subscription.plan;
      setSubscription((s) => ({ ...s, plan }));
      applyPlanCaps(plan);
      trimTeamToCap(plan, viewerEmail);
      updateUserProfile({ permissions: permissionsForPlan(plan) }, { silent: true });
      pushActivity(`Subscription ${prev} → ${plan} · permissions aligned`, "sparkles", "billing");
      toast.success(`Plan updated · ${plan}`, { description: PLAN_CATALOG[plan].tagline });
    },
    [subscription.plan, applyPlanCaps, trimTeamToCap, pushActivity, updateUserProfile],
  );

  const setCycle = useCallback(
    (cycle: BillingCycle) => {
      setSubscription((s) => {
        const next = { ...s, cycle };
        const r = new Date();
        if (cycle === "Monthly") r.setMonth(r.getMonth() + 1);
        else if (cycle === "Quarterly") r.setMonth(r.getMonth() + 3);
        else r.setFullYear(r.getFullYear() + 1);
        next.renewalAt = r.toISOString();
        return next;
      });
      pushActivity(`Billing cycle set to ${cycle}`, "calendar", "billing");
      toast.success("Billing cycle updated", { description: "Renewal date recalculated." });
    },
    [pushActivity],
  );

  const setAutoRenew = useCallback(
    (v: boolean) => {
      setSubscription((s) => ({ ...s, autoRenew: v }));
      pushActivity(`Auto-renew ${v ? "enabled" : "paused"}`, "shield-check", "billing");
      toast(v ? "Auto-renew on" : "Auto-renew paused");
    },
    [pushActivity],
  );

  const inviteMember = useCallback(
    (email: string, name: string, role: SeatRole, viewerEmail: string) => {
      void viewerEmail;
      if (!email.includes("@")) {
        toast.error("Invalid email");
        return;
      }
      setTeamMembers((t) => {
        const cap = maxSeatsForPlan(subscriptionRef.current.plan);
        if (t.length >= cap) {
          toast.error("Seat limit reached", {
            description: `Upgrade plan or remove members (max ${cap}).`,
          });
          return t;
        }
        const m: TeamMember = {
          id: `m_${Math.random().toString(36).slice(2, 9)}`,
          name: name.trim() || email.split("@")[0],
          email: email.trim().toLowerCase(),
          role,
          addedAt: Date.now(),
        };
        pushActivity(`Seat invite: ${m.email} as ${role}`, "user-plus", "billing");
        toast.success("Member added", { description: `${m.email} · ${role}` });
        void updateSeatUsage([...t, m], subscriptionRef.current.plan);
        return [...t, m];
      });
    },
    [pushActivity],
  );

  const removeMember = useCallback(
    (id: string, viewerEmail: string) => {
      const target = teamMembers.find((m) => m.id === id);
      if (!target) return;
      if (target.email.toLowerCase() === viewerEmail.toLowerCase()) {
        toast.error("You cannot remove your own seat from here.");
        return;
      }
      const admins = teamMembers.filter((m) => m.role === "Admin");
      if (target.role === "Admin" && admins.length === 1) {
        toast.error("Assign another Admin before removing the last admin.");
        return;
      }
      setTeamMembers((t) => t.filter((m) => m.id !== id));
      pushActivity(`Seat removed: ${target.email}`, "user-minus", "billing");
      toast.success("Member removed");
    },
    [teamMembers, pushActivity],
  );

  const updateMemberRole = useCallback(
    (id: string, role: SeatRole) => {
      setTeamMembers((t) => t.map((m) => (m.id === id ? { ...m, role } : m)));
      pushActivity(`Role updated → ${role}`, "shield-check", "billing");
      toast.success("Role updated");
    },
    [pushActivity],
  );

  const setDefaultPaymentMethod = useCallback((id: string) => {
    setPaymentMethods((pm) => pm.map((p) => ({ ...p, isDefault: p.id === id })));
    toast.success("Default payment method updated");
  }, []);

  const updateInvoiceStatus = useCallback(
    (id: string, status: PaymentStatus) => {
      setInvoices((list) => list.map((x) => (x.id === id ? { ...x, status } : x)));
      pushActivity(`Invoice ${id} → ${status}`, "file-text", "billing");
      toast.success("Invoice updated", { description: `${id} · ${status}` });
    },
    [pushActivity],
  );

  const runBillingSync = useCallback(async () => {
    if (syncing.current) return;
    syncing.current = true;
    setPaymentSyncStatus("syncing");
    try {
      const sub = subscriptionRef.current;
      const u = usageRef.current;
      const inv = invoicesRef.current;
      const remote = await fetchSubscription();
      if (remote?.team?.length) {
        setTeamMembers(remote.team);
      }
      const patch = await syncBillingState({
        plan: sub.plan,
        cycle: sub.cycle,
        renewalAt: sub.renewalAt,
        autoRenew: sub.autoRenew,
        usage: u,
        invoices: inv,
        lastPaymentStatus: inv[0]?.status ?? "Paid",
      });
      if (patch.usage) setUsage((prev) => ({ ...prev, ...patch.usage }));
      const pending = inv.find((i) => i.status === "Pending" || i.status === "Processing");
      if (pending) {
        const st = await syncPaymentStatus(pending.id, pending.status);
        setInvoices((list) => list.map((x) => (x.id === pending.id ? { ...x, status: st } : x)));
      }
      setLastSyncedAt(new Date().toISOString());
      setPaymentSyncStatus("synced");
    } catch {
      setPaymentSyncStatus("error");
      toast.error("Billing sync failed", { description: "Check Stripe / Supabase webhooks." });
    } finally {
      syncing.current = false;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | undefined;
    const tick = () => {
      void runBillingSync().finally(() => {
        if (cancelled) return;
        timeoutId = window.setTimeout(tick, nextSyncDelayMs());
      });
    };
    tick();
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [runBillingSync]);

  const issueInvoiceNow = useCallback(async () => {
    const row = await generateInvoice({
      plan: subscription.plan,
      cycle: subscription.cycle,
      currency: subscription.currency,
    });
    setInvoices((prev) => [row, ...prev]);
    pushActivity(`Invoice generated ${row.id}`, "file-text", "billing");
    toast.success("Invoice generated", { description: row.id });
  }, [subscription, pushActivity]);

  const value: BillingCtx = {
    subscription,
    subscriptionState,
    teamMembers,
    invoices,
    paymentMethods,
    billingAddress,
    taxId,
    usage,
    paymentSyncStatus,
    lastSyncedAt,
    upcomingCharge,
    failedInvoiceIds,
    maxSeats,
    usedSeats,
    availableSeats,
    periodTotal,
    effectiveMonthly: effectiveMonthlyVal,
    changePlan,
    setCycle,
    setAutoRenew,
    inviteMember,
    removeMember,
    updateMemberRole,
    setDefaultPaymentMethod,
    runManualSync: runBillingSync,
    issueInvoiceNow,
    setBillingAddress,
    setTaxId,
    permissionNoteForPlan,
    updateInvoiceStatus,
  };

  return <BillingContext.Provider value={value}>{children}</BillingContext.Provider>;
}

/* eslint-disable react-refresh/only-export-components -- hooks colocated with BillingProvider */
export function useBilling() {
  const v = useContext(BillingContext);
  if (!v) throw new Error("useBilling must be used within BillingProvider");
  return v;
}

export function useBillingOptional() {
  return useContext(BillingContext);
}
