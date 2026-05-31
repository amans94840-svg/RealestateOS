import { getSupabase, isSupabaseConfigured } from "@/lib/supabase-client";
import type { SubscriptionRow, PaymentRow, InvoiceRow } from "@/types/billing";

export async function fetchSubscription(workspaceId?: string): Promise<SubscriptionRow | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("subscriptions").select("*").eq("workspace_id", workspaceId).limit(1).maybeSingle();
    if (error) {
      console.error("[billingService] fetchSubscription error", error);
      return null;
    }
    return data as SubscriptionRow | null;
  } catch (e) {
    console.error("[billingService] unexpected", e);
    return null;
  }
}

export async function fetchPayments(workspaceId?: string): Promise<PaymentRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("payments").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false });
    if (error) {
      console.error("[billingService] fetchPayments error", error);
      return [];
    }
    return (data ?? []) as PaymentRow[];
  } catch (e) {
    console.error("[billingService] unexpected", e);
    return [];
  }
}

export async function fetchInvoices(workspaceId?: string): Promise<InvoiceRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("invoices").select("*").eq("workspace_id", workspaceId).order("issued_at", { ascending: false });
    if (error) {
      console.error("[billingService] fetchInvoices error", error);
      return [];
    }
    return (data ?? []) as InvoiceRow[];
  } catch (e) {
    console.error("[billingService] unexpected", e);
    return [];
  }
}

export async function upgradePlan(workspaceId: string | undefined, planId: string) {
  // TODO: server-side flow - placeholder
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("subscriptions").insert({ workspace_id: workspaceId, plan: planId }).select().maybeSingle();
    if (error) throw error;
    return data as SubscriptionRow;
  } catch (e) {
    console.error("[billingService] upgradePlan error", e);
    throw e;
  }
}

export async function cancelPlan(subscriptionId: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  try {
    const sb = getSupabase()!;
    const { data, error } = await sb.from("subscriptions").update({ status: "cancelled" }).eq("id", subscriptionId).select().maybeSingle();
    if (error) throw error;
    return data as SubscriptionRow;
  } catch (e) {
    console.error("[billingService] cancelPlan error", e);
    throw e;
  }
}

