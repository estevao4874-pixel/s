export type Service = {
  id: number;
  name: string;
  duration_minutes: number;
  price: string;
  icon: string;
};

export type Professional = {
  id: number;
  name: string;
  photo?: string;
};

export type Booking = {
  id: number;
  client_name: string;
  client_whatsapp?: string;
  service_id: number;
  service_name: string;
  service_price: string;
  professional_id: number;
  professional_name: string;
  date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  status: "confirmed" | "cancelled";
};

export const SERVICES: Service[] = [
  { id: 1, name: "Corte", duration_minutes: 60, price: "R$ 90,00", icon: "✂️" },
  { id: 2, name: "Escova (cabelo curto)", duration_minutes: 30, price: "R$ 45,00", icon: "💨" },
  { id: 3, name: "Escova (cabelo médio)", duration_minutes: 30, price: "R$ 55,00", icon: "💨" },
  { id: 4, name: "Escova (cabelo longo)", duration_minutes: 60, price: "R$ 60,00 a R$ 90,00", icon: "💨" },
  { id: 5, name: "Sobrancelha", duration_minutes: 30, price: "R$ 40,00", icon: "✏️" },
  { id: 6, name: "Sobrancelha + Buço", duration_minutes: 30, price: "R$ 55,00", icon: "✨" },
  { id: 7, name: "Buço", duration_minutes: 15, price: "R$ 15,00", icon: "🤍" },
  { id: 8, name: "Coloração (1 tubo)", duration_minutes: 90, price: "R$ 150,00", icon: "🎨" },
  { id: 9, name: "Tonalizante", duration_minutes: 90, price: "R$ 150,00", icon: "🎨" },
  { id: 10, name: "Coconut", duration_minutes: 180, price: "R$ 100,00 a R$ 250,00", icon: "🥥" },
];

export const PROFESSIONALS: Professional[] = [
  { id: 1, name: "Janiquelen Alves", photo: "/images/pro.jpg" },
];

/** 0=Dom ... 6=Sáb */
export const BUSINESS_HOURS: Record<
  number,
  { open: boolean; openTime?: string; closeTime?: string; breakStart?: string; breakEnd?: string }
> = {
  0: { open: false },
  1: { open: false },
  2: { open: true, openTime: "13:00", closeTime: "17:00" },
  3: { open: true, openTime: "08:00", closeTime: "17:00", breakStart: "11:00", breakEnd: "13:00" },
  4: { open: true, openTime: "08:00", closeTime: "17:00", breakStart: "11:00", breakEnd: "13:00" },
  5: { open: true, openTime: "08:00", closeTime: "17:00", breakStart: "11:00", breakEnd: "13:00" },
  6: { open: true, openTime: "08:00", closeTime: "17:00", breakStart: "11:00", breakEnd: "13:00" },
};

export const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function toTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Mock occupied slots by date (demo conflict) */
const MOCK_BUSY: Record<string, { start: string; end: string }[]> = {};

export function isOpenDay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  return BUSINESS_HOURS[day]?.open === true;
}

export function getAvailableSlots(dateStr: string, durationMin: number): string[] {
  const d = new Date(dateStr + "T12:00:00");
  const hours = BUSINESS_HOURS[d.getDay()];
  if (!hours?.open || !hours.openTime || !hours.closeTime) return [];

  const open = toMin(hours.openTime);
  const close = toMin(hours.closeTime);
  const bs = hours.breakStart ? toMin(hours.breakStart) : null;
  const be = hours.breakEnd ? toMin(hours.breakEnd) : null;
  const busy = MOCK_BUSY[dateStr] || [];

  const slots: string[] = [];
  for (let t = open; t + durationMin <= close; t += 30) {
    const end = t + durationMin;
    if (bs !== null && be !== null && t < be && end > bs) continue;
    const conflict = busy.some((b) => {
      const bs2 = toMin(b.start);
      const be2 = toMin(b.end);
      return t < be2 && bs2 < end;
    });
    if (!conflict) slots.push(toTime(t));
  }
  return slots;
}

export function markBusy(dateStr: string, start: string, durationMin: number) {
  const end = toTime(toMin(start) + durationMin);
  if (!MOCK_BUSY[dateStr]) MOCK_BUSY[dateStr] = [];
  MOCK_BUSY[dateStr].push({ start, end });
}

export function getOpenDates(days = 60): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const ds = `${y}-${m}-${day}`;
    if (isOpenDay(ds)) out.push(ds);
  }
  return out;
}

export function formatDateBR(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
}

export function maskWhatsapp(value: string) {
  let v = value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 6) return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
  if (v.length > 2) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length) return `(${v}`;
  return v;
}

/** Demo bookings for admin */
export let DEMO_BOOKINGS: Booking[] = [
  {
    id: 1,
    client_name: "Maria Silva",
    client_whatsapp: "(11) 98765-4321",
    service_id: 3,
    service_name: "Escova (cabelo médio)",
    service_price: "R$ 55,00",
    professional_id: 1,
    professional_name: "Janiquelen Alves",
    date: new Date().toISOString().slice(0, 10),
    start_time: "14:00",
    end_time: "14:30",
    duration_minutes: 30,
    status: "confirmed",
  },
];

export function addDemoBooking(b: Omit<Booking, "id" | "status">) {
  const id = DEMO_BOOKINGS.length ? Math.max(...DEMO_BOOKINGS.map((x) => x.id)) + 1 : 1;
  const row: Booking = { ...b, id, status: "confirmed" };
  DEMO_BOOKINGS = [...DEMO_BOOKINGS, row];
  markBusy(b.date, b.start_time, b.duration_minutes);
  return row;
}

export function cancelDemoBooking(id: number) {
  DEMO_BOOKINGS = DEMO_BOOKINGS.map((b) =>
    b.id === id ? { ...b, status: "cancelled" as const } : b
  );
}
