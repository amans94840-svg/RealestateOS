import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;
let initError: string | null = null;

function isValidSupabaseUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url.startsWith("https://")) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return isValidSupabaseUrl(url) && typeof key === "string" && key.length > 20;
}

export function getSupabaseInitError(): string | null {
  return initError;
}

/** Single browser client; returns null when env vars are missing or invalid. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (browserClient) return browserClient;
  try {
    browserClient = createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
        },
      },
    );
    initError = null;
  } catch (e) {
    initError = e instanceof Error ? e.message : String(e);
    browserClient = null;
  }
  return browserClient;
}
