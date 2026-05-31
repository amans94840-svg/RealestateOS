import { getSupabase, isSupabaseConfigured } from "./supabase-client";
import * as leadsService from "@/services/leadsService";

export type LeadRow = {
  id: string;
  workspace_id?: string;
  owner_id?: string;
  name: string;
  phone?: string;
  email?: string;
  country?: string;
  city?: string;
  budget?: string;
  property_type?: string;
  buyer_type?: string;
  urgency?: string;
  source?: string;
  verified?: boolean;
  ai_score?: number;
  recommended_action?: string;
  created_at?: string;
  updated_at?: string;
};

// Fetch leads for a workspace (optionally filtered by owner/user id)
export async function fetchLeads(workspaceId?: string, ownerId?: string): Promise<LeadRow[]> {
  // #region agent log
  fetch('http://127.0.0.1:7615/ingest/fd1a74b4-c397-45f6-9718-7b61c882f570',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'06225e'},body:JSON.stringify({sessionId:'06225e',location:'src/lib/leads-api.ts:fetchLeads',message:'fetchLeads called',data:{workspaceId,ownerId},timestamp:Date.now(),hypothesisId:'H1',runId:'pre-fix'})}).catch(()=>{});
  // #endregion
  if (!isSupabaseConfigured()) {
    return [];
  }
  const sb = getSupabase()!;
  // Delegate to leadsService which centralizes Supabase access and realtime
  const data = await leadsService.fetchLeads(workspaceId);
  console.log("[leads-api] fetched", (data ?? []).length, "rows for workspace", workspaceId);
  return data;
}

export async function createLead(workspaceId: string | undefined, ownerId: string | undefined, lead: Partial<LeadRow>) {
  if (!isSupabaseConfigured()) {
    // return a mock created row id
    return { id: `lead_${Date.now()}`, workspace_id: workspaceId, owner_id: ownerId, ...lead, created_at: new Date().toISOString() } as LeadRow;
  }
  const sb = getSupabase()!;
  const payload = { workspace_id: workspaceId, owner_id: ownerId, ...lead };
  const { data, error } = await sb.from("leads").insert(payload).select().maybeSingle();
  if (error) throw error;
  return data as LeadRow;
}

export async function updateLeadRow(leadId: string, patch: Partial<LeadRow>) {
  if (!isSupabaseConfigured()) {
    return { id: leadId, ...patch } as LeadRow;
  }
  const sb = getSupabase()!;
  const { data, error } = await sb.from("leads").update(patch).eq("id", leadId).select().maybeSingle();
  if (error) throw error;
  return data as LeadRow;
}

export async function deleteLeadRow(leadId: string) {
  if (!isSupabaseConfigured()) {
    return { ok: true };
  }
  const sb = getSupabase()!;
  const { error } = await sb.from("leads").delete().eq("id", leadId);
  if (error) throw error;
  return { ok: true };
}

// Subscribe to realtime changes on leads for a workspace
export function subscribeToLeads(workspaceId: string | undefined, cb: (payload: { event: string; new?: LeadRow; old?: LeadRow }) => void) {
  if (!isSupabaseConfigured()) {
    // no-op fallback: return unsubscribe
    const id = setInterval(() => {}, 60000);
    return () => clearInterval(id);
  }
  const sb = getSupabase()!;
  const chan = sb.channel(`public:leads:workspace_${workspaceId}`);
  chan.on(
    "postgres_changes",
    { event: "*", schema: "public", table: "leads", filter: `workspace_id=eq.${workspaceId}` },
    (payload) => {
      try {
        cb({ event: payload.eventType, new: payload.new as LeadRow, old: payload.old as LeadRow });
      } catch (e) {
        console.error("subscribeToLeads mapping error", e);
      }
    },
  );
  void chan.subscribe();
  return () => chan.unsubscribe();
}

