export type PropertyCountry =
  | "India"
  | "UAE"
  | "USA"
  | "UK"
  | "Canada"
  | "Singapore"
  | "Australia"
  | "Germany"
  | "France"
  | "Saudi Arabia"
  | "Qatar"
  | "Oman"
  | "Kuwait"
  | "Bahrain"
  | "South Africa"
  | "Other";

export const PROPERTY_COUNTRIES: PropertyCountry[] = [
  "India",
  "UAE",
  "USA",
  "UK",
  "Canada",
  "Singapore",
  "Australia",
  "Germany",
  "France",
  "Saudi Arabia",
  "Qatar",
  "Oman",
  "Kuwait",
  "Bahrain",
  "South Africa",
  "Other",
];

export const LISTING_TYPES = ["Sale", "Rent", "Lease", "Pre-launch", "Resale", "Commercial Lease"] as const;
export const PROPERTY_CATEGORIES = ["Residential", "Commercial", "Land / Plot", "Industrial", "Mixed-use", "Hospitality"] as const;
export const LISTING_STATUS = ["Available", "Under Review", "Sold", "Rented", "Reserved", "Off Market"] as const;
export const PROPERTY_STATUS = ["Available", "Under Review", "Sold", "Rented", "Reserved", "Off Market"] as const;
export const OWNERSHIP_TYPES = ["Freehold", "Leasehold", "Builder Ownership", "Power of Attorney"] as const;
export const RERA_STATUS = ["Verified", "Pending", "Not Applicable", "Not Verified"] as const;
export const VERIFICATION_STATUS = ["Verified", "Needs Review", "High Risk", "Pending Documents"] as const;
export const VISIBILITY_OPTIONS = ["Public", "Private", "Team Only", "Featured"] as const;
export const PRIORITY_OPTIONS = ["Normal", "Hot Property", "Premium Listing", "Urgent Sale"] as const;
export const PAYMENT_PLAN_OPTIONS = ["Full Payment", "Down Payment + EMI", "10/90", "20/80", "30/70", "Construction Linked"] as const;
export const UNIT_OPTIONS = ["sq ft", "sq m", "acre", "hectare"] as const;
export const AREA_UNIT_OPTIONS = UNIT_OPTIONS;
export const BEDROOM_OPTIONS = ["Studio", "1", "2", "3", "4", "5", "6+", "Not Applicable"] as const;
export const BATHROOM_OPTIONS = ["1", "2", "3", "4", "5+", "Not Applicable"] as const;
export const BALCONY_OPTIONS = ["0", "1", "2", "3", "4+", "Not Applicable"] as const;
export const FURNISHING_OPTIONS = ["Unfurnished", "Semi-Furnished", "Fully Furnished", "Luxury Furnished"] as const;
export const FLOOR_OPTIONS = ["Ground", "1–10", "11–20", "21–40", "40+", "Not Applicable"] as const;
export const PARKING_OPTIONS = ["No Parking", "1 Covered", "2 Covered", "3+ Covered", "Open Parking"] as const;
export const FACING_OPTIONS = ["North", "South", "East", "West", "North-East", "North-West", "South-East", "South-West", "Not Applicable"] as const;
export const POSSESSION_OPTIONS = [
  "Ready to Move",
  "Under Construction",
  "New Launch",
  "Pre-launch",
] as const;
export const APPRECIATION_OPTIONS = ["Low Growth", "Stable", "Moderate Growth", "High Growth", "Very High Growth"] as const;
export const INVESTOR_FIT_OPTIONS = ["Rental Income", "Capital Appreciation", "Luxury Investment", "Commercial Yield", "Safe Long-Term Hold", "Not Investor Focused"] as const;
export const RISK_OPTIONS = ["Low", "Medium", "High"] as const;
export const TAG_OPTIONS = ["Hot Deal", "High ROI", "Luxury", "Verified", "New Launch", "Investor Friendly", "Family Friendly", "Commercial Yield", "Global Property"] as const;
export const AMENITY_OPTIONS = [
  "Swimming Pool",
  "Gym",
  "Clubhouse",
  "Security",
  "Power Backup",
  "Lift",
  "Parking",
  "Garden",
  "Smart Home",
  "Sea View",
  "Metro Nearby",
  "School Nearby",
  "Hospital Nearby",
  "Mall Nearby",
] as const;
export const UNIT_PRICE_UNITS = ["sq ft", "sq m", "acre", "hectare"] as const;

