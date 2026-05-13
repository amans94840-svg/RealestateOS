export type Lead = {
  id: string;
  name: string;
  phone: string;
  countryCode: string;
  email: string;
  budget: string;
  country: string;
  city: string;
  propertyType: string;
  buyerType: string;
  purpose: string;
  timeline: string;
  source: string;
  notes?: string;
  aiScore: number;
  urgency: "Critical" | "High" | "Medium" | "Low";
  recommendedAction: string;
  verified: boolean;
  createdAt: number;
};

export type Property = {
  id: string;
  title: string;
  country: string;
  city: string;
  price: string;
  type: string;
  roi: number;
  yield: number;
  appreciation: number;
  image: string;
  favorite?: boolean;
};

export type Appointment = {
  id: string;
  leadName: string;
  property: string;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Cancelled" | "Rescheduled";
  broker?: string;
  notes?: string;
};

export type InsightItem = {
  id: string;
  title: string;
  desc: string;
  urgency: "Critical" | "High" | "Medium" | "Low";
  what: string;
  why: string;
  data: string;
  action: string;
  risk: string;
  status: "New" | "In Progress" | "Resolved" | "Ignored";
};

export type Activity = {
  id: string;
  type: string;
  text: string;
  time: number;
  icon: string;
};

export type Notification = {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
  section?: string;
};

