/**
 * Property trust & risk verification — backend-ready stubs.
 *
 * Later connect to:
 * - Real land registry / title APIs, RERA / DLD / municipal databases
 * - Legal databases, litigation feeds, encumbrance search
 * - Developer ratings, project delivery history (verified DBs)
 * - Fraud pattern services, duplicate listing detectors
 * - Supabase for audit trail + n8n for orchestration
 *
 * Do not treat responses as live government or legal truth until real integrations exist.
 */

import type { TrustVerification } from "./trust-engine-model";

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function fetchOwnershipData(_propertyId: string): Promise<Record<string, unknown>> {
  await delay(120);
  void _propertyId;
  return { mock: true };
}

export async function fetchRegulatoryData(_propertyId: string): Promise<Record<string, unknown>> {
  await delay(110);
  void _propertyId;
  return { mock: true };
}

export async function fetchLegalRiskData(_propertyId: string): Promise<Record<string, unknown>> {
  await delay(130);
  void _propertyId;
  return { mock: true };
}

export async function fetchDeveloperReputation(_propertyId: string): Promise<Record<string, unknown>> {
  await delay(100);
  void _propertyId;
  return { mock: true };
}

export async function fetchFraudSignals(_propertyId: string): Promise<Record<string, unknown>> {
  await delay(95);
  void _propertyId;
  return { mock: true };
}

export async function calculateTrustScore(verifications: TrustVerification[]): Promise<number> {
  await delay(80);
  const dims = verifications.filter((v) => v.id !== "final");
  if (!dims.length) return 0;
  return Math.round(dims.reduce((s, v) => s + v.score, 0) / dims.length);
}

export async function generateTrustReport(_propertyId: string): Promise<{ reportId: string }> {
  await delay(150);
  void _propertyId;
  return { reportId: `TR-${Date.now().toString(36)}` };
}

/** Production: signed URL or server-generated file. */
export async function downloadTrustReport(): Promise<Blob> {
  await delay(40);
  return new Blob([""], { type: "text/csv" });
}