type CountryMeta = {
  currencyCode: string;
  currencySymbol: string;
  priceRanges: string[];
  cities: string[];
  areaHints: Record<string, string[]>;
};

const COUNTRY_META: Record<PropertyCountry, CountryMeta> = {
  India: {
    currencyCode: "INR",
    currencySymbol: "₹",
    priceRanges: ["Below ₹50L", "₹50L – ₹1Cr", "₹1Cr – ₹2Cr", "₹2Cr – ₹5Cr", "₹5Cr+"],
    cities: ["Mumbai", "Delhi NCR", "Gurugram", "Noida", "Bengaluru", "Hyderabad", "Pune"],
    areaHints: {
      Mumbai: ["Bandra West", "Worli", "Lower Parel", "Andheri"],
      "Delhi NCR": ["South Delhi", "Dwarka", "Greater Kailash", "Aerocity"],
      Gurugram: ["Golf Course Road", "Sohna Road", "DLF Phase 5"],
      Noida: ["Sector 150", "Sector 62", "Sector 137"],
      Bengaluru: ["Whitefield", "Indiranagar", "Koramangala"],
      Hyderabad: ["Gachibowli", "HITEC City", "Banjara Hills"],
      Pune: ["Koregaon Park", "Hinjewadi", "Kharadi"],
    },
  },
  UAE: {
    currencyCode: "AED",
    currencySymbol: "د.إ",
    priceRanges: ["Below AED 500K", "AED 500K – AED 1M", "AED 1M – AED 2M", "AED 2M – AED 5M", "AED 5M+"],
    cities: ["Dubai", "Abu Dhabi", "Sharjah"],
    areaHints: {
      Dubai: ["Dubai Marina", "Downtown Dubai", "Business Bay", "Palm Jumeirah"],
      "Abu Dhabi": ["Saadiyat Island", "Yas Island", "Al Reem Island"],
      Sharjah: ["Aljada", "Muweilah", "Al Nahda"],
    },
  },
  USA: {
    currencyCode: "USD",
    currencySymbol: "$",
    priceRanges: ["Below $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $2M", "$2M+"],
    cities: ["New York", "Los Angeles", "Miami", "San Francisco", "Dallas"],
    areaHints: {
      "New York": ["Manhattan", "Brooklyn", "Queens"],
      "Los Angeles": ["Beverly Hills", "Santa Monica", "Downtown LA"],
      Miami: ["Brickell", "Miami Beach", "Downtown Miami"],
      "San Francisco": ["SOMA", "Mission District", "Nob Hill"],
      Dallas: ["Uptown", "Downtown", "Frisco"],
    },
  },
  UK: {
    currencyCode: "GBP",
    currencySymbol: "£",
    priceRanges: ["Below £100K", "£100K – £250K", "£250K – £500K", "£500K – £1M", "£1M+"],
    cities: ["London", "Manchester", "Birmingham"],
    areaHints: {
      London: ["Belgravia", "Mayfair", "Canary Wharf", "Chelsea"],
      Manchester: ["Deansgate", "Salford Quays", "Spinningfields"],
      Birmingham: ["Edgbaston", "Jewellery Quarter", "Solihull"],
    },
  },
  Canada: {
    currencyCode: "CAD",
    currencySymbol: "C$",
    priceRanges: ["Below $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $2M", "$2M+"],
    cities: ["Toronto", "Vancouver", "Montreal"],
    areaHints: {
      Toronto: ["Yorkville", "Downtown", "North York"],
      Vancouver: ["West End", "Yaletown", "Kitsilano"],
      Montreal: ["Old Montreal", "Downtown", "Westmount"],
    },
  },
  Singapore: {
    currencyCode: "SGD",
    currencySymbol: "S$",
    priceRanges: ["Below $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $2M", "$2M+"],
    cities: ["Singapore"],
    areaHints: {
      Singapore: ["Orchard", "Marina Bay", "River Valley", "Sentosa"],
    },
  },
  Australia: {
    currencyCode: "AUD",
    currencySymbol: "A$",
    priceRanges: ["Below $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $2M", "$2M+"],
    cities: ["Sydney", "Melbourne", "Brisbane"],
    areaHints: {
      Sydney: ["CBD", "Bondi", "Parramatta"],
      Melbourne: ["Southbank", "St Kilda", "Docklands"],
      Brisbane: ["South Brisbane", "New Farm", "Fortitude Valley"],
    },
  },
  Germany: {
    currencyCode: "EUR",
    currencySymbol: "€",
    priceRanges: ["Below €100K", "€100K – €250K", "€250K – €500K", "€500K – €1M", "€1M+"],
    cities: ["Berlin", "Munich", "Frankfurt"],
    areaHints: {
      Berlin: ["Mitte", "Charlottenburg", "Kreuzberg"],
      Munich: ["Altstadt", "Schwabing", "Maxvorstadt"],
      Frankfurt: ["Westend", "Sachsenhausen", "Innenstadt"],
    },
  },
  France: {
    currencyCode: "EUR",
    currencySymbol: "€",
    priceRanges: ["Below €100K", "€100K – €250K", "€250K – €500K", "€500K – €1M", "€1M+"],
    cities: ["Paris", "Lyon", "Nice"],
    areaHints: {
      Paris: ["Le Marais", "Champs-Élysées", "Saint-Germain"],
      Lyon: ["Presqu'île", "Part-Dieu", "Confluence"],
      Nice: ["Promenade des Anglais", "Cimiez", "Old Town"],
    },
  },
  "Saudi Arabia": {
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    priceRanges: ["Below SAR 500K", "SAR 500K – SAR 1M", "SAR 1M – SAR 2M", "SAR 2M – SAR 5M", "SAR 5M+"],
    cities: ["Riyadh", "Jeddah", "Khobar"],
    areaHints: {
      Riyadh: ["Al Olaya", "King Abdullah Financial District", "Hittin"],
      Jeddah: ["Al Hamra", "Al Rawdah", "North Jeddah"],
      Khobar: ["Corniche", "Al Khobar Al Shamalia", "Dhahran"],
    },
  },
  Qatar: {
    currencyCode: "QAR",
    currencySymbol: "ر.ق",
    priceRanges: ["Below QAR 500K", "QAR 500K – QAR 1M", "QAR 1M – QAR 2M", "QAR 2M – QAR 5M", "QAR 5M+"],
    cities: ["Doha", "Lusail", "Al Wakrah"],
    areaHints: {
      Doha: ["The Pearl", "West Bay", "Msheireb"],
      Lusail: ["Marina District", "Fox Hills", "Energy City"],
      "Al Wakrah": ["Al Wakrah Souq", "Al Wukair", "Mesaieed"],
    },
  },
  Oman: {
    currencyCode: "OMR",
    currencySymbol: "ر.ع",
    priceRanges: ["Below OMR 100K", "OMR 100K – OMR 250K", "OMR 250K – OMR 500K", "OMR 500K+"],
    cities: ["Muscat", "Salalah", "Sohar"],
    areaHints: {
      Muscat: ["Al Mouj", "Qurum", "Azaiba"],
      Salalah: ["Hawana", "Al Haffa", "Central Salalah"],
      Sohar: ["Sohar Industrial", "Corniche", "Falaj Al Qabail"],
    },
  },
  Kuwait: {
    currencyCode: "KWD",
    currencySymbol: "د.ك",
    priceRanges: ["Below KWD 100K", "KWD 100K – KWD 250K", "KWD 250K – KWD 500K", "KWD 500K+"],
    cities: ["Kuwait City", "Salmiya", "Hawalli"],
    areaHints: {
      "Kuwait City": ["Sharq", "Dasman", "Bneid Al Qar"],
      Salmiya: ["Block 1", "Marina", "Salwa"],
      Hawalli: ["Jabriya", "Rumaithiya", "Mubarak Al-Kabeer"],
    },
  },
  Bahrain: {
    currencyCode: "BHD",
    currencySymbol: ".د.ب",
    priceRanges: ["Below BHD 100K", "BHD 100K – BHD 250K", "BHD 250K – BHD 500K", "BHD 500K+"],
    cities: ["Manama", "Muharraq", "Riffa"],
    areaHints: {
      Manama: ["Seef", "Juffair", "Amwaj Islands"],
      Muharraq: ["Diyar Al Muharraq", "Busaiteen", "Arad"],
      Riffa: ["East Riffa", "West Riffa", "Bukuwara"],
    },
  },
  "South Africa": {
    currencyCode: "ZAR",
    currencySymbol: "R",
    priceRanges: ["Below R1M", "R1M – R2M", "R2M – R5M", "R5M+"],
    cities: ["Cape Town", "Johannesburg", "Durban"],
    areaHints: {
      "Cape Town": ["Sea Point", "Camps Bay", "Clifton"],
      Johannesburg: ["Sandton", "Rosebank", "Bryanston"],
      Durban: ["Umhlanga", "Ballito", "Morningside"],
    },
  },
  Other: {
    currencyCode: "USD",
    currencySymbol: "$",
    priceRanges: ["Below $100K", "$100K – $250K", "$250K – $500K", "$500K – $1M", "$1M – $2M", "$2M+"],
    cities: [],
    areaHints: {},
  },
};

