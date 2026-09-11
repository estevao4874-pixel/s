import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  const professionalId = searchParams.get("professionalId");

  let q = sb.from("bookings").select("*").eq("status", "confirmed").order("start_time");
  if (date) q = q.eq("date", date);
  if (professionalId) q = q.eq("professional_id", professionalId);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // enrich with names
  const { data: services } = await sb.from("services").select("id, name, price, price_label");
  const { data: pros } = await sb.from("professionals").select("id, name");
  const sm = Object.fromEntries((services || []).map((s) => [s.id, s]));
  const pm = Object.fromEntries((pros || []).map((p) => [p.id, p]));

  const enriched = (data || []).map((b) => ({
    ...b,
    service_name: sm[b.service_id]?.name || "",
    service_price:
      sm[b.service_id]?.price_label ||
      (sm[b.service_id] ? `R$ ${Number(sm[b.service_id].price).toFixed(2).replace(".", ",")}` : ""),
    professional_name: pm[b.professional_id]?.name || "",
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });

  const body = await req.json();
  const {
    client_name,
    client_whatsapp,
    service_id,
    professional_id,
    date,
    start_time,
    notes,
    source = "client",
  } = body;

  if (!client_name?.trim() || !service_id || !professional_id || !date || !start_time) {
    return NextResponse.json({ error: "Dados incompletos" }, { status: 400 });
  }

  const { data: service } = await sb.from("services").select("*").eq("id", service_id).single();
  if (!service || !service.active) {
    return NextResponse.json({ error: "Serviço inválido" }, { status: 400 });
  }

  const { data: pro } = await sb.from("professionals").select("*").eq("id", professional_id).single();
  if (!pro || !pro.active) {
    return NextResponse.json({ error: "Profissional inválida" }, { status: 400 });
  }

  const duration = service.duration_minutes;
  const end_time = toTime(toMin(start_time) + duration);

  // double-check conflito
  const { data: existing } = await sb
    .from("bookings")
    .select("*")
    .eq("date", date)
    .eq("professional_id", professional_id)
    .eq("status", "confirmed");

  const start = toMin(start_time);
  const end = toMin(end_time);
  const conflict = (existing || []).some((b) => start < toMin(b.end_time) && toMin(b.start_time) < end);
  if (conflict) {
    return NextResponse.json({ error: "Esse horário acabou de ser reservado. Escolha outro." }, { status: 409 });
  }

  // cliente
  let client_id: number | null = null;
  if (client_whatsapp) {
    const { data: found } = await sb.from("clients").select("*").eq("whatsapp", client_whatsapp).maybeSingle();
    if (found) {
      client_id = found.id;
      await sb.from("clients").update({ name: client_name.trim(), updated_at: new Date().toISOString() }).eq("id", found.id);
    }
  }
  if (!client_id) {
    const { data: created } = await sb
      .from("clients")
      .insert({ name: client_name.trim(), whatsapp: client_whatsapp || null })
      .select()
      .single();
    client_id = created?.id ?? null;
  }

  const amount = Number(service.price) || 0;

  const { data: booking, error } = await sb
    .from("bookings")
    .insert({
      client_id,
      client_name: client_name.trim(),
      client_whatsapp: client_whatsapp || null,
      service_id,
      professional_id,
      date,
      start_time,
      end_time,
      duration_minutes: duration,
      status: "confirmed",
      notes: notes || null,
      amount,
      payment_status: "pending",
      source,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({
    success: true,
    booking: {
      ...booking,
      service_name: service.name,
      service_price: service.price_label || `R$ ${Number(service.price).toFixed(2).replace(".", ",")}`,
      professional_name: pro.name,
    },
  }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const reason = searchParams.get("reason");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  const { data, error } = await sb
    .from("bookings")
    .update({
      status: "cancelled",
      cancel_reason: reason || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, booking: data });
}
