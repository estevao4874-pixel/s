import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

function env(...keys: string[]) {
  for (const k of keys) {
    const v = process.env[k];
    if (v && v.trim()) return v.trim();
  }
  return "";
}

export function getSupabaseUrl() {
  return env("NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL");
}

/**
 * Ordem de preferência:
 * 1) sb_secret_ / service_role JWT legítimo
 * 2) publishable / anon
 * Ignora valores com prefixo inválido (ex: sb_service_role_)
 */
export function getSupabaseKey() {
  const candidates = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ];

  for (const raw of candidates) {
    const v = (raw || "").trim();
    if (!v) continue;
    // prefixo inventado / inválido
    if (v.startsWith("sb_service_role_")) continue;
    // formatos válidos
    if (
      v.startsWith("sb_secret_") ||
      v.startsWith("sb_publishable_") ||
      v.startsWith("eyJ")
    ) {
      return v;
    }
    // fallback: qualquer outra string não vazia
    return v;
  }
  return "";
}

export function getSupabase(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  if (!url || !key) return null;

  if (!client) {
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function isSupabaseConfigured() {
  return !!(getSupabaseUrl() && getSupabaseKey());
}