export const PROPERTY_TYPE_BY_CATEGORY: Record<string, string[]> = {
  Residential: ["Apartment", "Villa", "Penthouse", "Studio", "Duplex", "Farmhouse"],
  Commercial: ["Office Space", "Retail Shop", "Showroom", "Warehouse", "Co-working Space"],
  "Land / Plot": ["Residential Plot", "Commercial Plot", "Agricultural Land", "Industrial Land"],
  Industrial: ["Warehouse", "Industrial Shed", "Factory"],
  "Mixed-use": ["Mixed-use Building", "Mixed-use Property", "Live/Work Space"],
  Hospitality: ["Hotel", "Resort", "Serviced Apartment", "Holiday Home"],
};

export type CountryName = keyof typeof COUNTRY_META;

export function getCurrencyByCountry(country: string) {
  return COUNTRY_META[(country as CountryName) || "Other"]?.currencyCode ?? "USD";
}

export function getCurrencySymbolByCountry(country: string) {
  return COUNTRY_META[(country as CountryName) || "Other"]?.currencySymbol ?? "$";
}

export function getPriceRangesByCountry(country: string) {
  return COUNTRY_META[(country as CountryName) || "Other"]?.priceRanges ?? COUNTRY_META.Other.priceRanges;
}

export function getCitiesByCountry(country: string) {
  return COUNTRY_META[(country as CountryName) || "Other"]?.cities ?? [];
}

