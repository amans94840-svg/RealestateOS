export interface SubscriptionRow {
  id: string;
  workspace_id?: string;
  plan?: string;
  billing_cycle?: string;
  seat_limit?: number;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface PaymentRow {
  id: string;
  workspace_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  created_at?: string;
}

export interface InvoiceRow {
  id: string;
  workspace_id?: string;
  invoice_number?: string;
  amount?: number;
  currency?: string;
  status?: string;
  issued_at?: string;
}

