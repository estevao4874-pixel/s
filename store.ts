/**
 * Store compartilhado (localStorage) — cliente e admin veem a mesma agenda.
 * Depois pode trocar por Supabase sem mudar a UI.
 */

export type Service = {
  id: number;
  name: string;
  duration_minutes: number;
  price: string;
  icon: string;
  active: boolean;
};

export type Professional = {
  id: number;
  name: string;
  active: boolean;
  color: string;
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
  notes?: string;
  cancel_reason?: string;
  created_at: string;
};

export type Client = {
  id: number;
  name: string;
  whatsapp?: string;
  created_at: string;
};

type DB = {
  services: Service[];
  professionals: Professional[];
  bookings: Booking[];
  clients: Client[];
  nextId: number;
};

const KEY = "studio_janiquelen_db_v2";

const DEFAULT_SERVICES: Service[] = [
  { id: 1, name: "Corte", duration_minutes: 60, price: "R$ 90,00", icon: "✂️", active: true },
  { id: 2, name: "Escova (cabelo curto)", duration_minutes: 30, price: "R$ 45,00", icon: "💨", active: true },
  { id: 3, name: "Escova (cabelo médio)", duration_minutes: 30, price: "R$ 55,00", icon: "💨", active: true },
  { id: 4, name: "Escova (cabelo longo)", duration_minutes: 60, price: "R$ 60,00 a R$ 90,00", icon: "💨", active: true },
  { id: 5, name: "Sobrancelha", duration_minutes: 30, price: "R$ 40,00", icon: "✏️", active: true },
  { id: 6, name: "Sobrancelha + Buço", duration_minutes: 30, price: "R$ 55,00", icon: "✨", active: true },
  { id: 7, name: "Buço", duration_minutes: 15, price: "R$ 15,00", icon: "🤍", active: true },
  { id: 8, name: "Coloração (1 tubo)", duration_minutes: 90, price: "R$ 150,00", icon: "🎨", active: true },
  { id: 9, name: "Tonalizante", duration_minutes: 90, price: "R$ 150,00", icon: "🎨", active: true },
  { id: 10, name: "Coconut", duration_minutes: 180, price: "R$ 100,00 a R$ 250,00", icon: "🥥", active: true },
];

const DEFAULT_PROS: Professional[] = [
  { id: 1, name: "Janiquelen Alves", active: true, color: "#EC4899" },
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

function emptyDb(): DB {
  return {
    services: DEFAULT_SERVICES,
    professionals: DEFAULT_PROS,
    bookings: [],
    clients: [],
    nextId: 100,
  };
}

export function loadDb(): DB {
  if (typeof window === "undefined") return emptyDb();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const db = emptyDb();
      localStorage.setItem(KEY, JSON.stringify(db));
      return db;
    }
    return JSON.parse(raw) as DB;
  } catch {
    return emptyDb();
  }
}

function saveDb(db: DB) {
  localStorage.setItem(KEY, JSON.stringify(db));
  window.dispatchEvent(new Event("studio-db-changed"));
}

function nextId(db: DB) {
  const id = db.nextId;
  db.nextId = id + 1;
  return id;
}