export const COUNTRIES: { name: string; code: string; flag: string }[] = [
  { name: "India", code: "+91", flag: "🇮🇳" },
  { name: "USA", code: "+1", flag: "🇺🇸" },
  { name: "Canada", code: "+1", flag: "🇨🇦" },
  { name: "UK", code: "+44", flag: "🇬🇧" },
  { name: "UAE", code: "+971", flag: "🇦🇪" },
  { name: "Singapore", code: "+65", flag: "🇸🇬" },
  { name: "Australia", code: "+61", flag: "🇦🇺" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Germany", code: "+49", flag: "🇩🇪" },
  { name: "France", code: "+33", flag: "🇫🇷" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "South Africa", code: "+27", flag: "🇿🇦" },
];

export const BUDGETS = ["Below $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $2M", "$2M – $5M", "$5M+"];
export const PROPERTY_TYPES = ["Apartment", "Villa", "Plot / Land", "Commercial", "Office Space", "Retail Space", "Luxury Home", "Warehouse", "Mixed-use Property"];
export const BUYER_TYPES = ["End User", "Investor", "NRI / Foreign Buyer", "Builder", "Broker", "Corporate Client", "Fund / Institutional Investor"];
export const PURPOSES = ["Buy", "Rent", "Sell", "Investment", "Leasing", "Portfolio Expansion"];
export const TIMELINES = ["Immediately", "Within 7 Days", "Within 30 Days", "3–6 Months", "6–12 Months", "Just Exploring"];
export const SOURCES = ["Website", "WhatsApp", "Facebook Ads", "Google Ads", "LinkedIn", "Referral", "Walk-in", "Phone Call", "Property Portal", "Offline Event", "Other"];

export const calcAiScore = (data: Partial<Lead>): number => {
  let s = 30;
  if (data.timeline === "Immediately") s += 30;
  if (data.timeline === "Within 7 Days") s += 25;
  if (data.buyerType === "Investor") s += 20;
  if (data.buyerType === "Fund / Institutional Investor") s += 25;
  if (data.budget === "$1M – $2M" || data.budget === "$2M – $5M" || data.budget === "$5M+") s += 20;
  if (data.budget === "$500K – $1M") s += 15;
  if (data.verified) s += 10;
  if (data.buyerType === "Corporate Client") s += 15;
  return Math.min(100, s);
};

export const calcUrgency = (timeline: string): Lead["urgency"] => {
  if (timeline === "Immediately") return "Critical";
  if (timeline === "Within 7 Days") return "High";
  if (timeline === "Within 30 Days") return "Medium";
  return "Low";
};

export const calcAction = (data: Partial<Lead>, urgency: Lead["urgency"]): string => {
  if (urgency === "Critical" || urgency === "High") return "Call Now";
  if (data.buyerType === "Investor") return "Send ROI Report";
  if (data.buyerType === "Fund / Institutional Investor") return "Send Investment Deck";
  if (data.purpose === "Rent" || data.purpose === "Leasing") return "Share Rental Options";
  if (data.purpose === "Sell") return "Request Property Details";
  return "Send Matching Properties";
};

const id = () => Math.random().toString(36).slice(2, 10);

export const SEED_LEADS: Lead[] = [
  { id: id(), name: "Mohammed Al-Rashid", phone: "+971501234567", countryCode: "+971", email: "rashid@example.com", budget: "$2M – $5M", country: "UAE", city: "Dubai Marina", propertyType: "Luxury Home", buyerType: "Investor", purpose: "Investment", timeline: "Immediately", source: "Referral", aiScore: 95, urgency: "Critical", recommendedAction: "Send ROI Report", verified: true, createdAt: Date.now() - 3600_000 },
  { id: id(), name: "Sarah Chen", phone: "+6591234567", countryCode: "+65", email: "sarah.c@example.com", budget: "$1M – $2M", country: "Singapore", city: "Orchard", propertyType: "Apartment", buyerType: "End User", purpose: "Buy", timeline: "Within 7 Days", source: "Website", aiScore: 82, urgency: "High", recommendedAction: "Call Now", verified: true, createdAt: Date.now() - 7200_000 },
  { id: id(), name: "James Whitmore", phone: "+447700900123", countryCode: "+44", email: "j.whit@example.com", budget: "$5M+", country: "UK", city: "Mayfair, London", propertyType: "Luxury Home", buyerType: "Fund / Institutional Investor", purpose: "Portfolio Expansion", timeline: "Immediately", source: "LinkedIn", aiScore: 100, urgency: "Critical", recommendedAction: "Send Investment Deck", verified: true, createdAt: Date.now() - 1800_000 },
  { id: id(), name: "Aman Verma", phone: "+919876543210", countryCode: "+91", email: "aman.v@example.com", budget: "$500K – $1M", country: "India", city: "Bandra, Mumbai", propertyType: "Apartment", buyerType: "End User", purpose: "Buy", timeline: "Within 30 Days", source: "Google Ads", aiScore: 65, urgency: "Medium", recommendedAction: "Send Matching Properties", verified: false, createdAt: Date.now() - 86400_000 },
  { id: id(), name: "Priya Sharma", phone: "+14155552671", countryCode: "+1", email: "priya@example.com", budget: "$1M – $2M", country: "USA", city: "Manhattan, NY", propertyType: "Apartment", buyerType: "NRI / Foreign Buyer", purpose: "Investment", timeline: "Within 7 Days", source: "Referral", aiScore: 78, urgency: "High", recommendedAction: "Call Now", verified: true, createdAt: Date.now() - 18000_000 },
  { id: id(), name: "Lukas Müller", phone: "+491701234567", countryCode: "+49", email: "lukas@example.com", budget: "$250K – $500K", country: "Germany", city: "Berlin Mitte", propertyType: "Commercial", buyerType: "Corporate Client", purpose: "Leasing", timeline: "3–6 Months", source: "Property Portal", aiScore: 60, urgency: "Low", recommendedAction: "Share Rental Options", verified: false, createdAt: Date.now() - 172800_000 },
];

export const SEED_PROPERTIES: Property[] = [
  { id: id(), title: "Marina Skyline Penthouse", country: "UAE", city: "Dubai Marina", price: "$3.4M", type: "Luxury Home", roi: 92, yield: 7.8, appreciation: 14, image: "🏙️" },
  { id: id(), title: "Belgravia Heritage Townhouse", country: "UK", city: "London", price: "$8.9M", type: "Luxury Home", roi: 88, yield: 4.2, appreciation: 9, image: "🏛️" },
  { id: id(), title: "Hudson Yards Loft", country: "USA", city: "New York", price: "$2.1M", type: "Apartment", roi: 81, yield: 5.5, appreciation: 11, image: "🌆" },
  { id: id(), title: "Orchard Residences Tower", country: "Singapore", city: "Orchard", price: "$1.7M", type: "Apartment", roi: 86, yield: 4.9, appreciation: 12, image: "🏢" },
  { id: id(), title: "Bandra West Sea-View", country: "India", city: "Mumbai", price: "$1.2M", type: "Apartment", roi: 78, yield: 3.8, appreciation: 13, image: "🌅" },
  { id: id(), title: "Yorkville Modern Estate", country: "Canada", city: "Toronto", price: "$4.5M", type: "Villa", roi: 84, yield: 5.1, appreciation: 10, image: "🏡" },
];

export const SEED_APPTS: Appointment[] = [
  { id: id(), leadName: "Mohammed Al-Rashid", property: "Marina Skyline Penthouse", date: "May 14, 2026", time: "10:00 AM", status: "Confirmed", broker: "Layla Hassan" },
  { id: id(), leadName: "Sarah Chen", property: "Orchard Residences Tower", date: "May 15, 2026", time: "2:30 PM", status: "Pending", broker: "Wei Zhang" },
  { id: id(), leadName: "Priya Sharma", property: "Hudson Yards Loft", date: "May 18, 2026", time: "11:00 AM", status: "Confirmed", broker: "David Kim" },
];

export const SEED_BROKERS = [
  { id: id(), name: "Layla Hassan", region: "Middle East", leads: 124, response: "2.3 min", conversion: 38, revenue: 4.2, rank: 1 },
  { id: id(), name: "Wei Zhang", region: "Asia Pacific", leads: 98, response: "3.1 min", conversion: 34, revenue: 3.6, rank: 2 },
  { id: id(), name: "David Kim", region: "North America", leads: 110, response: "2.8 min", conversion: 31, revenue: 3.4, rank: 3 },
  { id: id(), name: "Sofia Rossi", region: "Europe", leads: 87, response: "4.0 min", conversion: 28, revenue: 2.9, rank: 4 },
];

export const SEED_NOTIFICATIONS: Notification[] = [
  { id: id(), title: "New Global Lead", desc: "James Whitmore from London — $5M+ budget", time: "2m ago", read: false, section: "leads" },
  { id: id(), title: "AI Scored Lead", desc: "Mohammed Al-Rashid scored 95/100", time: "8m ago", read: false, section: "ai-insights" },
  { id: id(), title: "Site Visit Booked", desc: "Sarah Chen — Orchard Residences", time: "22m ago", read: false, section: "appointments" },
  { id: id(), title: "Broker Assigned", desc: "Layla Hassan assigned to Mohammed", time: "1h ago", read: true, section: "brokers" },
  { id: id(), title: "High Intent Buyer Detected", desc: "Fund-level interest from UK", time: "2h ago", read: true, section: "ai-insights" },
];

export const SEED_ACTIVITY: Activity[] = [
  { id: id(), type: "lead", text: "New global lead added: James Whitmore (UK)", time: Date.now() - 120_000, icon: "user-plus" },
  { id: id(), type: "ai", text: "AI scored Mohammed Al-Rashid 95/100", time: Date.now() - 480_000, icon: "sparkles" },
  { id: id(), type: "visit", text: "Site visit booked: Sarah Chen", time: Date.now() - 1320_000, icon: "calendar" },
  { id: id(), type: "deal", text: "Deal closed: Belgravia Townhouse — $8.9M", time: Date.now() - 3600_000, icon: "dollar-sign" },
  { id: id(), type: "broker", text: "Broker assigned: Layla Hassan", time: Date.now() - 5400_000, icon: "user-check" },
];

export const SEED_INSIGHTS: InsightItem[] = [
  { id: id(), title: "Prioritize Dubai Marina inventory", desc: "14% appreciation forecast over next 12 months", urgency: "High", what: "Predicted 14% YoY appreciation in Dubai Marina luxury segment.", why: "Cross-border investor demand surged 22% in last 30 days; supply remains constrained.", data: "92 ROI score | 7.8% rental yield | 18 active high-intent investors.", action: "Push Marina Skyline Penthouse to top 5 investor leads.", risk: "Missed window — competitor brokerages already mobilizing.", status: "New" },
  { id: id(), title: "5 leads gone cold", desc: "Re-engage now — 48h dormancy detected", urgency: "Critical", what: "5 high-AI-score leads have not been contacted in 48h.", why: "Conversion drops 64% after 72h of silence on hot leads.", data: "Avg AI score 84 | combined pipeline value $6.2M.", action: "Trigger Follow-up Agent or assign broker manually.", risk: "Probable $4M pipeline loss within 7 days.", status: "New" },
  { id: id(), title: "James Whitmore — fund signal", desc: "Score 100 institutional intent confirmed", urgency: "Critical", what: "Lead exhibits fund-level deal signals (deck request, legal review).", why: "Institutional deals close at 3.4x normal velocity when caught early.", data: "$5M+ budget | LinkedIn enterprise profile | UK fund domicile.", action: "Assign senior broker; schedule call within 4 hours.", risk: "Fund mandates rotate quarterly — slippage = lost cycle.", status: "In Progress" },
  { id: id(), title: "Singapore Orchard search +18%", desc: "Demand surge across luxury apartments", urgency: "Medium", what: "Search volume +18% WoW for Orchard luxury segment.", why: "Tax window for foreign buyers closes in 6 weeks.", data: "4.9% yield | 12% appreciation | 86 investor score.", action: "Re-list inventory with refreshed AI commentary.", risk: "Window closes — demand reverts to baseline.", status: "New" },
  { id: id(), title: "$2.4M pipeline ready to close", desc: "Revenue opportunity in next 30 days", urgency: "High", what: "12 leads in Offer stage with verified budgets.", why: "Quarter-end push — broker bandwidth available.", data: "Avg deal size $200K | 78% close probability.", action: "Activate Appointment Agent for site-visit batch.", risk: "Push beyond 30 days = 28% probability decay.", status: "New" },
  { id: id(), title: "Layla Hassan — top performer", desc: "Recognize and amplify", urgency: "Low", what: "Layla closed $4.2M with 38% conversion this month.", why: "Reinforcement loops increase team-wide conversion 11%.", data: "Rank #1 | 124 leads handled | 2.3 min response.", action: "Public recognition + bonus tier escalation.", risk: "Burnout if pipeline not balanced.", status: "Resolved" },
];
