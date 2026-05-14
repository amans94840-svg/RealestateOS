export type TrustVerificationStatus =
  | "Not Started"
  | "Searching Data"
  | "Verified"
  | "Warning"
  | "High Risk"
  | "Needs Manual Review";

export type TrustRiskLevel = "Low" | "Medium" | "High" | "Critical";

export type DataSourceBadge = "Mock Data" | "Supabase Ready" | "API Required" | "Last Synced";

export type TrustVerification = {
  id: string;
  name: string;
  status: TrustVerificationStatus;
  score: number;
  riskLevel: TrustRiskLevel;
  lastCheckedIso: string | null;
  dataSource: DataSourceBadge;
  aiSummary: string;
  /** When true, lower numeric score = better (risk metrics). */
  lowerIsBetter?: boolean;
  manualVerified?: { by: string; note: string; at: string } | null;
  findings: string[];
  evidence: string[];
  riskExplanation: string;
  recommendedAction: string;
  manualReviewNotes: string;
};

export type TrustHistoryRow = {
  id: string;
  dateIso: string;
  verificationType: string;
  status: TrustVerificationStatus;
  score: number;
  risk: TrustRiskLevel;
  actionTaken: string;
  verifiedBy: string;
  reportId: string;
};

export const MOCK_PROPERTY = {
  id: "prop-marina-skyline",
  name: "Marina Skyline Penthouse",
  location: "Dubai Marina, UAE",
};

export function trustGradeFromScore(score: number): string {
  if (score >= 90) return "Highly Trusted";
  if (score >= 75) return "Trusted";
  if (score >= 60) return "Needs Review";
  if (score >= 40) return "Risky";
  return "High Risk";
}

export function riskFromScore(score: number, lowerIsBetter?: boolean): TrustRiskLevel {
  if (lowerIsBetter) {
    if (score <= 15) return "Low";
    if (score <= 35) return "Medium";
    if (score <= 55) return "High";
    return "Critical";
  }
  if (score >= 88) return "Low";
  if (score >= 72) return "Medium";
  if (score >= 55) return "High";
  return "Critical";
}

export function statusFromRisk(risk: TrustRiskLevel, score: number, lowerIsBetter?: boolean): TrustVerificationStatus {
  if (lowerIsBetter) {
    if (score <= 20) return "Verified";
    if (score <= 40) return "Warning";
    if (score <= 60) return "Needs Manual Review";
    return "High Risk";
  }
  if (score >= 85) return "Verified";
  if (score >= 65) return "Warning";
  if (score >= 50) return "Needs Manual Review";
  return "High Risk";
}

function iso(d = new Date()) {
  return d.toISOString();
}

