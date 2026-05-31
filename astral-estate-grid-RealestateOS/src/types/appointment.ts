export interface AppointmentRow {
  id: string;
  workspace_id?: string;
  lead_id?: string;
  property_id?: string;
  appointment_type?: string;
  appointment_status?: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  meeting_date?: string;
  meeting_time?: string;
  location?: string;
  assigned_broker?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

