export type PlanTier = "Starter" | "Growth" | "Enterprise";
export type BillingCycle = "Monthly" | "Quarterly" | "Yearly";
export type PaymentStatus = "Paid" | "Pending" | "Failed" | "Processing";
export type PaymentSyncStatus = "idle" | "syncing" | "synced" | "error";
export type SeatRole = "Admin" | "Manager" | "Broker" | "Analyst" | "Viewer";

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: SeatRole;
  addedAt: number;
};

export type InvoiceRow = {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  issuedAt: string;
  renewalPeriod: string;
};

export type PaymentMethodCard = {
  id: string;
  brand: string;
  last4: string;
  exp: string;
  isDefault: boolean;
};

export type UsageMeters = {
  apiCallsPercent: number;
  aiCreditsUsed: number;
  aiCreditsCap: number;
  storageGb: number;
  storageCapGb: number;
  workflowRunsPercent: number;
};

export type PlanCatalogEntry = {
  id: PlanTier;
  maxSeats: number;
  monthlyBase: number;
  tagline: string;
  features: string[];
  analytics: string;
  integrations: string;
  automationLimit: string;
  aiCapabilities: string;
  support: string;
  crmAutomation: boolean;
  realtimeAiInsights: boolean;
  brokerManagement: boolean;
  customWorkflows: boolean;
  dedicatedAiEngine: boolean;
};

export const PLAN_CATALOG: Record<PlanTier, PlanCatalogEntry> = {
  Starter: {
    id: "Starter",
    maxSeats: 1,
    monthlyBase: 49,
    tagline: "Solo operator essentials",
    features: ["1 seat", "Basic analytics", "Limited integrations", "Limited AI automation", "Email support"],
    analytics: "Basic",
    integrations: "Up to 3",
    automationLimit: "250 runs / mo",
    aiCapabilities: "Standard copilot",
    support: "Email (48h)",
    crmAutomation: false,
    realtimeAiInsights: false,
    brokerManagement: false,
    customWorkflows: false,
    dedicatedAiEngine: false,
  },
  Growth: {
    id: "Growth",
    maxSeats: 7,
    monthlyBase: 199,
    tagline: "Scale the revenue desk",
    features: ["7 seats", "Advanced analytics", "CRM automation", "Realtime AI insights", "Priority support"],
    analytics: "Advanced",
    integrations: "Up to 12",
    automationLimit: "5,000 runs / mo",
    aiCapabilities: "Realtime AI insights",
    support: "Priority chat & email",
    crmAutomation: true,
    realtimeAiInsights: true,
    brokerManagement: false,
    customWorkflows: false,
    dedicatedAiEngine: false,
  },
  Enterprise: {
    id: "Enterprise",
    maxSeats: 25,
    monthlyBase: 899,
    tagline: "Global brokerage control plane",
    features: [
      "25 seats",
      "Unlimited automation",
      "Dedicated AI engine",
      "Advanced integrations",
      "Broker management",
      "Custom workflows",
      "Enterprise support",
    ],
    analytics: "Executive + API",
    integrations: "Unlimited",
    automationLimit: "Unlimited",
    aiCapabilities: "Dedicated engine + fine-tuning",
    support: "24/7 + CSM",
    crmAutomation: true,
    realtimeAiInsights: true,
    brokerManagement: true,
    customWorkflows: true,
    dedicatedAiEngine: true,
  },
};

export function maxSeatsForPlan(plan: PlanTier): number {
  return PLAN_CATALOG[plan].maxSeats;
}

export function cycleMultiplier(cycle: BillingCycle): number {
  switch (cycle) {
    case "Monthly":
      return 1;
    case "Quarterly":
      return 3 * 0.92;
    case "Yearly":
      return 12 * 0.78;
    default:
      return 1;
  }
}

export function periodCharge(plan: PlanTier, cycle: BillingCycle): number {
  const base = PLAN_CATALOG[plan].monthlyBase;
  if (cycle === "Monthly") return base;
  if (cycle === "Quarterly") return Math.round(base * 3 * 0.92 * 100) / 100;
  return Math.round(base * 12 * 0.78 * 100) / 100;
}

export function effectiveMonthly(plan: PlanTier, cycle: BillingCycle): number {
  const charge = periodCharge(plan, cycle);
  if (cycle === "Monthly") return charge;
  if (cycle === "Quarterly") return Math.round((charge / 3) * 100) / 100;
  return Math.round((charge / 12) * 100) / 100;
}