export function seedVerifications(): TrustVerification[] {
  const t = iso();
  return [
    {
      id: "ownership",
      name: "Ownership Verification",
      status: "Verified",
      score: 91,
      riskLevel: "Low",
      lastCheckedIso: t,
      dataSource: "Mock Data",
      aiSummary: "Mock / API-ready: seller identity and title path look consistent in simulated registry.",
      findings: [
        "Seller name consistency checked (mock)",
        "Title record match simulated",
        "Duplicate listing risk low",
        "Document mismatch not detected in mock scan",
      ],
      evidence: ["Mock deed hash match", "Mock KYC cross-check", "Internal CRM seller profile"],
      riskExplanation: "Residual risk until connected to a live land department API.",
      recommendedAction: "Obtain official title deed before exchange; keep mock flag visible to clients.",
      manualReviewNotes: "",
    },
    {
      id: "rera",
      name: "RERA / Regulatory Check",
      status: "Warning",
      score: 74,
      riskLevel: "Medium",
      lastCheckedIso: t,
      dataSource: "API Required",
      aiSummary: "Regulatory posture simulated — project registration assumed valid pending live RERA pull.",
      findings: [
        "RERA / regulatory status simulated",
        "Project approval status: mock compliant",
        "Compliance risk indicator: medium (placeholder)",
      ],
      evidence: ["Mock registration ID", "Developer escrow narrative (mock)"],
      riskExplanation: "Medium until wired to authoritative regulatory endpoints.",
      recommendedAction: "Schedule compliance packet with escrow trail for investor disclosure.",
      manualReviewNotes: "",
    },
    {
      id: "developer",
      name: "Developer Reputation",
      status: "Verified",
      score: 88,
      riskLevel: "Low",
      lastCheckedIso: t,
      dataSource: "Supabase Ready",
      aiSummary: "Mock developer score blends delivery history + mock sentiment — not a live credit rating.",
      findings: ["Delivery SLA mock score strong", "Dispute volume low in mock dataset", "Brand tier: premium"],
      evidence: ["Internal broker notes", "Mock press sentiment index"],
      riskExplanation: "Developer risk can change quickly — refresh on material news.",
      recommendedAction: "Attach developer delivery timeline appendix to buyer packs.",
      manualReviewNotes: "",
    },
    {
      id: "legal",
      name: "Legal Risk Analysis",
      status: "Needs Manual Review",
      score: 62,
      riskLevel: "Medium",
      lastCheckedIso: t,
      dataSource: "Mock Data",
      aiSummary: "Mock litigation / encumbrance sweep shows edge case — human legal counsel recommended.",
      findings: [
        "Litigation signal check: inconclusive (mock)",
        "Encumbrance risk: low-moderate (simulated)",
        "Dispute indicator: watch",
        "Manual legal review recommended",
      ],
      evidence: ["Mock court index", "Mock lien registry"],
      riskExplanation: "Legal NLP on public records not connected — findings are illustrative.",
      recommendedAction: "Route to legal partner for jurisdiction-specific opinion letter.",
      manualReviewNotes: "Awaiting counsel memo (mock).",
    },
    {
      id: "fraud",
      name: "Fraud Detection",
      status: "Verified",
      score: 8,
      riskLevel: "Low",
      lastCheckedIso: t,
      dataSource: "Last Synced",
      lowerIsBetter: true,
      aiSummary: "Mock fraud model: low anomaly score — duplicate listing and doc tamper checks clean.",
      findings: [
        "Duplicate listing pattern: not elevated",
        "Suspicious price deviation: within band",
        "Fake document signal: none in mock",
        "Broker activity risk: normal",
      ],
      evidence: ["Mock graph similarity", "Mock EXIF / hash consistency"],
      riskExplanation: "Fraud models require continuous retraining when live feeds connect.",
      recommendedAction: "Keep high-res photos + chain-of-custody for marketing assets.",
      manualReviewNotes: "",
    },
    {
      id: "price",
      name: "Price Manipulation Risk",
      status: "Warning",
      score: 28,
      riskLevel: "Medium",
      lastCheckedIso: t,
      dataSource: "Mock Data",
      lowerIsBetter: true,
      aiSummary: "Mock comps show mild deviation vs micro-market median — not evidence of manipulation alone.",
      findings: ["Historical list price volatility moderate", "Comp set dispersion within tolerance (mock)"],
      evidence: ["Mock MLS-style comp pull", "Internal valuation band"],
      riskExplanation: "Price integrity needs live MLS / hedge fund data for production-grade confidence.",
      recommendedAction: "Publish transparent comp methodology footnote for investors.",
      manualReviewNotes: "",
    },
    {
      id: "document",
      name: "Document Consistency Check",
      status: "Verified",
      score: 86,
      riskLevel: "Low",
      lastCheckedIso: t,
      dataSource: "Mock Data",
      aiSummary: "Mock cross-doc consistency: SPA, floorplan, and amenities list align.",
      findings: ["Version drift: none detected (mock)", "OCR checksum stable across uploads"],
      evidence: ["Doc hash manifest (mock)", "Internal DAM audit"],
      riskExplanation: "OCR errors possible when real doc AI connects.",
      recommendedAction: "Require wet-signature scans for final diligence folder.",
      manualReviewNotes: "",
    },
    {
      id: "crossborder",
      name: "Cross-border Buyer Risk",
      status: "Warning",
      score: 44,
      riskLevel: "Medium",
      lastCheckedIso: t,
      dataSource: "API Required",
      lowerIsBetter: true,
      aiSummary: "Mock cross-border score reflects currency + KYC friction — not sanctions screening.",
      findings: ["FX exposure moderate", "KYC tier: enhanced recommended", "Source-of-funds docs pending (mock)"],
      evidence: ["Mock sanctions stub (disconnected)", "CRM KYC checklist"],
      riskExplanation: "Real sanctions / AML must run on compliant infrastructure.",
      recommendedAction: "Trigger enhanced KYC workflow before reservation deposit.",
      manualReviewNotes: "",
    },
    {
      id: "final",
      name: "Final Property Trust Score",
      status: "Verified",
      score: 78,
      riskLevel: "Medium",
      lastCheckedIso: t,
      dataSource: "Mock Data",
      aiSummary: "Composite of dimensional checks above — mock aggregate until backend scoring ships.",
      findings: ["Dimensional checks averaged (mock)", "Manual overrides respected when present"],
      evidence: ["Internal scoring manifest (mock)"],
      riskExplanation: "Composite score hides weak single-dimension outliers — read sub-cards.",
      recommendedAction: "Share full PDF/CSV pack with investor committee.",
      manualReviewNotes: "",
    },
  ];
}

export function seedHistory(verifications: TrustVerification[]): TrustHistoryRow[] {
  const v = verifications[0]!;
  return [
    {
      id: "h1",
      dateIso: v.lastCheckedIso ?? iso(),
      verificationType: v.name,
      status: v.status,
      score: v.score,
      risk: v.riskLevel,
      actionTaken: "Automated mock scan",
      verifiedBy: "System (mock)",
      reportId: "TR-seed-1",
    },
  ];
}

export function averageDimensionalScore(verifications: TrustVerification[]): number {
  const dims = verifications.filter((x) => x.id !== "final");
  if (!dims.length) return 0;
  return Math.round(dims.reduce((s, x) => s + x.score, 0) / dims.length);
}
