export type GrowthStage =
  | "Early Growth"
  | "Emerging Hotspot"
  | "Strong Growth"
  | "Mature Market"
  | "High Risk / Overheated";

export type OpportunityGrade =
  | "Elite Opportunity"
  | "Strong Opportunity"
  | "Good Opportunity"
  | "Watchlist"
  | "Risky / Low Priority";

export type RiskLevel = "Low" | "Medium" | "High";

export type Trend = "up" | "down" | "flat";

export type AreaScoreComponent = {
  id: string;
  label: string;
  score: number;
  trend: Trend;
  reason: string;
  sourceTag: string;
  lastUpdated: string;
};

export type AiAreaRecommendation = {
  bestFor: string[];
  notIdealFor: string[];
  propertyType: string;
  holdingPeriod: string;
  buyerProfile: string;
  brokerAction: string;
};

export type ExternalMarketSignal = {
  id: string;
  label: string;
  /** Mock / API-ready — not live Google data in this build */
  mockSummary: string;
  deltaPct: number;
};

export type DataSourceRow = {
  id: string;
  name: string;
  status: "Connected" | "Mock Data" | "Needs API" | "Last Synced";
  detail: string;
};

export type AreaIntelligence = {
  id: string;
  name: string;
  city: string;
  country: string;
  finalScore: number;
  growthStage: GrowthStage;
  opportunityGrade: OpportunityGrade;
  mainReason: string;
  bestFor: string[];
  riskLevel: RiskLevel;
  riskScore: number;
  confidence: number;
  lastUpdatedIso: string;
  simpleWhy: string;
  advancedBullets: string[];
  scoreComponents: AreaScoreComponent[];
  aiRecommendation: AiAreaRecommendation;
  rentalDemand: number;
  appreciation: number;
  liquidity: number;
  investorActivity: number;
  searchInterest: number;
  /** Filter helpers */
  investmentTags: string[];
  budgetBand: "Under $500K" | "$500K – $1M" | "$1M – $3M" | "$3M+";
};

export type MarketUpdateItem = {
  id: string;
  areaName: string;
  headline: string;
  whyItMatters: string;
  confidence: number;
  tsIso: string;
  metricHint: string;
  scoreAffected: string;
  recommendedAction: string;
};

export function opportunityGradeFromScore(score: number): OpportunityGrade {
  if (score >= 90) return "Elite Opportunity";
  if (score >= 80) return "Strong Opportunity";
  if (score >= 70) return "Good Opportunity";
  if (score >= 60) return "Watchlist";
  return "Risky / Low Priority";
}

export function nowIso() {
  return new Date().toISOString();
}

function comp(
  id: string,
  label: string,
  score: number,
  trend: Trend,
  reason: string,
  sourceTag: string,
): AreaScoreComponent {
  return {
    id,
    label,
    score,
    trend,
    reason,
    sourceTag,
    lastUpdated: nowIso(),
  };
}

