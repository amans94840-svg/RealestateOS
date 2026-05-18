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
  const code = dialCode.replace(/\s/g, "");
  const plus = code.startsWith("+") ? code : `+${code}`;
  const digits = getNationalDigits(nationalDigits);
  return `${plus}${digits}`;
}

