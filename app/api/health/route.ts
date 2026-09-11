import { NextResponse } from "next/server";
import { getSupabase, getSupabaseUrl, getSupabaseKey, isSupabaseConfigured } from "@/lib/supabase";

export async function GET() {
  const configured = isSupabaseConfigured();
  const url = getSupabaseUrl();
  const key = getSupabaseKey();
  const keyKind = key.startsWith("sb_secret_") || key.includes("service_role")
    ? "secret"
    : key.startsWith("sb_publishable_") || key.startsWith("eyJ")
    ? "publishable/anon"
    : key
    ? "unknown"
    : "none";

  let connected = false;
  let error: string | null = null;
  let tables: string[] = [];

  if (configured) {
    try {
      const sb = getSupabase()!;
      const { data, error: e } = await sb.from("services").select("id").limit(1);
      if (e) {
        error = e.message;
        // table missing?
        if (e.message.toLowerCase().includes("does not exist") || e.code === "42P01") {
          error = "Tabela 'services' não existe. Rode o arquivo supabase/schema.sql no SQL Editor.";
        }
      } else {
        connected = true;
        tables.push("services");
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "erro desconhecido";
    }
  }

  return NextResponse.json({
    ok: true,
    mode: connected ? "supabase" : "localStorage",
    supabase: {
      configured,
      connected,
      urlPresent: !!url,
      keyKind,
      error,
    },
  });
}
