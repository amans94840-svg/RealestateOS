/**
 * Lead phone validation + formatting.
 *
 * OTP is intentionally removed from the manual lead entry flow.
 * We validate the phone number against country-specific rules and only allow
 * saving a lead when the number is valid for the selected country.
 */

export type PhoneRule = {
  /** Country dial code including leading +, e.g. +91 */
  dialCode: string;
  /** Allowed national significant digits length range (no + dial code) */
  nationalMinLength: number;
  nationalMaxLength: number;
  /** Example national number (digits only) used for placeholder */
  exampleNational: string;
};

export const PHONE_RULES: Record<string, PhoneRule> = {
  "+91": { dialCode: "+91", nationalMinLength: 10, nationalMaxLength: 10, exampleNational: "9876543210" }, // India
  "+1": { dialCode: "+1", nationalMinLength: 10, nationalMaxLength: 10, exampleNational: "4155552671" }, // USA (and Canada)
  "+44": { dialCode: "+44", nationalMinLength: 10, nationalMaxLength: 11, exampleNational: "7911123456" }, // UK
  "+971": { dialCode: "+971", nationalMinLength: 9, nationalMaxLength: 9, exampleNational: "501234567" }, // UAE
  "+65": { dialCode: "+65", nationalMinLength: 8, nationalMaxLength: 8, exampleNational: "81234567" }, // Singapore
  "+61": { dialCode: "+61", nationalMinLength: 9, nationalMaxLength: 9, exampleNational: "412345678" }, // Australia
  "+49": { dialCode: "+49", nationalMinLength: 10, nationalMaxLength: 11, exampleNational: "15123456789" }, // Germany
  "+33": { dialCode: "+33", nationalMinLength: 9, nationalMaxLength: 9, exampleNational: "612345678" }, // France
  "+966": { dialCode: "+966", nationalMinLength: 9, nationalMaxLength: 9, exampleNational: "512345678" }, // Saudi Arabia
  "+974": { dialCode: "+974", nationalMinLength: 8, nationalMaxLength: 8, exampleNational: "33123456" }, // Qatar
};

export function getNationalDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function getPhoneRuleForDialCode(dialCode: string): PhoneRule | null {
  const cleaned = dialCode.replace(/\s/g, "");
  return PHONE_RULES[cleaned] ?? null;
}

export function getPhoneMaxNationalLength(dialCode: string): number {
  return getPhoneRuleForDialCode(dialCode)?.nationalMaxLength ?? 15;
}

export function getPhonePlaceholder(dialCode: string): string {
  return getPhoneRuleForDialCode(dialCode)?.exampleNational ?? "National number";
}

export function sanitizeNationalPhoneInput(raw: string, dialCode: string): string {
  const digits = getNationalDigits(raw);
  const maxLen = getPhoneMaxNationalLength(dialCode);
  return digits.slice(0, maxLen);
}

export function isValidPhoneNumberForCountry(dialCode: string, nationalDigits: string): boolean {
  const rule = getPhoneRuleForDialCode(dialCode);
  if (!rule) return false; // unsupported country → invalid by design
  if (!nationalDigits) return false;
  if (!/^\d+$/.test(nationalDigits)) return false;
  if (nationalDigits.length < rule.nationalMinLength) return false;
  if (nationalDigits.length > rule.nationalMaxLength) return false;
  return true;
}

/**
 * Build E.164-style output. Input should already be sanitized digits only.
 * Example: +971 + 501234567 => +971501234567
 */
export function formatPhoneE164(dialCode: string, nationalDigits: string): string {
  return buildFullPhoneNumber(dialCode, nationalDigits);
}

/** Normalize dial code to +XX format. */
export function normalizeCountryCode(code: string): string {
  const c = coercePhoneScalar(code);
  if (!c) return "";
  const trimmed = c.replace(/\s/g, "");
  return trimmed.startsWith("+") ? trimmed : `+${getNationalDigits(trimmed)}`;
}

/** Never surface JSON/objects/arrays as phone text. */
export function coercePhoneScalar(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    return value
      .map((v) => coercePhoneScalar(v))
      .filter(Boolean)
      .join("");
  }
  if (typeof value === "object") return "";
  return "";
}

/**
 * Display format: +CountryCode NationalNumber
 * e.g. +91 9876543210, +1 2135557788
 */
export function formatPhoneNumber(countryCode: string, phone: string): string {
  const code = normalizeCountryCode(countryCode);
  const national = getNationalDigits(coercePhoneScalar(phone));
  if (!code && !national) return "";
  if (!code) return national ? `+${national}` : "";
  if (!national) return code;
  return `${code} ${national}`;
}

/** E.164 compact: country_code + national digits, e.g. +919876543210 */
export function buildFullPhoneNumber(countryCode: string, phone: string): string {
  const code = normalizeCountryCode(countryCode);
  const national = getNationalDigits(coercePhoneScalar(phone));
  if (!code && !national) return "";
  if (!code) return national ? `+${national}` : "";
  if (!national) return code;
  return `${code}${national}`;
}

