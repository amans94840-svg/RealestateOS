// Placeholder billing API functions — replace with Supabase Edge Functions / server APIs.
// IMPORTANT: Do NOT place Razorpay secret keys in the frontend. Order creation and verification
// must occur on the server (Supabase Edge Function / serverless endpoint).

export type BillingCycle = "monthly" | "yearly";

export type SubscriptionRecord = {
  id: string;
  workspace_id?: string;
  plan: string;
  billing_cycle: BillingCycle;
  seat_limit: number;
  status: "active" | "past_due" | "cancelled";
  razorpay_subscription_id?: string;
  current_period_start?: number;
  current_period_end?: number;
  created_at?: string;
  updated_at?: string;
};

export type PaymentRecord = {
  id: string;
  workspace_id?: string;
  amount: number;
  currency: string;
  status: "created" | "paid" | "failed";
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  plan?: string;
  created_at?: string;
};

export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 0,
    priceYearly: 0,
    seats: 1,
    features: ["Basic dashboard", "Limited leads", "Manual reports"],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 1999,
    priceYearly: 1999 * 12 * 0.9, // example yearly discount
    seats: 7,
    popular: true,
    features: ["Advanced analytics", "AI insights", "Revenue forecasting", "Reports export", "Priority automations"],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: -1,
    priceYearly: -1,
    seats: 25,
    features: ["Multi-branch access", "Advanced roles", "Dedicated support", "Custom integrations"],
  },
];

// Simulate fetching current subscription for workspace
export async function fetchCurrentSubscription(workspaceId?: string): Promise<SubscriptionRecord | null> {
  // TODO: Replace with Supabase query or Edge Function call:
  // e.g. GET /api/subscriptions?workspace_id=...
  await new Promise((r) => setTimeout(r, 300));
  // Return a mock Starter subscription by default
  return {
    id: "sub_mock_1",
    workspace_id: workspaceId,
    plan: "starter",
    billing_cycle: "monthly",
    seat_limit: 1,
    status: "active",
    current_period_start: Date.now(),
    current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Simulate payment history
export async function fetchPaymentHistory(workspaceId?: string): Promise<PaymentRecord[]> {
  await new Promise((r) => setTimeout(r, 250));
  return [
    {
      id: "pay_1",
      workspace_id: workspaceId,
      amount: 1999,
      currency: "INR",
      status: "paid",
      razorpay_order_id: "order_ABC123",
      razorpay_payment_id: "pay_ABC123",
      plan: "pro",
      created_at: new Date().toISOString(),
    },
  ];
}

// Simulate invoices table
export async function fetchInvoices(workspaceId?: string) {
  await new Promise((r) => setTimeout(r, 200));
  return [
    {
      id: "inv_1",
      invoice_number: "INV-2026-0001",
      plan: "pro",
      amount: 1999,
      currency: "INR",
      status: "Paid",
      issued_at: new Date().toISOString(),
      download_url: `https://example.com/invoices/inv_1.pdf`,
    },
  ];
}

// Upgrade subscription (server-side) placeholder
export async function upgradeSubscription(workspaceId: string | undefined, planId: string, billingCycle: BillingCycle) {
  // TODO: call Supabase Edge Function to create subscription and payment
  await new Promise((r) => setTimeout(r, 350));
  const now = Date.now();
  return {
    id: `sub_${Math.random().toString(36).slice(2)}`,
    workspace_id: workspaceId,
    plan: planId,
    billing_cycle: billingCycle,
    seat_limit: PLANS.find((p) => p.id === planId)?.seats ?? 1,
    status: "active",
    current_period_start: now,
    current_period_end: now + 30 * 24 * 60 * 60 * 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as SubscriptionRecord;
}

export async function updateSeatCount(workspaceId: string | undefined, subscriptionId: string, seats: number) {
  // TODO: server-side update seat count in subscriptions table
  await new Promise((r) => setTimeout(r, 200));
  return { ok: true, seats };
}

export async function subscribeToBillingUpdates(workspaceId?: string, cb?: (data: any) => void) {
  // Placeholder: in real app use Realtime / Supabase real-time or Webhook subscription
  const id = setInterval(() => {
    cb?.({ now: Date.now() });
  }, 30_000);
  return () => clearInterval(id);
}

// Razorpay order creation should be performed on the server.
// This placeholder simulates an order object that the backend would return.
export async function createRazorpayOrder(planId: string, billingCycle: BillingCycle, workspaceId?: string) {
  // TODO: POST to server: /api/razorpay/create-order
  await new Promise((r) => setTimeout(r, 400));
  return {
    id: `order_mock_${Math.random().toString(36).slice(2)}`,
    amount: planId === "pro" ? 199900 : 0,
    currency: "INR",
    planId,
    billingCycle,
    workspaceId,
  };
}

// Frontend-only placeholder to "open" checkout. Real integration uses Razorpay SDK.
export async function openRazorpayCheckout(order: any) {
  // TODO: call Razorpay checkout on frontend with order.id from backend.
  // Return mock payment response.
  await new Promise((r) => setTimeout(r, 800));
  return {
    razorpay_payment_id: `pay_${Math.random().toString(36).slice(2)}`,
    razorpay_order_id: order.id,
    status: "successful",
  };
}

// Verify payment on server. Placeholder returns success.
export async function verifyRazorpayPayment(paymentResponse: any) {
  // TODO: POST to server /api/razorpay/verify with paymentResponse to validate signature.
  await new Promise((r) => setTimeout(r, 300));
  return { ok: true, verified: true };
}

// Update subscription record (server-side). Placeholder updates local mock.
export async function updateWorkspacePlan(planId: string, paymentData?: any, workspaceId?: string): Promise<SubscriptionRecord> {
  // TODO: POST to server to create subscription record and payment record in Supabase.
  await new Promise((r) => setTimeout(r, 300));
  const now = Date.now();
  return {
    id: `sub_${Math.random().toString(36).slice(2)}`,
    workspace_id: workspaceId,
    plan: planId,
    billing_cycle: paymentData?.billingCycle ?? "monthly",
    seat_limit: PLANS.find((p) => p.id === planId)?.seats ?? 1,
    status: "active",
    current_period_start: now,
    current_period_end: now + 30 * 24 * 60 * 60 * 1000,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function cancelSubscription(subscriptionId: string) {
  // TODO: server-side cancellation workflow
  await new Promise((r) => setTimeout(r, 250));
  return { ok: true };
}

export async function downloadInvoice(invoiceId: string) {
  // TODO: return URL or blob from server
  await new Promise((r) => setTimeout(r, 200));
  return { url: `https://example.com/invoices/${invoiceId}.pdf` };
}

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
