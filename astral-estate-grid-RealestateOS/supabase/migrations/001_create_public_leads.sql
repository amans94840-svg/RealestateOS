/*
  Migration: Create public.leads table
  - Designed for Supabase / Postgres
  - Uses pgcrypto.gen_random_uuid() for UUID generation (installed by default on Supabase)
  - Adds sensible indexes and a trigger to maintain updated_at
  - Includes recommended RLS policy examples (commented) — adapt to your workspace/user model.

  Run this in Supabase SQL editor or include in your migration pipeline.
*/

BEGIN;

-- Ensure pgcrypto is available for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table: public.leads
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid,            -- FK to workspaces.id (optional)
  owner_id uuid,                -- user id who owns the lead (auth.uid())
  name text NOT NULL,
  phone text,
  email text,
  country text,
  city text,
  budget text,
  property_type text,
  buyer_type text,
  urgency text,
  source text,
  verified boolean DEFAULT false,
  ai_score numeric DEFAULT 0,
  recommended_action text,
  meta jsonb DEFAULT '{}'::jsonb, -- flexible metadata if needed
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for common filters
CREATE INDEX IF NOT EXISTS idx_leads_workspace_id ON public.leads (workspace_id);
CREATE INDEX IF NOT EXISTS idx_leads_owner_id ON public.leads (owner_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);

-- Full-text index suggestion for searching name / phone / city
CREATE INDEX IF NOT EXISTS idx_leads_search ON public.leads USING GIN (
  to_tsvector('simple', coalesce(name,'') || ' ' || coalesce(phone,'') || ' ' || coalesce(city,''))
);

-- Trigger function to maintain updated_at
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_updated_at ON public.leads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_set_updated_at();

/*
  Row Level Security (RLS) recommendations
  - Enable RLS and create policies that match your access model.
  - Common pattern:
      * Allow service_role (server) to bypass checks.
      * Allow authenticated users to SELECT/INSERT/UPDATE/DELETE rows where workspace_id matches
        the workspace they belong to (requires workspace claim in JWT or join via profiles).

  Example (COMMENTED — adapt to your JWT claims and workspace model):

-- Enable RLS
-- ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT leads for their workspace_id claim
-- CREATE POLICY \"select_by_workspace\" ON public.leads
--   FOR SELECT USING (
--     current_setting('jwt.claims.workspace_id', true) IS NOT NULL
--     AND workspace_id::text = current_setting('jwt.claims.workspace_id', true)
--   );

-- Allow insert only if provided workspace_id matches user's claim (or set workspace_id server-side)
-- CREATE POLICY \"insert_by_workspace\" ON public.leads
--   FOR INSERT WITH CHECK (
--     current_setting('jwt.claims.workspace_id', true) IS NOT NULL
--     AND workspace_id::text = current_setting('jwt.claims.workspace_id', true)
--   );

-- Allow update/delete similarly (restrict to same workspace)

-- Note:
-- Supabase exposes JWT claims via current_setting('jwt.claims.<claim_name>', true).
-- Alternatively, use RLS that allows auth.uid() ownership checks on owner_id.

*/

COMMIT;

