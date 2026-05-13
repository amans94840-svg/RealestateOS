/**
 * Backend-ready stubs for Stripe, Razorpay, Supabase, webhooks, and n8n.
 * Replace bodies with real HTTP calls; shapes are stable for the UI store.
 *
 * Razorpay: mirror `syncBillingState` / `generateInvoice` with Razorpay order + payment link APIs.
 * Webhooks: validate signatures then call `dispatchBillingWebhook` → reconcile subscription rows in Supabase.
 */
import type {
  BillingCycle,
  InvoiceRow,
  PaymentStatus,
  PlanTier,
  TeamMember,
  UsageMeters,
} from "./billing-types";
import { PLAN_CATALOG, cycleMultiplier, maxSeatsForPlan, periodCharge } from "./billing-types";

export type SubscriptionDTO = {
  plan: PlanTier;
  cycle: BillingCycle;
  renewalAt: string;
  autoRenew: boolean;
  team: TeamMember[];
};

export type BillingStateDTO = {
  plan: PlanTier;
  cycle: BillingCycle;
  renewalAt: string;
  autoRenew: boolean;
  usage: UsageMeters;
  invoices: InvoiceRow[];
  lastPaymentStatus: PaymentStatus;
};

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchSubscription(): Promise<SubscriptionDTO | null> {
  await delay(120);
  return null;
}

export async function syncBillingState(state: BillingStateDTO): Promise<Partial<BillingStateDTO>> {
  await delay(80);
  const u = state.usage;
  const jitter = (n: number, mag: number) =>
    Math.min(100, Math.max(0, Math.round((n + (Math.random() - 0.5) * mag) * 10) / 10));
  return {
    usage: {
      apiCallsPercent: jitter(u.apiCallsPercent, 1.8),
      aiCreditsUsed: Math.min(
        u.aiCreditsCap,
        Math.max(0, Math.round(u.aiCreditsUsed + (Math.random() - 0.5) * 120)),
      ),
      aiCreditsCap: u.aiCreditsCap,
      storageGb: Math.min(
        u.storageCapGb,
        Math.round((u.storageGb + (Math.random() - 0.5) * 0.08) * 100) / 100,
      ),
      storageCapGb: u.storageCapGb,
      workflowRunsPercent: jitter(u.workflowRunsPercent, 2.2),
    },
    lastPaymentStatus: state.lastPaymentStatus,
  };
}

export async function updateSeatUsage(
  team: TeamMember[],
  plan: PlanTier,
): Promise<{ used: number; cap: number }> {
  await delay(60);
  return { used: team.length, cap: maxSeatsForPlan(plan) };
}

export async function generateInvoice(input: {
  plan: PlanTier;
  cycle: BillingCycle;
  currency: string;
}): Promise<InvoiceRow> {
  await delay(100);
  const amount = periodCharge(input.plan, input.cycle);
  const id = `inv_${Date.now().toString(36)}`;
  return {
    id,
    amount,
    currency: input.currency,
    status: "Paid",
    issuedAt: new Date().toISOString().slice(0, 10),
    renewalPeriod: `${input.cycle} · ${input.plan}`,
  };
}

export async function syncPaymentStatus(
  invoiceId: string,
  current?: PaymentStatus,
): Promise<PaymentStatus> {
  await delay(90);
  void invoiceId;
  const r = Math.random();
  if (current === "Processing") {
    if (r < 0.45) return "Processing";
    if (r < 0.92) return "Paid";
    return "Failed";
  }
  if (current === "Pending") {
    if (r < 0.35) return "Pending";
    if (r < 0.55) return "Processing";
    if (r < 0.9) return "Paid";
    return "Failed";
  }
  if (r < 0.12) return "Processing";
  if (r < 0.94) return "Paid";
  return "Failed";
}

/** Webhook envelope placeholder — wire to Stripe/Razorpay signing secret validation. */
export type WebhookEventStub = { type: string; payload: Record<string, unknown> };

export async function dispatchBillingWebhook(event: WebhookEventStub): Promise<{ ok: boolean }> {
  await delay(40);
  void event;
  return { ok: true };
}

export function planUpgradeProration(from: PlanTier, to: PlanTier, cycle: BillingCycle): number {
  const diff = PLAN_CATALOG[to].monthlyBase - PLAN_CATALOG[from].monthlyBase;
  return Math.max(0, Math.round(diff * cycleMultiplier(cycle) * 100) / 100);
}