export type ResolvedLeadPhone = {
  countryCode: string;
  phoneLocal: string;
  fullPhoneE164: string;
  displayPhone: string;
};

const DIAL_CODES_BY_LENGTH = Object.keys(PHONE_RULES).sort(
  (a, b) => getNationalDigits(b).length - getNationalDigits(a).length,
);

export function inferCountryCodeFromE164(e164: string): string {
  const all = getNationalDigits(e164);
  if (!all) return "";
  for (const code of DIAL_CODES_BY_LENGTH) {
    const cc = getNationalDigits(code);
    if (cc && all.startsWith(cc)) return normalizeCountryCode(code);
  }
  return "";
}

function nationalFromE164(e164: string, dialCode: string): string {
  const all = getNationalDigits(e164);
  const cc = getNationalDigits(dialCode);
  if (cc && all.startsWith(cc)) return all.slice(cc.length);
  return all;
}

/**
 * Resolve phone fields from Supabase row (supports legacy rows missing full_phone_number).
 */
export function resolveLeadPhoneFromRow(fields: {
  country_code?: unknown;
  phone?: unknown;
  full_phone_number?: unknown;
}): ResolvedLeadPhone {
  let countryCode = normalizeCountryCode(fields.country_code);
  const phoneRaw = coercePhoneScalar(fields.phone);
  const fullRaw = coercePhoneScalar(fields.full_phone_number);

  let phoneLocal = getNationalDigits(phoneRaw);
  let fullPhoneE164 = "";

  if (fullRaw.startsWith("+") || getNationalDigits(fullRaw).length > (phoneLocal?.length ?? 0) + 4) {
    fullPhoneE164 = fullRaw.startsWith("+") ? `+${getNationalDigits(fullRaw)}` : buildFullPhoneNumber("", fullRaw);
    if (!countryCode) countryCode = inferCountryCodeFromE164(fullPhoneE164);
    if (countryCode) {
      phoneLocal = nationalFromE164(fullPhoneE164, countryCode) || phoneLocal;
    } else if (!phoneLocal) {
      phoneLocal = getNationalDigits(fullPhoneE164);
    }
  }

  if (phoneRaw.startsWith("+")) {
    const e164 = `+${getNationalDigits(phoneRaw)}`;
    if (!fullPhoneE164) fullPhoneE164 = e164;
    if (!countryCode) countryCode = inferCountryCodeFromE164(e164);
    if (countryCode) phoneLocal = nationalFromE164(e164, countryCode);
    else phoneLocal = getNationalDigits(e164);
  }

  if (!fullPhoneE164 && countryCode && phoneLocal) {
    fullPhoneE164 = buildFullPhoneNumber(countryCode, phoneLocal);
  }

  if (!phoneLocal && fullPhoneE164 && countryCode) {
    phoneLocal = nationalFromE164(fullPhoneE164, countryCode);
  }

  if (!phoneLocal && fullPhoneE164) {
    phoneLocal = getNationalDigits(fullPhoneE164);
  }

  const displayPhone = formatPhoneNumber(countryCode, phoneLocal);
  return {
    countryCode,
    phoneLocal,
    fullPhoneE164,
    displayPhone,
  };
}

/** Digits only for https://wa.me/{digits} (no + or spaces). */
export function getWhatsAppWaMeDigits(fullPhoneE164: string): string | null {
  const digits = getNationalDigits(fullPhoneE164);
  return digits.length > 0 ? digits : null;
}

export function getWhatsAppWaMeDigitsFromLead(fields: {
  country_code?: string;
  phone?: string;
  full_phone_number?: string;
  fullPhoneE164?: string;
}): string | null {
  const resolved = fields.fullPhoneE164
    ? {
        countryCode: fields.country_code ?? "",
        phoneLocal: fields.phone ?? "",
        fullPhoneE164: fields.fullPhoneE164,
        displayPhone: "",
      }
    : resolveLeadPhoneFromRow({
        country_code: fields.country_code,
        phone: fields.phone,
        full_phone_number: fields.full_phone_number,
      });
  const e164 = resolved.fullPhoneE164 || buildFullPhoneNumber(resolved.countryCode, resolved.phoneLocal);
  return getWhatsAppWaMeDigits(e164);
}

export function getPhoneValidationError(dialCode: string, nationalDigits: string): string | null {
  const code = normalizeCountryCode(dialCode);
  const digits = getNationalDigits(nationalDigits);
  if (!code) return "Select a country code";
  if (!digits) return "Phone number is required";
  const rule = getPhoneRuleForDialCode(code);
  if (!rule) return "Phone validation is not available for this country";
  if (digits.length < rule.nationalMinLength) {
    if (rule.nationalMinLength === rule.nationalMaxLength) {
      return `Enter exactly ${rule.nationalMinLength} digits`;
    }
    return `Enter ${rule.nationalMinLength}–${rule.nationalMaxLength} digits`;
  }
  if (digits.length > rule.nationalMaxLength) {
    return `Enter at most ${rule.nationalMaxLength} digits`;
  }
  if (!isValidPhoneNumberForCountry(code, digits)) {
    return "Invalid phone number for selected country";
  }
  return null;
}

