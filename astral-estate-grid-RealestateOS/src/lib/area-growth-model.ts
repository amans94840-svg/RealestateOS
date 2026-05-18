export type GrowthStage = "Early Growth" | "Emerging Hotspot" | "Strong Growth" | "Mature Market" | "Watchlist";

export type InvestmentGoal =
  | "Rental Income"
  | "Capital Appreciation"
  | "Luxury Investment"
  | "Commercial Yield"
  | "Safe Long-Term Hold";

export type RiskLevel = "Low" | "Medium" | "High";

export type AreaGrowthAiRecommendation = {
  summary: string;
  bestBuyerProfile: string;
  suggestedPropertyType: string;
  suggestedHoldingPeriod: string;
  actionPlan: string;
  risks: string[];
};

export type AreaGrowthRecord = {
  id: string;
  areaName: string;
  country: string;
  city: string;
  investmentScore: number;
  growthStage: GrowthStage;
  rentalDemandScore: number;
  appreciationScore: number;
  liquidityScore: number;
  infrastructureScore: number;
  investorActivityScore: number;
  searchInterestScore: number;
  riskScore: number;
  confidenceScore: number;
  bestInvestmentGoal: InvestmentGoal;
  bestPropertyType: string;
  suggestedHoldingPeriod: string;
  aiRecommendation: AreaGrowthAiRecommendation;
  whyThisAreaIsGrowing: string;
  dataSources: string[];
  lastUpdated: number;
  createdAt: number;
  reviewed?: boolean;
  watchlisted?: boolean;
  notes?: string;
};

export type AreaGrowthUpdate = {
  id: string;
  areaId: string;
  headline: string;
  whyItMatters: string;
  confidence: number;
  metricHint: string;
  scoreAffected: string;
  recommendedAction: string;
  timestamp: number;
};

export type AreaGrowthFilters = {
  country: string;
  city: string;
  investmentGoal: string;
  riskLevel: string;
  confidenceScore: string;
  growthStage: string;
};

export type AreaGrowthSource = {
  label: string;
  detail: string;
  status: "Connected" | "Mock Data" | "Needs API" | "Last Synced";
};

function stageFromScore(score: number): GrowthStage {
  if (score >= 90) return "Mature Market";
  if (score >= 82) return "Strong Growth";
  if (score >= 72) return "Emerging Hotspot";
  if (score >= 60) return "Early Growth";
  return "Watchlist";
}

function riskFromScore(score: number): RiskLevel {
  if (score <= 40) return "Low";
  if (score <= 65) return "Medium";
  return "High";
}

function makeAreaGrowth(input: Omit<AreaGrowthRecord, "growthStage" | "createdAt" | "lastUpdated"> & Partial<Pick<AreaGrowthRecord, "growthStage" | "createdAt" | "lastUpdated">>): AreaGrowthRecord {
  const createdAt = input.createdAt ?? Date.now() - 1000 * 60 * 60 * 24 * 14;
  const lastUpdated = input.lastUpdated ?? Date.now() - 1000 * 60 * 30;
  return {
    ...input,
    growthStage: input.growthStage ?? stageFromScore(input.investmentScore),
    createdAt,
    lastUpdated,
  };
}

