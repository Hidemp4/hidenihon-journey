import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim();

function hasValidSupabaseConfig(url?: string, key?: string) {
  return Boolean(
    url?.startsWith("https://") &&
      url.includes(".supabase.co") &&
      key &&
      key !== "SUA_CHAVE_PUBLICA"
  );
}

export const isSupabaseConfigured = hasValidSupabaseConfig(supabaseUrl, supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.");
  }
  return supabase;
}
