import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useDashboard } from "@/lib/dashboard-store";
import {
  MOCK_PROPERTY,
  seedHistory,
  seedVerifications,
  statusFromRisk,
  trustGradeFromScore,
  riskFromScore,
  type TrustHistoryRow,
  type TrustRiskLevel,
  type TrustVerification,
  type TrustVerificationStatus,
} from "@/lib/trust-engine-model";
import {
  calculateTrustScore,
  fetchDeveloperReputation,
  fetchFraudSignals,
  fetchLegalRiskData,
  fetchOwnershipData,
  fetchRegulatoryData,
  generateTrustReport,
} from "@/lib/trust-engine-api";
import { GlowCard, Mini, SectionHeader } from "../utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  FileWarning,
  Gavel,
  Globe,
  Hash,
  Loader2,
  ShieldCheck,
  ShieldQuestion,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

function isoNow() {
  return new Date().toISOString();
}

function normalizeContribution(v: TrustVerification): number {
  if (v.id === "final") return v.score;
  return v.lowerIsBetter ? 100 - v.score : v.score;
}

function withRecalculatedFinal(list: TrustVerification[]): TrustVerification[] {
  const dims = list.filter((x) => x.id !== "final");
  if (!dims.length) return list;
  const avg = Math.round(dims.reduce((s, x) => s + normalizeContribution(x), 0) / dims.length);
  const risk = riskFromScore(avg, false);
  const status = statusFromRisk(risk, avg, false);
  return list.map((x) =>
    x.id === "final"
      ? {
          ...x,
          score: avg,
          riskLevel: risk,
          status,
          lastCheckedIso: isoNow(),
          aiSummary: `Composite trust (mock): normalized average of dimensional checks = ${avg}/100.`,
        }
      : x,
  );
}

function iconFor(id: string) {
  switch (id) {
    case "ownership":
      return ShieldCheck;
    case "rera":
      return Building2;
    case "developer":
      return Building2;
    case "legal":
      return Gavel;
    case "fraud":
      return ShieldQuestion;
    case "price":
      return Hash;
    case "document":
      return ClipboardList;
    case "crossborder":
      return Globe;
    default:
      return ShieldCheck;
  }
}

function riskClass(level: TrustRiskLevel) {
  if (level === "Low") return "text-[oklch(0.82_0.2_150)]";
  if (level === "Medium") return "text-[oklch(0.88_0.18_60)]";
  if (level === "High") return "text-orange-400";
  return "text-destructive";
}

function statusBadgeVariant(s: TrustVerificationStatus) {
  if (s === "Verified") return "border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)] bg-[oklch(0.82_0.2_150_/_0.08)]";
  if (s === "High Risk") return "border-destructive/50 text-destructive bg-destructive/10";
  if (s === "Warning" || s === "Needs Manual Review") return "border-[oklch(0.78_0.2_50_/_0.45)] text-[oklch(0.88_0.18_60)] bg-[oklch(0.78_0.2_50_/_0.08)]";
  if (s === "Searching Data") return "border-primary/40 text-primary bg-primary/5";
  return "border-border text-muted-foreground";
}

function sourceBadgeClass(src: string) {
  if (src === "Mock Data") return "text-[10px] border-border/60";
  if (src === "Supabase Ready") return "text-[10px] border-primary/40 text-primary";
  if (src === "API Required") return "text-[10px] border-[oklch(0.88_0.18_60)_/_0.5)] text-[oklch(0.88_0.18_60)]";
  return "text-[10px] border-[oklch(0.82_0.2_150_/_0.4)] text-[oklch(0.82_0.2_150)]";
}

function buildCsvRow(reportId: string, v: TrustVerification, verifiedBy: string) {
  return [
    reportId,
    MOCK_PROPERTY.name,
    MOCK_PROPERTY.location,
    v.name,
    v.status,
    String(v.score),
    v.riskLevel,
    v.findings.join(" | "),
    v.recommendedAction,
    verifiedBy,
    v.lastCheckedIso ?? "",
  ]
    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
    .join(",");
}

