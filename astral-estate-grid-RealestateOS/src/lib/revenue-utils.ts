export type CountryCurrencyRule = {
  country: string;
  currencyCode: "INR" | "AED" | "USD" | "GBP" | "CAD" | "SGD" | "AUD" | "EUR";
  symbol: string;
};

export const COUNTRY_CURRENCY_RULES: CountryCurrencyRule[] = [
  { country: "India", currencyCode: "INR", symbol: "₹" },
  { country: "UAE", currencyCode: "AED", symbol: "AED " },
  { country: "USA", currencyCode: "USD", symbol: "$" },
  { country: "UK", currencyCode: "GBP", symbol: "£" },
  { country: "Canada", currencyCode: "CAD", symbol: "C$" },
  { country: "Singapore", currencyCode: "SGD", symbol: "SGD " },
  { country: "Australia", currencyCode: "AUD", symbol: "AUD " },
  { country: "Germany", currencyCode: "EUR", symbol: "€" },
  { country: "France", currencyCode: "EUR", symbol: "€" },
];

export function getCurrencyRuleForCountry(country: string) {
  const rule = COUNTRY_CURRENCY_RULES.find((r) => r.country === country);
  if (rule) return rule;
  // Fallback: "Other" and unknown countries → USD
  return { country: "Other", currencyCode: "USD" as const, symbol: "$" };
}

function trimTrailingZeros(numStr: string) {
  // e.g. "1.20" -> "1.2", "1.00" -> "1"
  return numStr.replace(/\.?0+$/, "");
}

export function formatRevenue(value: number, country: string, currency: string) {
  if (!Number.isFinite(value)) return `${currency}0`;
  const abs = Math.abs(value);
  if (country === "India") {
    // Cr/L (Indian numbering system)
    if (abs >= 10_000_000) {
      const v = abs / 10_000_000;
      const formatted = trimTrailingZeros(v.toFixed(v >= 10 ? 2 : 2));
      return `${value < 0 ? "-" : ""}${currency}${formatted}Cr`;
    }
    if (abs >= 100_000) {
      const v = abs / 100_000;
      const formatted = trimTrailingZeros(v.toFixed(v >= 10 ? 2 : 2));
      return `${value < 0 ? "-" : ""}${currency}${formatted}L`;
    }
    const formatted = abs.toFixed(0);
    return `${value < 0 ? "-" : ""}${currency}${formatted}`;
  }

  // Others: K/M
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    const formatted = trimTrailingZeros(v.toFixed(v >= 10 ? 2 : 2));
    return `${value < 0 ? "-" : ""}${currency}${formatted}M`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    const formatted = trimTrailingZeros(v.toFixed(v >= 10 ? 2 : 2));
    return `${value < 0 ? "-" : ""}${currency}${formatted}K`;
  }
  return `${value < 0 ? "-" : ""}${currency}${abs.toFixed(0)}`;
}