export function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function toTime(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function isOpenDay(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return BUSINESS_HOURS[d.getDay()]?.open === true;
}

export function getOpenDates(days = 60): string[] {
  const out: string[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const ds = d.toISOString().slice(0, 10);
    if (isOpenDay(ds)) out.push(ds);
  }
  return out;
}

export function getAvailableSlots(
  dateStr: string,
  durationMin: number,
  professionalId: number,
  excludeBookingId?: number
): string[] {
  const d = new Date(dateStr + "T12:00:00");
  const hours = BUSINESS_HOURS[d.getDay()];
  if (!hours?.open || !hours.openTime || !hours.closeTime) return [];

  const open = toMin(hours.openTime);
  const close = toMin(hours.closeTime);
  const bs = hours.breakStart ? toMin(hours.breakStart) : null;
  const be = hours.breakEnd ? toMin(hours.breakEnd) : null;

  const db = loadDb();
  const busy = db.bookings.filter(
    (b) =>
      b.status === "confirmed" &&
      b.date === dateStr &&
      b.professional_id === professionalId &&
      b.id !== excludeBookingId
  );

  const today = new Date().toISOString().slice(0, 10);
  const nowMin =
    dateStr === today ? new Date().getHours() * 60 + new Date().getMinutes() : -1;

  const slots: string[] = [];
  for (let t = open; t + durationMin <= close; t += 30) {
    const end = t + durationMin;
    if (dateStr === today && t < nowMin) continue;
    if (bs !== null && be !== null && t < be && end > bs) continue;
    const conflict = busy.some((b) => {
      const b0 = toMin(b.start_time);
      const b1 = toMin(b.end_time);
      return t < b1 && b0 < end;
    });
    if (!conflict) slots.push(toTime(t));
  }
  return slots;
}

export function createBooking(input: {
  client_name: string;
  client_whatsapp?: string;
  service_id: number;
  professional_id: number;
  date: string;
  start_time: string;
  notes?: string;
}): { ok: true; booking: Booking } | { ok: false; error: string } {
  const db = loadDb();
  const service = db.services.find((s) => s.id === input.service_id && s.active);
  const pro = db.professionals.find((p) => p.id === input.professional_id && p.active);
  if (!service) return { ok: false, error: "Serviço inválido." };
  if (!pro) return { ok: false, error: "Profissional inválida." };
  if (!input.client_name.trim()) return { ok: false, error: "Digite o nome da cliente." };

  const slots = getAvailableSlots(
    input.date,
    service.duration_minutes,
    input.professional_id
  );
  if (!slots.includes(input.start_time)) {
    return { ok: false, error: "Esse horário acabou de ser reservado. Escolha outro." };
  }

  const end = toTime(toMin(input.start_time) + service.duration_minutes);

  // client upsert
  let client = db.clients.find(
    (c) =>
      (input.client_whatsapp && c.whatsapp === input.client_whatsapp) ||
      c.name.toLowerCase() === input.client_name.trim().toLowerCase()
  );
  if (!client) {
    client = {
      id: nextId(db),
      name: input.client_name.trim(),
      whatsapp: input.client_whatsapp,
      created_at: new Date().toISOString(),
    };
    db.clients.push(client);
  } else {
    client.name = input.client_name.trim();
    if (input.client_whatsapp) client.whatsapp = input.client_whatsapp;
  }

  const booking: Booking = {
    id: nextId(db),
    client_name: input.client_name.trim(),
    client_whatsapp: input.client_whatsapp,
    service_id: service.id,
    service_name: service.name,
    service_price: service.price,
    professional_id: pro.id,
    professional_name: pro.name,
    date: input.date,
    start_time: input.start_time,
    end_time: end,
    duration_minutes: service.duration_minutes,
    status: "confirmed",
    notes: input.notes,
    created_at: new Date().toISOString(),
  };
  db.bookings.push(booking);
  saveDb(db);
  return { ok: true, booking };
}

export function cancelBooking(id: number, reason?: string) {
  const db = loadDb();
  const b = db.bookings.find((x) => x.id === id);
  if (!b) return false;
  b.status = "cancelled";
  b.cancel_reason = reason;
  saveDb(db);
  return true;
}

export function updateService(id: number, data: Partial<Service>) {
  const db = loadDb();
  const s = db.services.find((x) => x.id === id);
  if (!s) return;
  Object.assign(s, data);
  saveDb(db);
}

export function addService(data: Omit<Service, "id">) {
  const db = loadDb();
  const s = { ...data, id: nextId(db) };
  db.services.push(s);
  saveDb(db);
  return s;
}

export function setProfessionalActive(id: number, active: boolean) {
  const db = loadDb();
  const p = db.professionals.find((x) => x.id === id);
  if (!p) return;
  p.active = active;
  saveDb(db);
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

export function parsePrice(price: string): number {
  const n = price.replace(/[^\d,]/g, "").replace(",", ".");
  return parseFloat(n) || 0;
}
