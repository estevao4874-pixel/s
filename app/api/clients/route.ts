import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });

  const q = new URL(req.url).searchParams.get("q") || "";
  let query = sb.from("clients").select("*").order("created_at", { ascending: false }).limit(200);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const filtered = q
    ? (data || []).filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q.toLowerCase()) ||
          (c.whatsapp || "").includes(q)
      )
    : data || [];

  return NextResponse.json(filtered);
}
