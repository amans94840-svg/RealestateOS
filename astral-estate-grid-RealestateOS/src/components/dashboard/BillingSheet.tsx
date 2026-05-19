import { useEffect, useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Check, CreditCard, Gift, X, DownloadCloud, RefreshCw, Plus, Trash2 } from "lucide-react";
import {
  PLANS,
  fetchCurrentSubscription,
  fetchPaymentHistory,
  fetchInvoices,
  createRazorpayOrder,
  openRazorpayCheckout,
  verifyRazorpayPayment,
  updateWorkspacePlan,
  updateSeatCount,
  upgradeSubscription,
  downloadInvoice,
} from "@/lib/billing-api";
import { useDashboard } from "@/lib/dashboard-store";

type Props = {
  open: boolean;
  onOpenChange: (b: boolean) => void;
};

export function BillingSheet({ open, onOpenChange }: Props) {
  const { user, pushActivity } = useDashboard();
  const workspaceId = user.company || undefined;

  const [selectedPlan, setSelectedPlan] = useState(PLANS[0].id);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [currentSub, setCurrentSub] = useState<any | null>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [selectedSeats, setSelectedSeats] = useState<number>(1);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [lastSynced, setLastSynced] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const s = await fetchCurrentSubscription(workspaceId);
        const h = await fetchPaymentHistory(workspaceId);
        const inv = await fetchInvoices(workspaceId);
        if (!mounted) return;
        setCurrentSub(s);
        setPayments(h);
        setInvoices(inv);
        if (s) setSelectedPlan(s.plan);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, workspaceId]);

  const selectedPlanObj = useMemo(() => PLANS.find((p) => p.id === selectedPlan)!, [selectedPlan]);

  async function handlePayNow() {
    try {
      setLoading(true);
      // 1) create order on server (Razorpay secret key must remain on server)
      const order = await createRazorpayOrder(selectedPlan, billingCycle, workspaceId);
      // 2) open checkout (frontend SDK) - placeholder
      const paymentResponse = await openRazorpayCheckout(order);
      // 3) verify server-side (signature) - placeholder
      const verification = await verifyRazorpayPayment(paymentResponse);
      if (!verification.verified) {
        toast.error("Payment verification failed");
        return;
      }
      // 4) update subscription record on server (create subscription/payment rows)
      const sub = await updateWorkspacePlan(selectedPlan, { ...paymentResponse, billingCycle }, workspaceId);
      setCurrentSub(sub);
      pushActivity(`Upgraded workspace to ${selectedPlanObj.name}`, "sparkles", "billing");
      toast.success("Payment successful");
      // close sheet after payment
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Payment failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(invoiceId: string) {
    // Prefer server-provided PDF when available
    const r = await downloadInvoice(invoiceId);
    if (r?.url) {
      window.open(r.url, "_blank");
      toast.success("Invoice opened");
      return;
    }
    // fallback: create CSV/text
    const inv = invoices.find((i) => i.id === invoiceId) || payments.find((p) => p.id === invoiceId);
    if (!inv) {
      toast.error("Invoice not found");
      return;
    }
    const csv = `invoice_id,plan,amount,currency,issued_at\n${inv.id || inv.invoice_id},${inv.plan},${inv.amount},${inv.currency || "INR"},${inv.issued_at || inv.created_at}\n`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `realestateos-invoice-${invoiceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Invoice downloaded");
  }

  function handleOpenSeatModal() {
    setSelectedSeats(currentSub?.seat_limit ?? 1);
    setSeatModalOpen(true);
  }

  async function handleSaveSeats() {
    setLoading(true);
    try {
      await updateSeatCount(workspaceId, currentSub?.id ?? "sub_mock", selectedSeats);
      setCurrentSub((s: any) => ({ ...s, seat_limit: selectedSeats }));
      toast.success("Seat count updated");
      setSeatModalOpen(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update seats");
    } finally {
      setLoading(false);
    }
  }

  const isTestMode = !Boolean(import.meta.env.VITE_RAZORPAY_KEY_ID);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md md:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Billing & Plans</SheetTitle>
              <SheetDescription>Manage your workspace subscription and payments.</SheetDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
              <X />
            </Button>
          </div>
        </SheetHeader>

        <div className="grid gap-4 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-muted-foreground">Current Plan</div>
                  <div className="text-lg font-semibold">{currentSub ? currentSub.plan : "Starter"}</div>
                </div>
                <Badge>{currentSub ? currentSub.billing_cycle : "monthly"}</Badge>
              </div>
              <div className="mt-3 text-sm text-muted-foreground">Seats: {currentSub ? currentSub.seat_limit : 1}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Seat usage</div>
              <div className="mt-2 text-lg font-semibold">{(currentSub?.used_seats ?? 1) + " / " + (currentSub?.seat_limit ?? 1)}</div>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={handleOpenSeatModal}>
                  Manage Seats
                </Button>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Renewal</div>
              <div className="mt-2 text-lg font-semibold">
                {currentSub ? new Date(currentSub.current_period_end).toLocaleDateString() : "—"}
              </div>
            </Card>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Monthly cost</div>
              <div className="mt-2 text-lg font-semibold">₹{currentSub ? (currentSub.plan === "pro" ? 1999 : 0) : 0}</div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Payment status</div>
              <div className="mt-2">
                <Badge>{payments.length ? "Up to date" : "No payments"}</Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm text-muted-foreground">Workspace billing</div>
              <div className="mt-2 text-sm">{user.company || "Workspace not set"}</div>
            </Card>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Choose a plan</div>
              <div className="flex items-center gap-2 text-sm">
                <div>Monthly</div>
                <Tabs defaultValue={billingCycle}>
                  <TabsList>
                    <TabsTrigger value="monthly" onClick={() => setBillingCycle("monthly")}>
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value="yearly" onClick={() => setBillingCycle("yearly")}>
                      Yearly
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <div>Yearly</div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {PLANS.map((p) => {
                const isCurrent = currentSub?.plan === p.id;
                const isHigher =
                  (currentSub?.plan === "starter" && p.id === "pro") ||
                  (currentSub?.plan === "starter" && p.id === "enterprise") ||
                  (currentSub?.plan === "pro" && p.id === "enterprise");
                return (
                  <Card key={p.id} className="p-4">
                    <CardHeader className="flex items-start justify-between p-0">
                      <div>
                        <CardTitle className="text-sm">{p.name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-1">{p.seats} seats</div>
                      </div>
                      <div className="text-right">
                        {p.priceMonthly >= 0 ? (
                          <div className="text-lg font-bold">
                            ₹{billingCycle === "monthly" ? p.priceMonthly : Math.round(p.priceYearly)}
                          </div>
                        ) : (
                          <div className="text-sm">Custom</div>
                        )}
                        {p.popular ? <Badge className="mt-1">Popular</Badge> : null}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="mt-3 mb-3 text-sm text-muted-foreground space-y-1">
                        {p.features.map((f) => (
                          <li key={f} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-emerald-300" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-center justify-between gap-2">
                        {isCurrent ? <Badge>Current plan</Badge> : null}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPlan(p.id);
                              setPaymentModalOpen(true);
                            }}
                            disabled={isCurrent}
                          >
                            {isCurrent ? "Current Plan" : p.id === "enterprise" ? "Contact Sales" : isHigher ? "Upgrade" : "Downgrade"}
                          </Button>
                          {!isCurrent && p.id !== "enterprise" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPlan(p.id);
                              }}
                            >
                              Select
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Payment method</div>
              <div className="text-xs text-muted-foreground">Razorpay (demo)</div>
            </div>
            <Card className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard />
                <div>
                  <div className="text-sm font-medium">Card ending •••• 4242</div>
                  <div className="text-xs text-muted-foreground">Expires 12/26</div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast("Open payment methods")}>
                Manage
              </Button>
            </Card>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div />
            <div>
              <Button disabled={loading} onClick={handlePayNow}>
                Pay now
              </Button>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold mb-2">Payment history</div>
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>₹{p.amount}</TableCell>
                      <TableCell>{p.plan}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedPlan(p.plan); setPaymentModalOpen(true); }}>
                            View
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(p.id)}>
                            <DownloadCloud className="mr-2 h-4 w-4" /> Receipt
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Invoices</div>
              <div className="text-xs text-muted-foreground">CSV / PDF</div>
            </div>
            <Card className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.invoice_number || inv.id}</TableCell>
                      <TableCell>₹{inv.amount}</TableCell>
                      <TableCell>{inv.status}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleDownload(inv.id)}>
                            <DownloadCloud className="mr-2 h-4 w-4" /> Download
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => toast(`Viewing ${inv.invoice_number}`)}>
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={async () => {
                setLoading(true);
                await new Promise(r=>setTimeout(r,400));
                setLastSynced(Date.now());
                toast.success('Billing refreshed');
                setLoading(false);
              }}><RefreshCw className="mr-2 h-4 w-4" /> Refresh billing</Button>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{isTestMode ? 'Test Mode' : 'Live'}</Badge>
              <Button size="sm" variant="destructive" onClick={() => setCancelModalOpen(true)}><Trash2 className="mr-2 h-4 w-4" /> Cancel plan</Button>
            </div>
          </div>
        </div>

        {/* Seat management dialog */}
        <Dialog open={seatModalOpen} onOpenChange={setSeatModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage seats</DialogTitle>
            </DialogHeader>
            <div className="p-2">
              <div className="text-sm text-muted-foreground">Adjust number of seats for your workspace</div>
              <div className="mt-3 flex items-center gap-2">
                <Button size="sm" onClick={() => setSelectedSeats((s) => Math.max(1, s - 1))}>-</Button>
                <Input value={String(selectedSeats)} onChange={(e) => setSelectedSeats(Number(e.target.value || 1))} className="w-20 text-center" />
                <Button size="sm" onClick={() => setSelectedSeats((s) => s + 1)}>+</Button>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSeatModalOpen(false)}>Cancel</Button>
                <Button onClick={handleSaveSeats}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment confirmation dialog */}
        <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm payment</DialogTitle>
            </DialogHeader>
            <div className="p-2">
              <div className="text-sm">You are about to purchase the <strong>{selectedPlanObj?.name}</strong> plan ({billingCycle}).</div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setPaymentModalOpen(false)}>Cancel</Button>
                <Button onClick={async () => { setPaymentModalOpen(false); await handlePayNow(); }}>Pay now</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Cancel confirmation dialog */}
        <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel subscription</DialogTitle>
            </DialogHeader>
            <div className="p-2">
              <div className="text-sm text-muted-foreground">Are you sure you want to cancel your subscription? This will revert your workspace to Starter.</div>
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setCancelModalOpen(false)}>No, keep plan</Button>
                <Button variant="destructive" onClick={async () => {
                  setCancelModalOpen(false);
                  setLoading(true);
                  try {
                    await upgradeSubscription(workspaceId, "starter", "monthly");
                    setCurrentSub({ ...currentSub, plan: "starter", seat_limit: 1 });
                    toast.success("Subscription cancelled");
                  } catch (e) {
                    console.error(e);
                    toast.error("Failed to cancel");
                  } finally {
                    setLoading(false);
                  }
                }}>Confirm cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}

export default BillingSheet;

