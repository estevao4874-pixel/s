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
  const serviceId = searchParams.get("serviceId");
  const professionalId = searchParams.get("professionalId");

  if (!date || !serviceId || !professionalId) {
    return NextResponse.json({ error: "date, serviceId e professionalId obrigatórios" }, { status: 400 });
  }

  const { data: service } = await sb.from("services").select("*").eq("id", serviceId).single();
  if (!service) return NextResponse.json({ error: "Serviço não encontrado" }, { status: 404 });

  const d = new Date(date + "T12:00:00");
  const day = d.getDay();

  const { data: hours } = await sb.from("business_hours").select("*").eq("day_of_week", day).maybeSingle();
  if (!hours || !hours.is_open) {
    return NextResponse.json({ available: false, slots: [], reason: "Salão fechado" });
  }

  // bloqueios
  const { data: blocks } = await sb
    .from("blocked_slots")
    .select("*")
    .eq("date", date)
    .or(`professional_id.is.null,professional_id.eq.${professionalId}`);

  if (blocks?.some((b) => !b.start_time)) {
    return NextResponse.json({ available: false, slots: [], reason: "Data bloqueada" });
  }

  const duration = service.duration_minutes + (service.buffer_minutes || 0);
  const open = toMin(hours.open_time);
  const close = toMin(hours.close_time);
  const bs = hours.break_start ? toMin(hours.break_start) : null;
  const be = hours.break_end ? toMin(hours.break_end) : null;

  const { data: bookings } = await sb
    .from("bookings")
    .select("*")
    .eq("date", date)
    .eq("professional_id", professionalId)
    .eq("status", "confirmed");

  const today = new Date().toISOString().slice(0, 10);
  const nowMin = date === today ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  const slots: string[] = [];
  for (let t = open; t + duration <= close; t += 30) {
    const end = t + duration;
    if (date === today && t < nowMin) continue;
    if (bs !== null && be !== null && t < be && end > bs) continue;

    // bloqueios parciais
    const blocked = (blocks || []).some((b) => {
      if (!b.start_time || !b.end_time) return false;
      return t < toMin(b.end_time) && toMin(b.start_time) < end;
    });
    if (blocked) continue;

    const conflict = (bookings || []).some((b) => {
      return t < toMin(b.end_time) && toMin(b.start_time) < end;
    });
    if (!conflict) slots.push(toTime(t));
  }

  return NextResponse.json({ available: slots.length > 0, slots });
}