export function getAreasByCity(city: string) {
  for (const meta of Object.values(COUNTRY_META)) {
    if (meta.areaHints[city]) return meta.areaHints[city];
  }
  return [];
}

export function formatPropertyPrice(price: string | number, currencyCode: string) {
  const raw = typeof price === "number" ? String(price) : String(price ?? "");
  const digits = raw.replace(/[^\d.]/g, "");
  if (!digits) return raw;
  const n = Number(digits);
  if (!Number.isFinite(n)) return raw;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode || "USD",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currencyCode} ${n.toLocaleString()}`;
  }
}

export function getExactPricePlaceholderByCountry(country: string) {
  const symbol = getCurrencySymbolByCountry(country);
  switch (country) {
    case "India":
      return "₹1,25,00,000";
    case "UAE":
      return "AED 1,200,000";
    case "USA":
      return "$850,000";
    case "UK":
      return "£650,000";
    case "Canada":
      return "C$950,000";
    case "Singapore":
      return "S$1,200,000";
    case "Australia":
      return "A$1,100,000";
    case "Germany":
    case "France":
      return "€850,000";
    case "Saudi Arabia":
      return "SAR 2,500,000";
    case "Qatar":
      return "QAR 3,500,000";
    case "Oman":
      return "OMR 250,000";
    case "Kuwait":
      return "KWD 180,000";
    case "Bahrain":
      return "BHD 150,000";
    case "South Africa":
      return "R 3,200,000";
    default:
      return `${symbol} 850,000`;
  }
}

export type PropertyFormData = {
  title: string;
  listingType: string;
  propertyCategory: string;
  propertyType: string;
  listingStatus: string;
  country: string;
  city: string;
  area: string;
  address: string;
  latitude: string;
  longitude: string;
  priceRange: string;
  exactPrice: string;
  priceUnit: string;
  pricePerUnit: string;
  maintenanceCharges: string;
  bookingAmount: string;
  paymentPlan: string;
  bedrooms: string;
  bathrooms: string;
  balconies: string;
  areaSize: string;
  areaUnit: string;
  furnishing: string;
  floor: string;
  totalFloors: string;
  parking: string;
  facing: string;
  possessionStatus: string;
  rentalYield: string;
  roiScore: number;
  appreciationForecast: string;
  investorFit: string;
  riskLevel: string;
  aiInvestmentNote: string;
  coverImageUrl: string;
  galleryImageUrls: string;
  ownershipType: string;
  reraStatus: string;
  developerName: string;
  trustScore: number;
  nearbyPlaces: string[];
  verificationStatus: string;
  visibility: string;
  priority: string;
  tags: string[];
  assignedBroker: string;
  description: string;
  amenities: string[];
  aiSummary: string;
  isFeatured: boolean;
  isHotDeal: boolean;
  isGlobalProperty: boolean;
};

export function createDefaultPropertyForm(): PropertyFormData {
  return {
    title: "",
    listingType: "Sale",
    propertyCategory: "Residential",
    propertyType: "Apartment",
    listingStatus: "Available",
    country: "UAE",
    city: "",
    area: "",
    address: "",
    latitude: "",
    longitude: "",
    priceRange: "",
    exactPrice: "",
    priceUnit: "sq ft",
    pricePerUnit: "",
    maintenanceCharges: "",
    bookingAmount: "",
    paymentPlan: "Full Payment",
    bedrooms: "2",
    bathrooms: "2",
    balconies: "1",
    areaSize: "",
    areaUnit: "sq ft",
    furnishing: "Unfurnished",
    floor: "Not Applicable",
    totalFloors: "",
    parking: "1 Covered",
    facing: "Not Applicable",
    possessionStatus: "Ready to Move",
    rentalYield: "",
    roiScore: 80,
    appreciationForecast: "Moderate Growth",
    investorFit: "Capital Appreciation",
    riskLevel: "Medium",
    aiInvestmentNote: "",
    coverImageUrl: "",
    galleryImageUrls: "",
    ownershipType: "Freehold",
    reraStatus: "Pending",
    developerName: "",
    trustScore: 80,
    nearbyPlaces: [],
    verificationStatus: "Pending Documents",
    visibility: "Public",
    priority: "Normal",
    tags: ["Global Property"],
    assignedBroker: "",
    description: "",
    amenities: [],
    aiSummary: "",
    isFeatured: false,
    isHotDeal: false,
    isGlobalProperty: true,
  };
}

export function validatePropertyForm(data: PropertyFormData) {
  const errors: Record<string, string> = {};
  if (!data.title.trim()) errors.title = "Property title is required.";
  if (!data.listingType) errors.listingType = "Listing type is required.";
  if (!data.propertyCategory) errors.propertyCategory = "Property category is required.";
  if (!data.propertyType) errors.propertyType = "Property type is required.";
  if (!data.listingStatus) errors.listingStatus = "Listing status is required.";
  if (!data.country) errors.country = "Country is required.";
  if (!data.city.trim()) errors.city = "City is required.";
  if (!data.area.trim()) errors.area = "Area / locality is required.";
  if (!data.priceRange.trim() && !data.exactPrice.trim()) errors.priceRange = "Add a price range or exact price.";
  return { valid: Object.keys(errors).length === 0, errors };
}

export function generateMockAiSummary(data: Partial<PropertyFormData>) {
  const title = data.title || "This property";
  const area = data.area || data.city || "the selected location";
  const type = data.propertyType || "property";
  return `${title} is a ${data.listingType?.toLowerCase() || "listed"} ${type.toLowerCase()} in ${area}. It fits ${data.investorFit?.toLowerCase() || "long-term investment"} strategies and shows ${data.appreciationForecast?.toLowerCase() || "stable"} outlook with ${data.riskLevel?.toLowerCase() || "moderate"} risk.`;
}

