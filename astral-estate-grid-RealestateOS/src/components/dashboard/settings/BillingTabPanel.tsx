import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  ArrowUpCircle,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileText,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useBilling } from "@/lib/billing-store";
import { useDashboard } from "@/lib/dashboard-store";
import {
  PLAN_CATALOG,
  type BillingCycle,
  type InvoiceRow,
  type PlanTier,
  type SeatRole,
} from "@/lib/billing-types";
import { planUpgradeProration, syncPaymentStatus } from "@/lib/billing-api";
import { GlowCard, Mini, SectionHeader } from "../utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const ROLES: SeatRole[] = ["Admin", "Manager", "Broker", "Analyst", "Viewer"];
const PLANS: PlanTier[] = ["Starter", "Growth", "Enterprise"];

function formatMoney(n: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function statusBadge(status: InvoiceRow["status"]) {
  const map: Record<InvoiceRow["status"], string> = {
    Paid: "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]",
    Pending: "border-[oklch(0.78_0.2_50_/_0.5)] text-[oklch(0.88_0.18_60)]",
    Failed: "border-destructive/50 text-destructive",
    Processing: "border-primary/40 text-primary",
  };
  return map[status];
}

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const formatted = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toLocaleString();
  return (
    <span key={formatted} className="tabular-nums transition-all duration-200 inline-block">
      {formatted}
    </span>
  );
}

function UsageBar({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-[11px] text-muted-foreground">{hint ?? `${v.toFixed(0)}%`}</span>
      </div>
      <div className="relative h-2 rounded-full bg-primary/15 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary/80 to-[oklch(0.72_0.22_300)] transition-[width] duration-500 ease-out"
          style={{ width: `${v}%` }}
        />
      </div>
    </div>
  );
}

