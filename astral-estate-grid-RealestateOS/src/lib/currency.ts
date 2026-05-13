// Reusable currency utilities — country/phone-code aware
export type CurrencyInfo = { code: string; symbol: string; locale: string };

const BY_COUNTRY: Record<string, CurrencyInfo> = {
  India: { code: "INR", symbol: "₹", locale: "en-IN" },
  USA: { code: "USD", symbol: "$", locale: "en-US" },
  Canada: { code: "CAD", symbol: "C$", locale: "en-CA" },
  UK: { code: "GBP", symbol: "£", locale: "en-GB" },
  UAE: { code: "AED", symbol: "د.إ", locale: "ar-AE" },
  Singapore: { code: "SGD", symbol: "S$", locale: "en-SG" },
  Australia: { code: "AUD", symbol: "A$", locale: "en-AU" },
  Germany: { code: "EUR", symbol: "€", locale: "de-DE" },
  France: { code: "EUR", symbol: "€", locale: "fr-FR" },
  "Saudi Arabia": { code: "SAR", symbol: "ر.س", locale: "ar-SA" },
  Qatar: { code: "QAR", symbol: "ر.ق", locale: "ar-QA" },
  Oman: { code: "OMR", symbol: "ر.ع", locale: "ar-OM" },
  Kuwait: { code: "KWD", symbol: "د.ك", locale: "ar-KW" },
  Bahrain: { code: "BHD", symbol: "د.ب", locale: "ar-BH" },
  "South Africa": { code: "ZAR", symbol: "R", locale: "en-ZA" },
};

const BY_PHONE: Record<string, string> = {
  "+91": "India", "+1": "USA", "+44": "UK", "+971": "UAE", "+65": "Singapore",
  "+61": "Australia", "+966": "Saudi Arabia", "+49": "Germany", "+33": "France",
  "+974": "Qatar", "+968": "Oman", "+965": "Kuwait", "+973": "Bahrain", "+27": "South Africa",
};

export const getCurrencyByCountry = (c: string): CurrencyInfo =>
  BY_COUNTRY[c] ?? { code: "USD", symbol: "$", locale: "en-US" };

export const getCurrencyByPhoneCode = (code: string): CurrencyInfo =>
  getCurrencyByCountry(BY_PHONE[code] ?? "USA");

export const formatCurrency = (amount: number, country = "USA"): string => {
  const c = getCurrencyByCountry(country);
  try {
    return new Intl.NumberFormat(c.locale, { style: "currency", currency: c.code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${c.symbol}${amount.toLocaleString()}`;
  }
};
