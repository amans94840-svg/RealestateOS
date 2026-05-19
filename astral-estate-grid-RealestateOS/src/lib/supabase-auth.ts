/**
 * Supabase auth helpers. OAuth uses hosted redirect; email uses signUp / signInWithPassword.
 * Profiles: upsert into `public.profiles` after signup — apply migration in Supabase SQL editor:
 *
 * create table if not exists public.profiles (
 *   id uuid primary key references auth.users on delete cascade,
 *   full_name text,
 *   company_name text,
 *   role text,
 *   updated_at timestamptz default now()
 * );
 * alter table public.profiles enable row level security;
 * create policy "Users can upsert own profile" on public.profiles for all using (auth.uid() = id);
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "./supabase-client";

export type ProfileRow = {
  full_name: string | null;
  company_name: string | null;
  workspace_id?: string | null;
  role: string | null;
};

function redirectUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/`;
}

export function assertSupabaseConfigured(): void {
  if (!isSupabaseConfigured()) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
}

export async function signInWithOAuthProvider(provider: "google" | "github" | "apple"): Promise<void> {
  assertSupabaseConfigured();
  const sb = getSupabase()!;
  const { error, data } = await sb.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: redirectUrl(),
    },
  });
  if (error) throw error;
  if (data?.url) {
    window.location.assign(data.url);
  }
}

export async function signInWithEmailPassword(email: string, password: string) {
  assertSupabaseConfigured();
  const sb = getSupabase()!;
  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(params: {
  email: string;
  password: string;
  fullName: string;
  company: string;
  role: string;
}) {
  assertSupabaseConfigured();
  const sb = getSupabase()!;
  const { data, error } = await sb.auth.signUp({
    email: params.email.trim(),
    password: params.password,
    options: {
      emailRedirectTo: redirectUrl(),
      data: {
        full_name: params.fullName.trim(),
        company: params.company.trim(),
        role: params.role,
      },
    },
  });
  if (error) throw error;
  if (data.user) {
    await upsertUserProfile(sb, data.user.id, {
      full_name: params.fullName.trim(),
      company_name: params.company.trim(),
      role: params.role,
    });
  }
  return data;
}

export async function sendPasswordResetEmail(email: string) {
  assertSupabaseConfigured();
  const sb = getSupabase()!;
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: redirectUrl(),
  });
  if (error) throw error;
}

export async function upsertUserProfile(
  sb: SupabaseClient,
  userId: string,
  row: { full_name: string; company_name: string; role: string },
): Promise<{ ok: boolean; message?: string }> {
  const { error } = await sb.from("profiles").upsert(
    {
      id: userId,
      full_name: row.full_name,
      company_name: row.company_name,
      role: row.role,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) {
    return { ok: false, message: error.message };
  }
  return { ok: true };
}

export async function fetchUserProfile(sb: SupabaseClient, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("full_name, company_name, role, workspace_id")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProfileRow;
}