function useMinWidth(px: number) {
  const get = () => (typeof window !== "undefined" ? window.matchMedia(`(min-width: ${px}px)`).matches : false);
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${px}px)`);
    const fn = () => setMatches(mq.matches);
    fn();
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, [px]);
  return matches;
}

function verificationToastDescription(risk: TrustRiskLevel): string {
  if (risk === "Low") return "Low risk on this dimension (mock). View report for details.";
  if (risk === "Medium") return "Medium risk detected (mock). View report for details.";
  if (risk === "High") return "High risk signals (mock). View report for details.";
  return "Critical risk flagged (mock). View report for details.";
}

type TrustReportBodyProps = {
  report: TrustVerification;
  overallScore: number;
  onClose: () => void;
  onDownloadRow: () => void;
};

function TrustReportBody({ report, overallScore, onClose, onDownloadRow }: TrustReportBodyProps) {
  return (
    <>
      <div className="space-y-1 pr-6">
        <h2 className="text-lg font-semibold tracking-tight">Trust verification report</h2>
        <p className="text-sm text-muted-foreground">
          {MOCK_PROPERTY.name} · {MOCK_PROPERTY.location}{" "}
          <Badge variant="outline" className="text-[9px] ml-1 align-middle">
            Mock / API-ready
          </Badge>
        </p>
      </div>
      <div className="grid sm:grid-cols-2 gap-2 text-sm">
        <Mini label="Verification type" value={report.name} />
        <Mini label="Overall trust (composite)" value={String(overallScore)} />
        <Mini label="This dimension score" value={String(report.score)} />
        <Mini label="Risk" value={report.riskLevel} />
        <Mini label="Status" value={report.status} />
        <Mini label="Last updated" value={report.lastCheckedIso ? new Date(report.lastCheckedIso).toLocaleString() : "—"} />
        <Mini label="Data source" value={report.dataSource} />
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">AI summary</div>
        <p className="text-sm text-muted-foreground">{report.aiSummary}</p>
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Findings</div>
        <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
          {report.findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      <div className="mt-3 space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Evidence checklist</div>
        <ul className="list-disc pl-4 text-sm text-muted-foreground space-y-1">
          {report.evidence.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
      <div className="glass rounded-lg p-3 mt-3 border border-border/40 text-sm">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Risk explanation</div>
        <p className="mt-1 text-muted-foreground">{report.riskExplanation}</p>
      </div>
      <div className="glass rounded-lg p-3 mt-3 border border-primary/25 text-sm">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Recommended action</div>
        <p className="mt-1 neon-text">→ {report.recommendedAction}</p>
      </div>
      {report.manualReviewNotes ? (
        <div className="mt-3 text-sm">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Manual review notes</div>
          <p className="text-muted-foreground">{report.manualReviewNotes}</p>
        </div>
      ) : null}
      {report.manualVerified ? (
        <div className="mt-2 text-xs text-[oklch(0.82_0.2_150)]">
          Manually verified by {report.manualVerified.by} on {new Date(report.manualVerified.at).toLocaleString()}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-border/40 mt-4">
        <Button variant="outline" onClick={onDownloadRow}>
          Download this row (CSV)
        </Button>
        <Button onClick={onClose}>Close</Button>
      </div>
    </>
  );
}

export function TrustSection() {
  const { pushActivity, user } = useDashboard();
  const reportDrawerWide = useMinWidth(1024);
  const [verifications, setVerifications] = useState<TrustVerification[]>(() => withRecalculatedFinal(seedVerifications()));
  const verificationsRef = useRef(verifications);
  verificationsRef.current = verifications;
  const [history, setHistory] = useState<TrustHistoryRow[]>(() => seedHistory(seedVerifications()));
  const [report, setReport] = useState<TrustVerification | null>(null);
  const [markTarget, setMarkTarget] = useState<TrustVerification | null>(null);
  const [markNote, setMarkNote] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [stepLabel, setStepLabel] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    status: "All" as TrustVerificationStatus | "All",
    risk: "All" as TrustRiskLevel | "All",
    vType: "All",
    lastChecked: "All",
    dataSource: "All",
  });

  const overall = useMemo(() => {
    const dims = verifications.filter((x) => x.id !== "final");
    const avg = Math.round(dims.reduce((s, x) => s + normalizeContribution(x), 0) / Math.max(1, dims.length));
    return { score: avg, grade: trustGradeFromScore(avg), risk: riskFromScore(avg, false) };
  }, [verifications]);

  const filteredCards = useMemo(() => {
    return verifications.filter((v) => {
      if (filters.status !== "All" && v.status !== filters.status) return false;
      if (filters.risk !== "All" && v.riskLevel !== filters.risk) return false;
      if (filters.vType !== "All" && v.name !== filters.vType) return false;
      if (filters.dataSource !== "All" && v.dataSource !== filters.dataSource) return false;
      if (filters.lastChecked !== "All" && v.lastCheckedIso) {
        const t = new Date(v.lastCheckedIso).getTime();
        const now = Date.now();
        const day = 86400000;
        if (filters.lastChecked === "Today" && now - t > day) return false;
        if (filters.lastChecked === "7d" && now - t > 7 * day) return false;
        if (filters.lastChecked === "30d" && now - t > 30 * day) return false;
      }
      if (filters.lastChecked !== "All" && !v.lastCheckedIso) return false;
      return true;
    });
  }, [verifications, filters]);

  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      if (filters.status !== "All" && h.status !== filters.status) return false;
      if (filters.risk !== "All" && h.risk !== filters.risk) return false;
      if (filters.vType !== "All" && h.verificationType !== filters.vType) return false;
      if (filters.dataSource !== "All") {
        const v = verifications.find((x) => x.name === h.verificationType);
        if (!v || v.dataSource !== filters.dataSource) return false;
      }
      if (filters.lastChecked !== "All") {
        const t = new Date(h.dateIso).getTime();
        const now = Date.now();
        const day = 86400000;
        if (filters.lastChecked === "Today" && now - t > day) return false;
        if (filters.lastChecked === "7d" && now - t > 7 * day) return false;
        if (filters.lastChecked === "30d" && now - t > 30 * day) return false;
      }
      return true;
    });
  }, [history, filters, verifications]);

  const activityPreview = useMemo(() => history.slice(0, 6), [history]);

  const runSteps = useCallback(async (propertyId: string) => {
    setStepLabel("Checking ownership records…");
    await fetchOwnershipData(propertyId);
    setStepLabel("Checking regulatory / RERA status…");
    await fetchRegulatoryData(propertyId);
    setStepLabel("Scanning legal risk signals…");
    await fetchLegalRiskData(propertyId);
    setStepLabel("Checking duplicate listing risk…");
    await fetchFraudSignals(propertyId);
    setStepLabel("Evaluating developer reputation…");
    await fetchDeveloperReputation(propertyId);
    setStepLabel("Calculating final trust score…");
    await calculateTrustScore([]);
  }, []);

  const jitterScore = (v: TrustVerification): TrustVerification => {
    const delta = Math.floor((Math.random() - 0.35) * 12);
    let next = Math.min(100, Math.max(0, v.score + delta));
    if (v.lowerIsBetter) next = Math.min(100, Math.max(0, v.score + Math.floor((Math.random() - 0.5) * 8)));
    const risk = riskFromScore(next, v.lowerIsBetter);
    const status = statusFromRisk(risk, next, v.lowerIsBetter);
    return {
      ...v,
      score: next,
      riskLevel: risk,
      status,
      lastCheckedIso: isoNow(),
      aiSummary: `Mock / API-ready: refreshed ${v.name.toLowerCase()} — not live government data.`,
    };
  };

  const handleRunVerification = async (id: string) => {
    setRunningId(id);
    setStepLabel("Searching verification data…");
    setVerifications((list) => list.map((x) => (x.id === id ? { ...x, status: "Searching Data" } : x)));
    try {
      await runSteps(MOCK_PROPERTY.id);
      const rep = await generateTrustReport(MOCK_PROPERTY.id);
      const prev = verificationsRef.current;
      const t = prev.find((x) => x.id === id);
      if (!t) return;
      const j = jitterScore(t);
      const nextList = withRecalculatedFinal(prev.map((x) => (x.id === id ? j : x)));
      setVerifications(nextList);
      const u = nextList.find((x) => x.id === id)!;
      setHistory((h) => [
        {
          id: `h_${Date.now().toString(36)}`,
          dateIso: isoNow(),
          verificationType: u.name,
          status: u.status,
          score: u.score,
          risk: u.riskLevel,
          actionTaken: "Mock automated verification",
          verifiedBy: "System (mock)",
          reportId: rep.reportId,
        },
        ...h,
      ]);
      pushActivity(`Trust verification run: ${u.name}`, "shield-check", "trust");
      toast.success("Verification completed", {
        description: `Mock / API-ready — ${verificationToastDescription(u.riskLevel)}`,
      });
    } finally {
      setRunningId(null);
      setStepLabel(null);
    }
  };

  const handleMarkConfirm = () => {
    if (!markTarget) return;
    const by = user.name || "Broker";
    setVerifications((list) => {
      const next = list.map((x) =>
        x.id === markTarget.id
          ? {
              ...x,
              status: "Verified" as const,
              riskLevel: "Low" as const,
              score: 95,
              lastCheckedIso: isoNow(),
              manualVerified: { by, note: markNote.trim() || "Manual override", at: isoNow() },
              manualReviewNotes: markNote.trim(),
              aiSummary: `Manually marked verified by ${by}. ${markNote.trim() || "No note provided."}`,
            }
          : x,
      );
      return withRecalculatedFinal(next);
    });
    setHistory((h) => [
      {
        id: `h_${Date.now().toString(36)}`,
        dateIso: isoNow(),
        verificationType: markTarget.name,
        status: "Verified",
        score: 95,
        risk: "Low",
        actionTaken: "Manual mark verified",
        verifiedBy: by,
        reportId: `TR-manual-${Date.now().toString(36)}`,
      },
      ...h,
    ]);
    pushActivity(`Manual trust mark: ${markTarget.name}`, "user-check", "trust");
    toast.success("Verification marked as verified");
    setMarkTarget(null);
    setMarkNote("");
  };

  const downloadCsv = (scope: "all" | "single", v?: TrustVerification) => {
    const reportId = `TR-${Date.now().toString(36)}`;
    const header =
      "report_id,property_name,location,verification_type,status,score,risk_level,findings,recommendation,verified_by,last_updated";
    const rows: string[] = [header];
    const list = scope === "single" && v ? [v] : verifications.filter((x) => x.id !== "final");
    for (const row of list) {
      rows.push(buildCsvRow(reportId, row, row.manualVerified?.by ?? "—"));
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "realestateos-trust-report.csv";
    a.click();
    URL.revokeObjectURL(url);
    pushActivity("Downloaded trust CSV report", "download", "trust");
    toast.success("CSV report downloaded", { description: "realestateos-trust-report.csv" });
  };

  const handlePdf = () => {
    toast.message("PDF export will be available in production.", {
      description: "CSV report downloaded successfully.",
    });
    downloadCsv("all");
  };

  const ringStyle = useMemo(
    () => ({
      background: `conic-gradient(var(--neon) ${overall.score * 3.6}deg, oklch(0.22 0.04 265 / 0.6) 0deg)`,
    }),
    [overall.score],
  );

  const verificationNames = useMemo(() => ["All", ...verifications.map((v) => v.name)], [verifications]);
  const dataSources = useMemo(() => ["All", "Mock Data", "Supabase Ready", "API Required", "Last Synced"], []);

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Property Trust & Risk Verification Engine"
        subtitle="Verify ownership signals, regulatory status, legal risk, fraud indicators, developer reputation, and property trust score before promoting or recommending a property."
      >
        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
          Mock / API-ready
        </Badge>
      </SectionHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlowCard className="lg:col-span-2 flex flex-col sm:flex-row gap-6 items-center">
          <div
            className="relative h-36 w-36 shrink-0 rounded-full p-1 transition-all duration-700"
            style={ringStyle}
          >
            <div className="h-full w-full rounded-full bg-background flex flex-col items-center justify-center border border-border/60">
              <div className="text-3xl font-bold neon-text tabular-nums">{overall.score}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Trust</div>
            </div>
          </div>
          <div className="flex-1 space-y-2 w-full">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">Overall Trust Score</span>
              <Badge variant="outline" className={cn("text-xs", statusBadgeVariant("Verified"))}>
                {overall.grade}
              </Badge>
              <Badge variant="outline" className={cn("text-xs", riskClass(overall.risk))}>
                Risk {overall.risk}
              </Badge>
            </div>
            <Progress value={overall.score} className="h-2 bg-primary/10 transition-all duration-500" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Composite = average of normalized dimensional scores (risk metrics inverted).{" "}
              <span className="text-primary/90">Not live RERA / land-registry data.</span>
            </p>
            <p className="text-xs text-foreground/80">
              Next step: connect{" "}
              <code className="text-[10px] px-1 rounded bg-input/50">fetchOwnershipData</code> and related stubs in{" "}
              <code className="text-[10px] px-1 rounded bg-input/50">trust-engine-api.ts</code>.
            </p>
          </div>
        </GlowCard>

        <GlowCard>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <FileWarning className="h-4 w-4 text-primary" />
            Risk summary
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Mock signals favor a <strong className={riskClass(overall.risk)}>{overall.risk}</strong> portfolio stance.
            Escalate any <strong>Needs Manual Review</strong> dimension before investor marketing.
          </p>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <Mini label="Dimensions OK" value={String(verifications.filter((x) => x.id !== "final" && x.status === "Verified").length)} />
            <Mini label="Warnings +" value={String(verifications.filter((x) => x.status === "Warning" || x.status === "Needs Manual Review").length)} />
          </div>
        </GlowCard>
      </div>

      <GlowCard>
        <h3 className="text-sm font-semibold mb-3">Filters</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <FilterSel label="Status" value={filters.status} opts={["All", "Not Started", "Searching Data", "Verified", "Warning", "High Risk", "Needs Manual Review"]} onChange={(v) => setFilters((f) => ({ ...f, status: v as typeof filters.status }))} />
          <FilterSel label="Risk" value={filters.risk} opts={["All", "Low", "Medium", "High", "Critical"]} onChange={(v) => setFilters((f) => ({ ...f, risk: v as typeof filters.risk }))} />
          <FilterSel label="Verification type" value={filters.vType} opts={verificationNames} onChange={(v) => setFilters((f) => ({ ...f, vType: v }))} />
          <FilterSel label="Last checked" value={filters.lastChecked} opts={["All", "Today", "7d", "30d"]} onChange={(v) => setFilters((f) => ({ ...f, lastChecked: v }))} />
          <FilterSel label="Data source" value={filters.dataSource} opts={dataSources} onChange={(v) => setFilters((f) => ({ ...f, dataSource: v }))} />
        </div>
      </GlowCard>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold">Verification status</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredCards.map((v) => {
              const Icon = iconFor(v.id);
              const busy = runningId === v.id;
              return (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <GlowCard className="flex flex-col gap-2 h-full">
                  <div className="flex items-start justify-between gap-2">
                    <Icon className={cn("h-6 w-6 shrink-0", riskClass(v.riskLevel))} />
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="outline" className={cn("text-[10px]", statusBadgeVariant(v.status))}>
                        {busy ? "Searching Data" : v.status}
                      </Badge>
                      <Badge variant="outline" className={sourceBadgeClass(v.dataSource)}>
                        {v.dataSource}
                      </Badge>
                    </div>
                  </div>
                  <div className="font-semibold leading-snug">{v.name}</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="text-muted-foreground">Score</span>
                    <span className="font-mono font-semibold">{v.lowerIsBetter ? `${v.score} (risk index)` : `${v.score}/100`}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className={riskClass(v.riskLevel)}>Risk {v.riskLevel}</span>
                  </div>
                  {v.lastCheckedIso && (
                    <div className="text-[10px] text-muted-foreground">Last checked {new Date(v.lastCheckedIso).toLocaleString()}</div>
                  )}
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1">{v.aiSummary}</p>
                  {v.manualVerified && (
                    <Badge variant="outline" className="text-[10px] w-fit border-[oklch(0.82_0.2_150_/_0.5)] text-[oklch(0.82_0.2_150)]">
                      Manually Verified · {v.manualVerified.by} · {new Date(v.manualVerified.at).toLocaleString()}
                    </Badge>
                  )}
                  {busy && (
                    <div className="space-y-1">
                      <div className="text-[11px] text-primary font-medium">Searching verification data…</div>
                      {stepLabel ? <div className="text-[11px] text-muted-foreground">{stepLabel}</div> : null}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => void handleRunVerification(v.id)}>
                      {busy ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Searching…
                        </>
                      ) : (
                        "Run Verification"
                      )}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setReport(v); pushActivity(`Opened trust report: ${v.name}`, "file-text", "trust"); }}>
                      View Report
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setMarkTarget(v)}>
                      Mark Verified
                    </Button>
                  </div>
                </GlowCard>
                </motion.div>
              );
            })}
          </div>
          {filteredCards.length === 0 && <p className="text-sm text-muted-foreground">No cards match filters.</p>}
        </div>

        <div className="space-y-3">
          <GlowCard>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Latest verification activity
            </h3>
            <ScrollArea className="h-64 pr-3">
              <div className="space-y-2 text-xs">
                {activityPreview.map((a) => (
                  <div key={a.id} className="glass rounded-lg p-2 border border-border/40">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{a.verificationType}</span>
                      <span className="text-muted-foreground tabular-nums">{new Date(a.dateIso).toLocaleString()}</span>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {a.actionTaken} · {a.status} · score {a.score}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </GlowCard>

          <GlowCard>
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Download className="h-4 w-4 text-primary" />
              Downloadable report
            </h3>
            <p className="text-xs text-muted-foreground mb-3">CSV includes all dimensional rows (excludes composite duplicate rows in export logic).</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button size="sm" className="neon-border gap-1.5" onClick={() => downloadCsv("all")}>
                <Download className="h-3.5 w-3.5" />
                Download Report (CSV)
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={handlePdf}>
                <FileText className="h-3.5 w-3.5" />
                Download PDF
              </Button>
            </div>
          </GlowCard>
        </div>
      </div>

      <GlowCard>
        <h3 className="text-sm font-semibold mb-3">Verification history</h3>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                <TableHead className="text-xs">Type</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Score</TableHead>
                <TableHead className="text-xs">Risk</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Verified by</TableHead>
                <TableHead className="text-xs text-right">Report</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredHistory.map((h) => (
                <TableRow key={h.id} className="border-border/40 text-xs">
                  <TableCell className="whitespace-nowrap">{new Date(h.dateIso).toLocaleString()}</TableCell>
                  <TableCell>{h.verificationType}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px]", statusBadgeVariant(h.status))}>
                      {h.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="tabular-nums">{h.score}</TableCell>
                  <TableCell className={riskClass(h.risk)}>{h.risk}</TableCell>
                  <TableCell>{h.actionTaken}</TableCell>
                  <TableCell>{h.verifiedBy}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7"
                      onClick={() => {
                        const v = verifications.find((x) => x.name === h.verificationType);
                        if (v) setReport(v);
                        pushActivity(`Opened history report row: ${h.reportId}`, "file-text", "trust");
                      }}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredHistory.length === 0 && <p className="text-xs text-muted-foreground mt-2">No history rows match filters.</p>}
      </GlowCard>

      {reportDrawerWide ? (
        <Sheet open={!!report} onOpenChange={(o) => !o && setReport(null)}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl lg:max-w-2xl overflow-y-auto glass-strong border-border/60 scrollbar-thin flex flex-col gap-4 pt-10"
          >
            {report ? (
              <>
                <SheetHeader className="space-y-1 text-left">
                  <SheetTitle className="sr-only">Trust verification report</SheetTitle>
                  <SheetDescription className="sr-only">
                    Mock verification details for {report.name}
                  </SheetDescription>
                </SheetHeader>
                <TrustReportBody
                  report={report}
                  overallScore={overall.score}
                  onClose={() => setReport(null)}
                  onDownloadRow={() => downloadCsv("single", report)}
                />
              </>
            ) : null}
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={!!report} onOpenChange={(o) => !o && setReport(null)}>
          <DialogContent className="w-[min(100vw-1rem,48rem)] max-h-[min(100dvh,92vh)] max-sm:h-[100dvh] max-sm:max-w-none max-sm:rounded-none glass-strong border-border/60 overflow-y-auto scrollbar-thin">
            {report ? (
              <>
                <DialogHeader>
                  <DialogTitle className="sr-only">Trust verification report</DialogTitle>
                  <DialogDescription className="sr-only">Mock verification details</DialogDescription>
                </DialogHeader>
                <TrustReportBody
                  report={report}
                  overallScore={overall.score}
                  onClose={() => setReport(null)}
                  onDownloadRow={() => downloadCsv("single", report)}
                />
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={!!markTarget} onOpenChange={(o) => !o && (setMarkTarget(null), setMarkNote(""))}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm manual verification</DialogTitle>
            <DialogDescription>
              Are you sure you want to manually mark this verification as verified? Applies to{" "}
              <strong>{markTarget?.name}</strong>. This does not replace real legal diligence.
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Reason / internal note</div>
            <Textarea value={markNote} onChange={(e) => setMarkNote(e.target.value)} placeholder="e.g. Counsel reviewed SPA v3…" className="bg-input/40 min-h-[88px]" />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => { setMarkTarget(null); setMarkNote(""); }}>
              Cancel
            </Button>
            <Button onClick={handleMarkConfirm}>Confirm Mark Verified</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterSel({
  label,
  value,
  opts,
  onChange,
}: {
  label: string;
  value: string;
  opts: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 bg-input/40 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="glass-strong max-h-64">
          {opts.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
