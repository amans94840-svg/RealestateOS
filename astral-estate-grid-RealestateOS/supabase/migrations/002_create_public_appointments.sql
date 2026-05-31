BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,

  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,

  property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL,

  appointment_type text,
  appointment_status text DEFAULT 'scheduled',

  lead_name text,
  lead_phone text,
  lead_email text,

  meeting_date date,
  meeting_time text,

  location text,

  assigned_broker text,

  notes text,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_workspace_id ON public.appointments (workspace_id);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON public.appointments (lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_property_id ON public.appointments (property_id);
CREATE INDEX IF NOT EXISTS idx_appointments_created_at ON public.appointments (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_meeting_date ON public.appointments (meeting_date);

CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_updated_at ON public.appointments;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

COMMIT;