export function BillingTabPanel() {
  const { user, pushActivity } = useDashboard();
  const b = useBilling();
  const { updateInvoiceStatus } = b;
  const [now, setNow] = useState(() => Date.now());
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<SeatRole>("Broker");
  const [invoiceOpen, setInvoiceOpen] = useState<InvoiceRow | null>(null);
  const [syncingInvoice, setSyncingInvoice] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const renewalMs = useMemo(() => {
    const t = new Date(b.subscription.renewalAt).getTime();
    return Math.max(0, t - now);
  }, [b.subscription.renewalAt, now]);

  const countdown = useMemo(() => {
    const sec = Math.floor(renewalMs / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${d}d ${h}h ${m}m ${s}s`;
  }, [renewalMs]);

  const usageAlerts = useMemo(() => {
    const alerts: string[] = [];
    if (b.usage.apiCallsPercent >= 88)
      alerts.push("API volume nearing monthly soft cap — consider Enterprise burst.");
    if (b.usage.aiCreditsUsed / b.usage.aiCreditsCap >= 0.9)
      alerts.push("AI credits almost depleted — add-on pack or upgrade.");
    if (b.usedSeats >= b.maxSeats)
      alerts.push("Seat limit reached — invite blocked until you upgrade or remove members.");
    if (b.failedInvoiceIds.length)
      alerts.push("Failed payment on record — update default card to avoid suspension.");
    return alerts;
  }, [b]);

  const upgradeHint = useMemo(() => {
    if (b.subscription.plan === "Enterprise") return null;
    const next: PlanTier = b.subscription.plan === "Starter" ? "Growth" : "Enterprise";
    const est = planUpgradeProration(b.subscription.plan, next, b.subscription.cycle);
    return { next, est };
  }, [b.subscription.plan, b.subscription.cycle]);

  const periodPaymentUi = useMemo(() => {
    const pending = b.invoices.find((i) => i.status === "Pending" || i.status === "Processing");
    if (b.subscriptionState === "past_due") {
      return {
        icon: "danger" as const,
        title: "Payment attention required",
        detail: "Failed charge on file — update your default card before the next renewal attempt.",
      };
    }
    if (pending) {
      return {
        icon: "pending" as const,
        title: `${pending.status} · ${pending.id}`,
        detail: `${formatMoney(pending.amount, pending.currency)} · simulated gateway capture`,
      };
    }
    return {
      icon: "ok" as const,
      title: "Current period settled",
      detail: "invoice.paid · Supabase ledger + webhook simulation in sync.",
    };
  }, [b.invoices, b.subscriptionState]);

  const billingPeriodProgress = useMemo(() => {
    const days =
      b.subscription.cycle === "Monthly" ? 30 : b.subscription.cycle === "Quarterly" ? 90 : 365;
    const total = days * 86400000;
    const elapsed = Math.max(0, Math.min(1, 1 - renewalMs / total));
    return Math.round(elapsed * 100);
  }, [b.subscription.cycle, renewalMs]);

  const renewalSoon = renewalMs > 0 && renewalMs < 7 * 86400000;

  const onInvite = () => {
    b.inviteMember(inviteEmail, inviteName, inviteRole, user.email);
    setInviteEmail("");
    setInviteName("");
  };

  const syncOneInvoice = useCallback(
    async (row: InvoiceRow) => {
      setSyncingInvoice(row.id);
      const next = await syncPaymentStatus(row.id, row.status);
      updateInvoiceStatus(row.id, next);
      toast.message(`Payment sync · ${row.id}`, { description: `Status: ${next}` });
      pushActivity(`Invoice ${row.id} sync → ${next}`, "refresh-cw", "billing");
      setSyncingInvoice(null);
    },
    [pushActivity, updateInvoiceStatus],
  );

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Billing & Subscription"
        subtitle="Plans · seats · usage · renewals · payments — synced for Stripe / Supabase / webhooks"
      />

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              b.paymentSyncStatus === "syncing"
                ? "bg-primary animate-pulse"
                : b.paymentSyncStatus === "synced"
                  ? "bg-[oklch(0.82_0.2_150)]"
                  : b.paymentSyncStatus === "error"
                    ? "bg-destructive"
                    : "bg-muted-foreground/50"
            }`}
          />
          Live sync: {b.paymentSyncStatus === "syncing" ? "Pulling…" : b.paymentSyncStatus}
          {b.lastSyncedAt && (
            <span className="hidden sm:inline">
              · last {new Date(b.lastSyncedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => void b.runManualSync()}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Sync now
        </Button>
      </div>

      {usageAlerts.length > 0 && (
        <Alert className="glass border-[oklch(0.78_0.2_50_/_0.35)] bg-[oklch(0.2_0.04_265_/_0.5)]">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Usage & billing signals</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-1 space-y-0.5">
              {usageAlerts.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {upgradeHint && (
        <Alert className="glass border-primary/30 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <AlertTitle>Upgrade recommendation</AlertTitle>
          <AlertDescription>
            Move to {upgradeHint.next} for deeper automation — estimated proration today{" "}
            <strong>{formatMoney(upgradeHint.est, b.subscription.currency)}</strong>.
          </AlertDescription>
        </Alert>
      )}

      {renewalSoon && (
        <Alert className="glass border-primary/35 bg-primary/5">
          <CalendarClock className="h-4 w-4 text-primary" />
          <AlertTitle>Renewal reminder</AlertTitle>
          <AlertDescription>
            Next charge in <strong>{countdown}</strong>
            {b.subscription.autoRenew
              ? " — auto-renew will charge your default card."
              : " — auto-renew is off; enable it or pay manually to avoid interruption."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-2">
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Current plan
          </div>
          <div className="text-sm font-semibold mt-1 neon-text">{b.subscription.plan}</div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Monthly cost (eff.)
          </div>
          <div className="text-sm font-semibold mt-1 tabular-nums">
            <AnimatedNumber value={b.effectiveMonthly} decimals={2} />
            <span className="text-muted-foreground text-xs ml-1">{b.subscription.currency}</span>
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Period charge
          </div>
          <div className="text-sm font-semibold mt-1 tabular-nums">
            <AnimatedNumber value={b.periodTotal} decimals={2} />
            <span className="text-muted-foreground text-xs ml-1">· {b.subscription.cycle}</span>
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Renewal date
          </div>
          <div className="text-xs font-medium mt-1 leading-snug">
            {new Date(b.subscription.renewalAt).toLocaleDateString()}
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Active seats
          </div>
          <div className="text-sm font-semibold mt-1">
            <AnimatedNumber value={b.usedSeats} /> / <AnimatedNumber value={b.maxSeats} />
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            API usage
          </div>
          <div className="text-sm font-semibold mt-1">
            <AnimatedNumber value={b.usage.apiCallsPercent} decimals={1} />%
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            AI credits
          </div>
          <div className="text-xs font-semibold mt-1 leading-tight">
            <AnimatedNumber value={b.usage.aiCreditsUsed} /> /{" "}
            {b.usage.aiCreditsCap.toLocaleString()}
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Storage</div>
          <div className="text-xs font-semibold mt-1">
            <AnimatedNumber value={b.usage.storageGb} decimals={1} /> / {b.usage.storageCapGb} GB
          </div>
        </GlowCard>
        <GlowCard className="!p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Workflow usage
          </div>
          <div className="text-sm font-semibold mt-1">
            <AnimatedNumber value={b.usage.workflowRunsPercent} decimals={1} />%
          </div>
        </GlowCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlowCard className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Renewal & billing cycle
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Subscription state: <Badge variant="outline">{b.subscriptionState}</Badge> ·
                Auto-renew {b.subscription.autoRenew ? "on" : "off"}
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-primary/40 text-primary font-mono text-[11px]"
            >
              {countdown}
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="glass rounded-lg p-3 space-y-2">
              <div className="text-xs text-muted-foreground">Payment status (current period)</div>
              <div className="flex items-center gap-2">
                {periodPaymentUi.icon === "ok" && (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[oklch(0.82_0.2_150)]" />
                )}
                {periodPaymentUi.icon === "pending" && (
                  <Clock className="h-4 w-4 shrink-0 text-primary" />
                )}
                {periodPaymentUi.icon === "danger" && (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                )}
                <span className="text-sm font-medium leading-snug">{periodPaymentUi.title}</span>
              </div>
              <Progress value={billingPeriodProgress} className="h-1.5 bg-primary/10" />
              <p className="text-[11px] text-muted-foreground">{periodPaymentUi.detail}</p>
            </div>
            <div className="glass rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-medium">Auto-renew</div>
                  <div className="text-[11px] text-muted-foreground">
                    Charge default PM before renewal
                  </div>
                </div>
                <Switch checked={b.subscription.autoRenew} onCheckedChange={b.setAutoRenew} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Billing cycle
                </div>
                <select
                  value={b.subscription.cycle}
                  onChange={(e) => b.setCycle(e.target.value as BillingCycle)}
                  className="w-full bg-input/40 border border-border rounded-md px-3 py-2 text-sm"
                >
                  {(["Monthly", "Quarterly", "Yearly"] as const).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full gap-1.5"
                onClick={() => void b.issueInvoiceNow()}
              >
                <FileText className="h-3.5 w-3.5" />
                Generate invoice (mock)
              </Button>
            </div>
          </div>
          <UsageBar label="Workflow automation load" value={b.usage.workflowRunsPercent} />
        </GlowCard>

        <GlowCard className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Usage meters
          </h3>
          <UsageBar label="API calls (rolling)" value={b.usage.apiCallsPercent} />
          <div>
            <UsageBar
              label="AI credits"
              value={(b.usage.aiCreditsUsed / b.usage.aiCreditsCap) * 100}
              hint={`${Math.round((b.usage.aiCreditsUsed / b.usage.aiCreditsCap) * 100)}%`}
            />
          </div>
          <UsageBar
            label="Storage"
            value={(b.usage.storageGb / b.usage.storageCapGb) * 100}
            hint={`${((b.usage.storageGb / b.usage.storageCapGb) * 100).toFixed(1)}%`}
          />
          <Separator className="bg-border/40" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {b.permissionNoteForPlan}
          </p>
        </GlowCard>
      </div>

      <GlowCard>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Plan comparison
          </h3>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              window.open("mailto:sales@realestateos.ai?subject=Enterprise%20billing", "_blank");
              pushActivity("Contact sales clicked from billing", "mail", "billing");
              toast.success("Opening mail client…");
            }}
          >
            <Mail className="h-3.5 w-3.5" />
            Contact sales
          </Button>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {PLANS.map((plan) => {
            const def = PLAN_CATALOG[plan];
            const current = b.subscription.plan === plan;
            return (
              <div
                key={plan}
                className={`relative glass rounded-xl p-4 border transition-colors ${
                  current ? "neon-border bg-primary/5" : "border-border/50 hover:border-primary/30"
                }`}
              >
                {current && (
                  <Badge className="absolute -top-2 right-3 bg-primary text-primary-foreground text-[10px]">
                    Current
                  </Badge>
                )}
                <div className="text-lg font-semibold">{plan}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{def.tagline}</div>
                <div className="mt-3 text-2xl font-bold tabular-nums">
                  {formatMoney(def.monthlyBase, b.subscription.currency)}
                  <span className="text-xs font-normal text-muted-foreground"> / mo</span>
                </div>
                <ul className="mt-3 space-y-1.5 text-[11px] text-muted-foreground">
                  <li>Seats: {def.maxSeats}</li>
                  <li>Automation: {def.automationLimit}</li>
                  <li>Integrations: {def.integrations}</li>
                  <li>AI: {def.aiCapabilities}</li>
                  <li>Support: {def.support}</li>
                </ul>
                <ul className="mt-2 space-y-1 text-[10px] text-muted-foreground/90 border-t border-border/30 pt-2">
                  <li className={def.crmAutomation ? "text-[oklch(0.82_0.2_150)]" : ""}>
                    CRM automation {def.crmAutomation ? "✓" : "—"}
                  </li>
                  <li className={def.realtimeAiInsights ? "text-[oklch(0.82_0.2_150)]" : ""}>
                    Realtime AI {def.realtimeAiInsights ? "✓" : "—"}
                  </li>
                  <li className={def.brokerManagement ? "text-[oklch(0.82_0.2_150)]" : ""}>
                    Broker mgmt {def.brokerManagement ? "✓" : "—"}
                  </li>
                  <li className={def.customWorkflows ? "text-[oklch(0.82_0.2_150)]" : ""}>
                    Custom workflows {def.customWorkflows ? "✓" : "—"}
                  </li>
                  <li className={def.dedicatedAiEngine ? "text-[oklch(0.82_0.2_150)]" : ""}>
                    Dedicated AI {def.dedicatedAiEngine ? "✓" : "—"}
                  </li>
                </ul>
                <div className="mt-4 flex flex-col gap-2">
                  {!current && (
                    <>
                      {PLANS.indexOf(plan) > PLANS.indexOf(b.subscription.plan) ? (
                        <Button
                          size="sm"
                          className="w-full gap-1"
                          onClick={() => b.changePlan(plan, user.email)}
                        >
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                          Upgrade
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full gap-1"
                          onClick={() => b.changePlan(plan, user.email)}
                        >
                          <ArrowDownCircle className="h-3.5 w-3.5" />
                          Downgrade
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </GlowCard>

      <GlowCard>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Team seats
        </h3>
        <div className="grid sm:grid-cols-3 gap-2 mb-4">
          <Mini label="Total seats" value={String(b.maxSeats)} />
          <Mini label="Used" value={String(b.usedSeats)} />
          <Mini label="Available" value={String(b.availableSeats)} />
        </div>
        <UsageBar
          label="Seat allocation vs plan cap"
          value={b.maxSeats ? (b.usedSeats / b.maxSeats) * 100 : 0}
          hint={`${b.usedSeats} / ${b.maxSeats}`}
        />
        <div className="grid lg:grid-cols-[1fr_280px] gap-4 mt-4">
          <div className="space-y-2 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
            {b.teamMembers.map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-2 glass rounded-lg p-2.5 transition-opacity duration-200"
              >
                <div className="flex-1 min-w-[140px]">
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-[11px] text-muted-foreground">{m.email}</div>
                </div>
                <select
                  value={m.role}
                  onChange={(e) => b.updateMemberRole(m.id, e.target.value as SeatRole)}
                  className="bg-input/40 border border-border rounded-md px-2 py-1 text-xs"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive h-8"
                  onClick={() => b.removeMember(m.id, user.email)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
          <div className="glass rounded-lg p-3 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Invite member
            </div>
            <Input
              placeholder="Name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="bg-input/40 h-9 text-sm"
            />
            <Input
              placeholder="Email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="bg-input/40 h-9 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as SeatRole)}
              className="w-full bg-input/40 border border-border rounded-md px-2 py-2 text-sm"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button size="sm" className="w-full" onClick={onInvite}>
              Invite member
            </Button>
          </div>
        </div>
      </GlowCard>

      <div className="grid lg:grid-cols-2 gap-4">
        <GlowCard className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Payment methods
          </h3>
          {b.paymentMethods.map((pm) => (
            <div
              key={pm.id}
              className="flex flex-wrap items-center justify-between gap-2 glass rounded-lg p-3"
            >
              <div>
                <div className="text-sm font-medium">
                  {pm.brand} ·••• {pm.last4}
                </div>
                <div className="text-[11px] text-muted-foreground">Exp {pm.exp}</div>
              </div>
              <div className="flex gap-2">
                {pm.isDefault ? (
                  <Badge variant="outline" className="text-[10px]">
                    Default
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => b.setDefaultPaymentMethod(pm.id)}
                  >
                    Set default
                  </Button>
                )}
              </div>
            </div>
          ))}
          <Separator className="bg-border/40" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Upcoming charges
            </div>
            <p className="text-sm tabular-nums font-medium">
              {formatMoney(b.upcomingCharge, b.subscription.currency)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Includes pending add-ons and proration estimates.
            </p>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Failed payments
            </div>
            {b.failedInvoiceIds.length ? (
              <ul className="text-sm text-destructive space-y-0.5">
                {b.failedInvoiceIds.map((id) => (
                  <li key={id}>{id}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">None — account in good standing.</p>
            )}
          </div>
        </GlowCard>

        <GlowCard className="space-y-3">
          <h3 className="font-semibold flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Billing profile
          </h3>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Billing address
            </div>
            <Textarea
              value={b.billingAddress}
              onChange={(e) => b.setBillingAddress(e.target.value)}
              className="min-h-[100px] bg-input/40 text-sm"
            />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Tax information
            </div>
            <Input
              value={b.taxId}
              onChange={(e) => b.setTaxId(e.target.value)}
              className="bg-input/40 text-sm"
            />
          </div>
        </GlowCard>
      </div>

      <GlowCard>
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Invoices
        </h3>
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="text-xs">Invoice</TableHead>
              <TableHead className="text-xs">Amount</TableHead>
              <TableHead className="text-xs">Status</TableHead>
              <TableHead className="text-xs">Issued</TableHead>
              <TableHead className="text-xs">Period</TableHead>
              <TableHead className="text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {b.invoices.map((inv) => (
              <TableRow key={inv.id} className="border-border/40">
                <TableCell className="font-mono text-xs">{inv.id}</TableCell>
                <TableCell className="tabular-nums text-sm">
                  {formatMoney(inv.amount, inv.currency)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusBadge(inv.status)}>
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{inv.issuedAt}</TableCell>
                <TableCell className="text-xs max-w-[140px] truncate">
                  {inv.renewalPeriod}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      onClick={() => setInvoiceOpen(inv)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      disabled={syncingInvoice === inv.id}
                      onClick={() => void syncOneInvoice(inv)}
                    >
                      {syncingInvoice === inv.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Clock className="h-3.5 w-3.5" />
                      )}
                      Sync
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1"
                      onClick={() => {
                        pushActivity(`Invoice PDF queued: ${inv.id}`, "download", "billing");
                        toast.success("Download started", { description: `${inv.id}.pdf` });
                      }}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </GlowCard>

      <Dialog open={!!invoiceOpen} onOpenChange={(o) => !o && setInvoiceOpen(null)}>
        <DialogContent className="glass-strong max-w-md">
          {invoiceOpen && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">{invoiceOpen.id}</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(invoiceOpen.amount, invoiceOpen.currency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="outline" className={statusBadge(invoiceOpen.status)}>
                    {invoiceOpen.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span>{invoiceOpen.issuedAt}</span>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase tracking-wider">
                    Renewal period
                  </span>
                  <p className="mt-1">{invoiceOpen.renewalPeriod}</p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
