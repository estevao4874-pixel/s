import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  const all = new URL(req.url).searchParams.get("all") === "1";
  let q = sb.from("professionals").select("*").order("id");
  if (!all) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  const body = await req.json();
  const { id, active, name } = body;
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (typeof active === "boolean") updates.active = active;
  if (name) updates.name = name;

  const { data, error } = await sb.from("professionals").update(updates).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { data, error } = await sb
    .from("professionals")
    .update({ active: false })
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, professional: data });
}
