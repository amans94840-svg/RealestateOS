/**
 * Lead phone OTP — mock transport for local/dev.
 *
 * Later: connect `sendOtp` / `resendOtp` with Twilio, MSG91, or Supabase Auth Phone OTP.
 * Later: move `verifyOtp` to a secure backend; validate server-side only. Never ship real OTP
 * secrets to the browser in production.
 *
 * SECURITY: The in-memory store below is for mock/demo only. Remove when wiring a real provider.
 */

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

const OTP_TTL_MS = 10 * 60 * 1000;

/** phoneNumber key should be full dial string, e.g. +971501234567 */
const mockOtpByPhone = new Map<string, { otp: string; expiresAt: number }>();

export function getNationalDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** National significant digits only (country code selected separately). */
export function isValidNationalPhoneDigits(digits: string): boolean {
  return digits.length >= 7 && digits.length <= 15;
}

export function buildFullPhoneNumber(countryDialCode: string, nationalDigits: string): string {
  const code = countryDialCode.replace(/\s/g, "");
  const plus = code.startsWith("+") ? code : `+${code}`;
  return `${plus}${nationalDigits}`;
}

export type SendOtpResult =
  | { ok: true; /** DEV ONLY — never return OTP from real APIs in production */ devMockOtp?: string }
  | { ok: false; message: string };

/**
 * Request an OTP for the given E.164-style number.
 * Production: POST to your API; do not echo OTP in JSON for non-admin clients.
 */
export async function sendOtp(phoneNumber: string): Promise<SendOtpResult> {
  await delay(280);
  if (!phoneNumber || phoneNumber.replace(/\D/g, "").length < 8) {
    return { ok: false, message: "Invalid destination" };
  }
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  mockOtpByPhone.set(phoneNumber, { otp, expiresAt: Date.now() + OTP_TTL_MS });
  if (import.meta.env.DEV) {
    return { ok: true, devMockOtp: otp };
  }
  return { ok: true };
}

/**
 * Verify OTP. Production: POST phone + otp to backend; backend returns success/failure.
 * Mock: compares against last `sendOtp` / `resendOtp` for the same phone key.
 */
export async function verifyOtp(phoneNumber: string, otp: string): Promise<boolean> {
  await delay(220);
  const row = mockOtpByPhone.get(phoneNumber);
  if (!row || Date.now() > row.expiresAt) return false;
  const cleaned = otp.replace(/\D/g, "");
  if (cleaned.length !== 6) return false;
  const ok = row.otp === cleaned;
  if (ok) mockOtpByPhone.delete(phoneNumber);
  return ok;
}

/** Same contract as `sendOtp`; production may hit a dedicated resend endpoint with rate limits. */
export async function resendOtp(phoneNumber: string): Promise<SendOtpResult> {
  return sendOtp(phoneNumber);
}