export const SEED_AREAS: AreaIntelligence[] = [
  {
    id: "dxb-marina",
    name: "Dubai Marina",
    city: "Dubai",
    country: "UAE",
    finalScore: 89,
    growthStage: "Strong Growth",
    opportunityGrade: "Strong Opportunity",
    mainReason: "Luxury rental demand + foreign investor activity",
    bestFor: ["Rental Income", "Luxury Investment"],
    riskLevel: "Medium",
    riskScore: 52,
    confidence: 86,
    lastUpdatedIso: nowIso(),
    simpleWhy:
      "Dubai Marina is growing because rental demand, luxury buyer interest, and investor activity are increasing.",
    advancedBullets: [
      "Rental demand increased by 18%",
      "Investor inquiries increased by 22%",
      "Luxury apartment searches increased by 31%",
      "Liquidity score remains strong",
      "Risk is medium because premium pricing is elevated",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 92, "up", "Short-term rental inquiries and expat tenant interest are rising.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 84, "up", "Price momentum supported by constrained luxury supply.", "Price movement signals"),
      comp("liq", "Liquidity", 88, "flat", "Transaction velocity healthy for luxury segment.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 76, "up", "Metro connectivity and retail clusters expanding.", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 91, "up", "API-ready search demand proxy trending higher.", "Mock external signal"),
      comp("inv", "Investor Activity", 90, "up", "Cross-border capital and verified investor leads rising.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 94, "up", "High-net-worth tours and off-plan interest elevated.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 52, "flat", "Premium pricing sensitivity — monitor leverage and supply pipeline.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Rental income investors", "Luxury apartment buyers", "Foreign investors"],
      notIdealFor: ["Low-budget buyers", "High-leverage short-term flips"],
      propertyType: "Luxury high-rise apartments & branded residences",
      holdingPeriod: "3–5 years",
      buyerProfile: "HNWI / expat professional / regional investor",
      brokerAction: "Prioritize verified investor leads with budget above $500K.",
    },
    rentalDemand: 92,
    appreciation: 84,
    liquidity: 88,
    investorActivity: 90,
    searchInterest: 91,
    investmentTags: ["Rental Income", "Luxury Investment", "Capital Appreciation"],
    budgetBand: "$1M – $3M",
  },
  {
    id: "dxb-downtown",
    name: "Downtown Dubai",
    city: "Dubai",
    country: "UAE",
    finalScore: 87,
    growthStage: "Mature Market",
    opportunityGrade: "Strong Opportunity",
    mainReason: "Iconic luxury positioning + stable tourism-led rental demand",
    bestFor: ["Luxury Investment", "Safe Long-Term Hold"],
    riskLevel: "Medium",
    riskScore: 48,
    confidence: 83,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Downtown benefits from global brand recognition and consistent visitor demand.",
    advancedBullets: [
      "Hotel-branded residences lift ADR-linked rental assumptions",
      "Investor tours +30% QoQ (mock signal)",
      "Liquidity remains premium but selective",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 86, "up", "Short-stay and executive lease demand resilient.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 80, "flat", "Mature pricing — appreciation moderate.", "Price movement signals"),
      comp("liq", "Liquidity", 82, "flat", "Selective buyers at ultra-luxury tiers.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 70, "flat", "Mature infrastructure; incremental upgrades.", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 84, "up", "Mock external signal: branded residence searches +22%.", "Mock external signal"),
      comp("inv", "Investor Activity", 85, "up", "Institutional and family-office interest steady.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 93, "up", "Ultra-luxury segment outperforming broader market.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 48, "down", "Lower volatility vs emerging districts.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Luxury trophy assets", "Long-hold wealth preservation"],
      notIdealFor: ["Yield-chasing value investors"],
      propertyType: "Branded residences & penthouses",
      holdingPeriod: "5–10 years",
      buyerProfile: "Global HNWI / sovereign-adjacent capital",
      brokerAction: "Bundle Burj-adjacent inventory with concierge leasing playbook.",
    },
    rentalDemand: 86,
    appreciation: 80,
    liquidity: 82,
    investorActivity: 85,
    searchInterest: 84,
    investmentTags: ["Luxury Investment", "Safe Long-Term Hold"],
    budgetBand: "$3M+",
  },
  {
    id: "in-noida-150",
    name: "Noida Sector 150",
    city: "Noida",
    country: "India",
    finalScore: 76,
    growthStage: "Emerging Hotspot",
    opportunityGrade: "Good Opportunity",
    mainReason: "Expressway connectivity + mid-premium supply wave",
    bestFor: ["Capital Appreciation", "Rental Income"],
    riskLevel: "Medium",
    riskScore: 58,
    confidence: 74,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Sector 150 is evolving on the back of connectivity projects and rising end-user + investor mix.",
    advancedBullets: [
      "Investor registrations +19% (mock)",
      "Rental absorption improving in gated communities",
      "Execution risk on select developers — diligence required",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 72, "up", "IT workforce migration supporting leases.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 78, "up", "Early-cycle appreciation as inventory clears.", "Price movement signals"),
      comp("liq", "Liquidity", 64, "up", "Liquidity improving from 24 months ago baseline.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 81, "up", "Expressway + metro extensions (mock feed).", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 74, "up", "Mock external signal: locality searches +16%.", "Mock external signal"),
      comp("inv", "Investor Activity", 77, "up", "NCR investor desk inquiries trending up.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 58, "flat", "Mid-premium dominates; ultra-luxury thinner.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 58, "flat", "Developer concentration + execution timelines.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Appreciation seekers", "Mid-premium rental investors"],
      notIdealFor: ["Ultra-luxury-only mandates"],
      propertyType: "3–4 BHK gated community apartments",
      holdingPeriod: "3–5 years",
      buyerProfile: "Domestic professional + NRI mix",
      brokerAction: "Stress-test builder delivery SLAs before recommending inventory.",
    },
    rentalDemand: 72,
    appreciation: 78,
    liquidity: 64,
    investorActivity: 77,
    searchInterest: 74,
    investmentTags: ["Capital Appreciation", "Rental Income"],
    budgetBand: "$500K – $1M",
  },
  {
    id: "in-gurgaon-gcr",
    name: "Gurugram Golf Course Road",
    city: "Gurugram",
    country: "India",
    finalScore: 81,
    growthStage: "Strong Growth",
    opportunityGrade: "Strong Opportunity",
    mainReason: "Premium corridor liquidity + corporate leasing depth",
    bestFor: ["Commercial Yield", "Luxury Investment"],
    riskLevel: "Medium",
    riskScore: 55,
    confidence: 80,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Golf Course Road benefits from corporate HQ proximity and resilient premium rents.",
    advancedBullets: [
      "Luxury inventory turnover faster than NCR average (mock)",
      "Liquidity premium vs peripheral Gurugram",
      "Traffic / FAR policy watchlist item",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 84, "up", "Corporate expat leases stable.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 79, "up", "Land scarcity supports pricing power.", "Price movement signals"),
      comp("liq", "Liquidity", 86, "up", "Premium corridor trades clear faster.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 72, "flat", "Incremental arterial upgrades.", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 80, "up", "Mock external signal: premium villa/apartment searches +12%.", "Mock external signal"),
      comp("inv", "Investor Activity", 82, "up", "HNWI tours increasing week-over-week.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 88, "up", "Luxury segment absorbs new launches.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 55, "flat", "Policy + traffic congestion sensitivity.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Luxury apartments", "Premium rental yield"],
      notIdealFor: ["Deep value distressed plays"],
      propertyType: "Premium apartments & low-rise villas",
      holdingPeriod: "3–5 years",
      buyerProfile: "Corporate CXO / NRI",
      brokerAction: "Pair inventory with lease-guarantee sensitivity analysis for investors.",
    },
    rentalDemand: 84,
    appreciation: 79,
    liquidity: 86,
    investorActivity: 82,
    searchInterest: 80,
    investmentTags: ["Commercial Yield", "Luxury Investment"],
    budgetBand: "$1M – $3M",
  },
  {
    id: "uk-canary",
    name: "London Canary Wharf",
    city: "London",
    country: "UK",
    finalScore: 83,
    growthStage: "Mature Market",
    opportunityGrade: "Strong Opportunity",
    mainReason: "Resi rebalancing + improved liquidity post-rate normalization (mock)",
    bestFor: ["Safe Long-Term Hold", "Rental Income"],
    riskLevel: "Low",
    riskScore: 38,
    confidence: 81,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Canary Wharf is stabilizing as a mixed-use residential hub with diversified demand.",
    advancedBullets: [
      "Liquidity improved vs prior year baseline (mock)",
      "Investor diversification beyond pure finance tenants",
      "Macro rate sensitivity remains watch item",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 81, "up", "Professional services demand anchors rents.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 72, "flat", "Mature market — moderate appreciation.", "Price movement signals"),
      comp("liq", "Liquidity", 87, "up", "Bid depth improving on resi towers.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 68, "flat", "Elizabeth line already priced; incremental gains.", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 78, "up", "Mock external signal: E14 searches +9%.", "Mock external signal"),
      comp("inv", "Investor Activity", 80, "up", "Global allocator interest returning slowly.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 74, "flat", "Premium but not ultra-prime Mayfair tier.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 38, "down", "Lower relative volatility vs UK fringe markets.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Income + stability investors", "Global diversification"],
      notIdealFor: ["Speculative high-beta flips"],
      propertyType: "Modern high-rise apartments",
      holdingPeriod: "5–10 years",
      buyerProfile: "Global professional / institutional allocator",
      brokerAction: "Highlight liquidity depth + tenant covenant mix in decks.",
    },
    rentalDemand: 81,
    appreciation: 72,
    liquidity: 87,
    investorActivity: 80,
    searchInterest: 78,
    investmentTags: ["Safe Long-Term Hold", "Rental Income"],
    budgetBand: "$1M – $3M",
  },
  {
    id: "sg-central",
    name: "Singapore Central",
    city: "Singapore",
    country: "Singapore",
    finalScore: 91,
    growthStage: "Mature Market",
    opportunityGrade: "Elite Opportunity",
    mainReason: "Luxury scarcity + global safe-haven demand",
    bestFor: ["Luxury Investment", "Safe Long-Term Hold"],
    riskLevel: "Low",
    riskScore: 32,
    confidence: 90,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Central Singapore remains supply-constrained with resilient global demand.",
    advancedBullets: [
      "Luxury demand score elevated vs regional peers",
      "Liquidity premium persists in prime districts",
      "Policy windows can shift foreign demand — monitor quarterly",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 86, "flat", "Stable premium rents; policy-sensitive segment.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 83, "up", "Scarcity supports long-cycle appreciation.", "Price movement signals"),
      comp("liq", "Liquidity", 90, "up", "Prime liquidity remains best-in-class (mock).", "Market depth index"),
      comp("infra", "Infrastructure Growth", 74, "flat", "Incremental urban upgrades.", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 88, "up", "Mock external signal: prime district searches +11%.", "Mock external signal"),
      comp("inv", "Investor Activity", 92, "up", "Family office participation elevated.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 95, "up", "Ultra-luxury scarcity driver.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 32, "down", "Macro-regulated market — lower tail risk vs emerging.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Luxury scarcity plays", "Long-duration capital"],
      notIdealFor: ["High-yield value hunting"],
      propertyType: "Prime district condos & landed (where eligible)",
      holdingPeriod: "10 Years",
      buyerProfile: "Global family office / UHNWI",
      brokerAction: "Lead with policy timeline + ABSD sensitivity in investor memos.",
    },
    rentalDemand: 86,
    appreciation: 83,
    liquidity: 90,
    investorActivity: 92,
    searchInterest: 88,
    investmentTags: ["Luxury Investment", "Safe Long-Term Hold"],
    budgetBand: "$3M+",
  },
  {
    id: "ca-toronto-dt",
    name: "Toronto Downtown",
    city: "Toronto",
    country: "Canada",
    finalScore: 78,
    growthStage: "Strong Growth",
    opportunityGrade: "Good Opportunity",
    mainReason: "Population inflow + rental stress supporting investor demand (mock)",
    bestFor: ["Rental Income", "Capital Appreciation"],
    riskLevel: "Medium",
    riskScore: 56,
    confidence: 77,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Downtown Toronto benefits from migration-led housing stress and investor appetite for condos.",
    advancedBullets: [
      "Rental demand index elevated vs 5-yr avg (mock)",
      "Policy risk on short-term rentals — monitor",
      "Liquidity decent but financing-sensitive",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 88, "up", "Immigration-led lease demand.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 76, "up", "Constrained supply narrative persists.", "Price movement signals"),
      comp("liq", "Liquidity", 74, "flat", "Financing conditions temper velocity.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 70, "up", "Transit expansion projects (mock).", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 82, "up", "Mock external signal: downtown condo searches +14%.", "Mock external signal"),
      comp("inv", "Investor Activity", 79, "up", "Domestic + diaspora investor mix.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 68, "flat", "Mid/upper mid dominates downtown core.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 56, "up", "Financing + policy sensitivity.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Condo rental investors", "5+ year appreciation thesis"],
      notIdealFor: ["Ultra-luxury-only buyers"],
      propertyType: "Downtown condos",
      holdingPeriod: "5 Years",
      buyerProfile: "Young professional / investor syndicate",
      brokerAction: "Model STR policy scenarios explicitly for investor clients.",
    },
    rentalDemand: 88,
    appreciation: 76,
    liquidity: 74,
    investorActivity: 79,
    searchInterest: 82,
    investmentTags: ["Rental Income", "Capital Appreciation"],
    budgetBand: "$500K – $1M",
  },
  {
    id: "us-nyc-manhattan",
    name: "New York Manhattan",
    city: "New York",
    country: "USA",
    finalScore: 85,
    growthStage: "Mature Market",
    opportunityGrade: "Strong Opportunity",
    mainReason: "Global liquidity magnet + resilient luxury rents (mock)",
    bestFor: ["Luxury Investment", "Safe Long-Term Hold"],
    riskLevel: "Medium",
    riskScore: 50,
    confidence: 84,
    lastUpdatedIso: nowIso(),
    simpleWhy: "Manhattan remains a global capital sink with differentiated micro-markets.",
    advancedBullets: [
      "Luxury contract activity improving vs trough (mock)",
      "Liquidity bifurcated by neighborhood",
      "Tax + co-op board friction as operational risk",
    ],
    scoreComponents: [
      comp("rental", "Rental Demand", 83, "up", "Prime lease demand recovering.", "CRM + rental signals"),
      comp("appr", "Capital Appreciation", 78, "flat", "Select pockets outperform.", "Price movement signals"),
      comp("liq", "Liquidity", 84, "up", "Global bid depth returns slowly.", "Market depth index"),
      comp("infra", "Infrastructure Growth", 66, "flat", "Mature city infrastructure baseline.", "Infrastructure feed (mock)"),
      comp("search", "Search Interest", 86, "up", "Mock external signal: Manhattan luxury searches +10%.", "Mock external signal"),
      comp("inv", "Investor Activity", 88, "up", "Cross-border allocator interest.", "CRM investor pipeline"),
      comp("lux", "Luxury Demand", 90, "up", "Ultra-prime lineups strengthen.", "Luxury inquiry tags"),
      comp("risk", "Risk Score", 50, "flat", "Co-op/tax/regulatory friction.", "Trust Engine risk data"),
    ],
    aiRecommendation: {
      bestFor: ["Luxury resi", "Long-hold global capital"],
      notIdealFor: ["First-time low-liquidity flips"],
      propertyType: "Co-op / condo (board diligence)",
      holdingPeriod: "5–10 years",
      buyerProfile: "Global UHNWI",
      brokerAction: "Pre-qualify board packages early to protect conversion.",
    },
    rentalDemand: 83,
    appreciation: 78,
    liquidity: 84,
    investorActivity: 88,
    searchInterest: 86,
    investmentTags: ["Luxury Investment", "Safe Long-Term Hold"],
    budgetBand: "$3M+",
  },
];

export const DATA_SOURCE_ROWS: DataSourceRow[] = [
  { id: "crm", name: "CRM Lead Data", status: "Connected", detail: "Live pipeline from RealEstateOS" },
  { id: "inq", name: "Property Inquiry Data", status: "Connected", detail: "Listing engagement + tour requests" },
  { id: "rent", name: "Rental Demand Signals", status: "Mock Data", detail: "Replace with rental comps API" },
  { id: "px", name: "Price Movement Signals", status: "Mock Data", detail: "Replace with MLS / hedge fund feeds" },
  { id: "inv", name: "Investor Activity", status: "Connected", detail: "Investor-tagged CRM cohorts" },
  { id: "ext", name: "Google-style External Signals", status: "Mock Data", detail: "API-ready; not live Google in this build" },
  { id: "infra", name: "Infrastructure Updates", status: "Needs API", detail: "Wire n8n + government feeds" },
  { id: "trust", name: "Trust Engine Risk Data", status: "Last Synced", detail: "Mock risk overlays refreshed on interval" },
];

export function jitterMetric(n: number, mag: number): number {
  return Math.min(100, Math.max(0, Math.round(n + (Math.random() - 0.5) * mag)));
}
