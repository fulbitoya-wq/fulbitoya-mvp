import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseBrowserConfig(): { url: string; anon: string } {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
    anon: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
  };
}

export function getSupabase(url?: string, anon?: string): SupabaseClient | null {
  const u = (url ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const a = (anon ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  if (!u || !a) return null;
  return createClient(u, a);
}

