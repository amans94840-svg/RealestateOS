export interface LeadRow {
  id: string;
  workspace_id?: string;
  owner_id?: string;
  full_name: string;
  email?: string;
  full_phone_number?: string;
  phone?: string;
  budget_range?: string;
  property_type?: string;
  buyer_type?: string;
  lead_source?: string;
  assigned_broker?: string;
  lead_score?: number;
  urgency?: string;
  verified?: boolean;
  recommended_action?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