export const SEED_AREA_GROWTH: AreaGrowthRecord[] = [
  makeAreaGrowth({
    id: "area-dxb-marina",
    areaName: "Dubai Marina",
    country: "UAE",
    city: "Dubai",
    investmentScore: 91,
    rentalDemandScore: 93,
    appreciationScore: 84,
    liquidityScore: 88,
    infrastructureScore: 76,
    investorActivityScore: 90,
    searchInterestScore: 92,
    riskScore: 48,
    confidenceScore: 88,
    bestInvestmentGoal: "Luxury Investment",
    bestPropertyType: "Luxury apartments and branded residences",
    suggestedHoldingPeriod: "3-5 years",
    aiRecommendation: {
      summary: "Luxury rental demand and verified investor interest are creating a resilient growth corridor.",
      bestBuyerProfile: "HNWI, regional investor, and expat professional",
      suggestedPropertyType: "High-rise luxury apartments",
      suggestedHoldingPeriod: "3-5 years",
      actionPlan: "Prioritize verified investor leads, emphasize rental comps, and package premium leasing assumptions.",
      risks: ["Premium pricing sensitivity", "Supply pipeline pressure"],
    },
    whyThisAreaIsGrowing: "Rental demand, luxury branding, and foreign investor activity are all expanding together.",
    dataSources: ["CRM leads", "Rental demand signals", "Investor activity", "Search proxy", "Infrastructure feed"],
  }),
  makeAreaGrowth({
    id: "area-dxb-downtown",
    areaName: "Downtown Dubai",
    country: "UAE",
    city: "Dubai",
    investmentScore: 88,
    rentalDemandScore: 87,
    appreciationScore: 81,
    liquidityScore: 83,
    infrastructureScore: 69,
    investorActivityScore: 86,
    searchInterestScore: 85,
    riskScore: 44,
    confidenceScore: 84,
    bestInvestmentGoal: "Safe Long-Term Hold",
    bestPropertyType: "Branded residences and penthouses",
    suggestedHoldingPeriod: "5-10 years",
    aiRecommendation: {
      summary: "Iconic location and stable tourism-led demand keep this corridor on the core watchlist.",
      bestBuyerProfile: "Global HNWI and long-hold wealth allocator",
      suggestedPropertyType: "Branded residences",
      suggestedHoldingPeriod: "5-10 years",
      actionPlan: "Lead with liquidity and premium tenant demand; explain why the core district remains resilient.",
      risks: ["Mature pricing", "Selective buyer pool"],
    },
    whyThisAreaIsGrowing: "Brand recognition and steady short-stay demand keep the prime core resilient.",
    dataSources: ["Tourism demand", "Rental comps", "Investor pipeline", "Luxury inquiry tags"],
  }),
  makeAreaGrowth({
    id: "area-noida-150",
    areaName: "Noida Sector 150",
    country: "India",
    city: "Noida",
    investmentScore: 78,
    rentalDemandScore: 73,
    appreciationScore: 79,
    liquidityScore: 64,
    infrastructureScore: 83,
    investorActivityScore: 77,
    searchInterestScore: 75,
    riskScore: 57,
    confidenceScore: 75,
    bestInvestmentGoal: "Capital Appreciation",
    bestPropertyType: "3-4 BHK gated community apartments",
    suggestedHoldingPeriod: "3-5 years",
    aiRecommendation: {
      summary: "Infrastructure-led growth is attracting both end users and early-cycle investors.",
      bestBuyerProfile: "Domestic professional and NRI investor",
      suggestedPropertyType: "Mid-premium apartments",
      suggestedHoldingPeriod: "3-5 years",
      actionPlan: "Stress-test builder delivery SLAs and compare against expressway-linked comps.",
      risks: ["Execution timelines", "Developer concentration"],
    },
    whyThisAreaIsGrowing: "Connectivity upgrades and a mid-premium supply wave are pulling investor attention higher.",
    dataSources: ["Investor registrations", "Search proxy", "Infrastructure updates", "CRM leads"],
  }),
  makeAreaGrowth({
    id: "area-gcr-gurugram",
    areaName: "Gurugram Golf Course Road",
    country: "India",
    city: "Gurugram",
    investmentScore: 82,
    rentalDemandScore: 84,
    appreciationScore: 78,
    liquidityScore: 86,
    infrastructureScore: 72,
    investorActivityScore: 82,
    searchInterestScore: 80,
    riskScore: 55,
    confidenceScore: 81,
    bestInvestmentGoal: "Commercial Yield",
    bestPropertyType: "Premium apartments and low-rise villas",
    suggestedHoldingPeriod: "3-5 years",
    aiRecommendation: {
      summary: "Corporate leasing depth and liquidity keep this premium corridor compelling.",
      bestBuyerProfile: "Corporate CXO, NRI, and premium rental investor",
      suggestedPropertyType: "Premium apartments",
      suggestedHoldingPeriod: "3-5 years",
      actionPlan: "Bundle lease assumptions with explicit diligence on policy and traffic-sensitive risk.",
      risks: ["Policy sensitivity", "Traffic congestion"],
    },
    whyThisAreaIsGrowing: "Corporate demand and premium liquidity are making the corridor a strong yield story.",
    dataSources: ["Corporate leasing", "Rental demand", "Investor activity", "Luxury inquiry tags"],
  }),
  makeAreaGrowth({
    id: "area-sg-central",
    areaName: "Singapore Central",
    country: "Singapore",
    city: "Singapore",
    investmentScore: 92,
    rentalDemandScore: 86,
    appreciationScore: 84,
    liquidityScore: 90,
    infrastructureScore: 74,
    investorActivityScore: 92,
    searchInterestScore: 88,
    riskScore: 33,
    confidenceScore: 91,
    bestInvestmentGoal: "Safe Long-Term Hold",
    bestPropertyType: "Prime district condos and landed where eligible",
    suggestedHoldingPeriod: "10 years",
    aiRecommendation: {
      summary: "Supply scarcity and global safe-haven demand continue to support prime pricing.",
      bestBuyerProfile: "Global family office and long-duration capital",
      suggestedPropertyType: "Prime district condos",
      suggestedHoldingPeriod: "10 years",
      actionPlan: "Explain policy windows, ABSD sensitivity, and why scarcity supports long-hold value.",
      risks: ["Policy changes", "Foreign buyer friction"],
    },
    whyThisAreaIsGrowing: "Luxury scarcity and global capital flows keep the prime core exceptionally resilient.",
    dataSources: ["Family office demand", "Search proxy", "Liquidity depth", "CRM pipeline"],
  }),
  makeAreaGrowth({
    id: "area-nyc-manhattan",
    areaName: "New York Manhattan",
    country: "USA",
    city: "New York",
    investmentScore: 85,
    rentalDemandScore: 83,
    appreciationScore: 78,
    liquidityScore: 84,
    infrastructureScore: 66,
    investorActivityScore: 88,
    searchInterestScore: 86,
    riskScore: 50,
    confidenceScore: 84,
    bestInvestmentGoal: "Luxury Investment",
    bestPropertyType: "Co-op and condo luxury residences",
    suggestedHoldingPeriod: "5-10 years",
    aiRecommendation: {
      summary: "Global liquidity and resilient luxury demand keep Manhattan at the top of the institutional watchlist.",
      bestBuyerProfile: "Global UHNWI and institutional allocator",
      suggestedPropertyType: "Luxury condos",
      suggestedHoldingPeriod: "5-10 years",
      actionPlan: "Pre-qualify board packages early and explain liquidity by submarket.",
      risks: ["Co-op friction", "Tax sensitivity"],
    },
    whyThisAreaIsGrowing: "Cross-border capital and premium rentals are re-establishing momentum in select micro-markets.",
    dataSources: ["Luxury inquiry tags", "Investor pipeline", "Rental demand", "Search proxy"],
  }),
];

export const AREA_GROWTH_SOURCES: AreaGrowthSource[] = [
  { label: "CRM Lead Data", detail: "Live pipeline from RealEstateOS", status: "Connected" },
  { label: "Property Inquiry Data", detail: "Listing engagement and tour requests", status: "Connected" },
  { label: "Rental Demand Signals", detail: "Replace with rental comps API", status: "Mock Data" },
  { label: "Search Interest Proxy", detail: "Replace with Google Trends / Places", status: "Needs API" },
  { label: "Infrastructure Updates", detail: "Wire government and developer feeds", status: "Needs API" },
  { label: "Realtime Trust / Risk", detail: "Mock overlay refreshed on interval", status: "Last Synced" },
];

