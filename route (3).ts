import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET() {
  const sb = getSupabase();
  if (!sb) return NextResponse.json({ error: "Supabase não configurado" }, { status: 500 });

  const today = new Date().toISOString().slice(0, 10);

  const { data: todayBookings } = await sb
    .from("bookings")
    .select("*")
    .eq("date", today)
    .eq("status", "confirmed")
    .order("start_time");

  const { count: clientCount } = await sb.from("clients").select("*", { count: "exact", head: true });

  const revenue = (todayBookings || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);

  return NextResponse.json({
    todayCount: todayBookings?.length || 0,
    revenue,
    clientCount: clientCount || 0,
    nextTime: todayBookings?.[0]?.start_time || null,
    todayBookings: todayBookings || [],
  });
}
