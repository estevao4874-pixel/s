"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadDb,
  createBooking,
  cancelBooking,
  updateService,
  addService,
  setProfessionalActive,
  getAvailableSlots,
  formatDateBR,
  maskWhatsapp,
  parsePrice,
  BUSINESS_HOURS,
  DAY_NAMES,
  type Booking,
  type Service,
  type Professional,
  type Client,
} from "@/lib/store";
import { Logo } from "@/components/Logo";
import { apiGet, apiPost, apiDelete, checkMode } from "@/lib/api";
import { Modal, Field, inputClass } from "@/components/Modal";
import { AssistantChat } from "@/components/AssistantChat";

type Page = "dashboard" | "agenda" | "clients" | "services" | "professionals" | "hours";

const HOUR_START = 8;
const HOUR_END = 19;
const ROW_H = 36; // 30 min

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("dashboard");
  const [pass, setPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [proFilter, setProFilter] = useState<number | "all">("all");
  const [tick, setTick] = useState(0);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [mode, setMode] = useState<"supabase" | "localStorage">("localStorage");
  const [remoteBookings, setRemoteBookings] = useState<Booking[] | null>(null);
  const [remoteServices, setRemoteServices] = useState<Service[] | null>(null);
  const [remotePros, setRemotePros] = useState<Professional[] | null>(null);
  const [dash, setDash] = useState<{ todayCount: number; revenue: number; clientCount: number; nextTime: string | null; todayBookings: Booking[] } | null>(null);

  const db = useMemo(() => loadDb(), [tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    checkMode().then(async (m) => {
      setMode(m);
      if (m !== "supabase") return;
      setLoadingAgenda(true);
      try {
        const [svcs, pros, books] = await Promise.all([
          apiGet<any[]>("/api/services"),
          apiGet<any[]>("/api/professionals?all=1"),
          apiGet<any[]>(`/api/bookings?date=${date}`),
        ]);
        setRemoteServices(svcs.map((s: any) => ({
          id: s.id, name: s.name, duration_minutes: s.duration_minutes,
          price: s.price_label || `R$ ${Number(s.price).toFixed(2).replace(".", ",")}`,
          icon: s.icon || "✨", active: s.active !== false,
        })));
        setRemotePros(pros.map((p: any) => ({
          id: p.id, name: p.name, active: p.active !== false, color: p.color || "#EC4899",
        })));
        setRemoteBookings(books.map((b: any) => ({
          ...b,
          service_name: b.service_name || "",
          service_price: b.service_price || String(b.amount || ""),
          professional_name: b.professional_name || "",
        })));
        const d = await apiGet<any>("/api/dashboard");
        setDash(d);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingAgenda(false);
      }
    });
  }, [tick, date]);

  useEffect(() => {
    const sync = () => refresh();
    window.addEventListener("studio-db-changed", sync);
    window.addEventListener("storage", sync);
    const t = localStorage.getItem("admin_token");
    if (t || sessionStorage.getItem("admin_unlocked") === "1") {
      localStorage.setItem("admin_token", "demo");
      setToken("demo");
    }
    return () => {
      window.removeEventListener("studio-db-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, [refresh]);

  // Booking modal
  const [bookOpen, setBookOpen] = useState(false);
  const [bookPrefill, setBookPrefill] = useState<{ time?: string; proId?: number }>({});
  // Event detail modal
  const [eventOpen, setEventOpen] = useState(false);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  // Service modal
  const [svcOpen, setSvcOpen] = useState(false);
  const [editingSvc, setEditingSvc] = useState<Service | null>(null);

  function login() {
    if (pass === "9415") {
      localStorage.setItem("admin_token", "demo");
      sessionStorage.setItem("admin_unlocked", "1");
      setToken("demo");
      setLoginErr("");
    } else {
      setLoginErr("Senha incorreta");
    }
  }

  function logout() {
    localStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_unlocked");
    setToken(null);
  }

  const today = new Date().toISOString().slice(0, 10);
  const allBookings = remoteBookings ?? db.bookings;
  const allServices = remoteServices ?? db.services;
  const allPros = remotePros ?? db.professionals;
  const todayBookings = mode === "supabase" && dash
    ? (dash.todayBookings || [])
    : allBookings.filter((b) => b.date === today && b.status === "confirmed");
  const revenue = mode === "supabase" && dash
    ? dash.revenue
    : todayBookings.reduce((s, b) => s + parsePrice(b.service_price), 0);
  const dayBookings = allBookings
    .filter(
      (b) =>
        b.date === date &&
        b.status === "confirmed" &&
        (proFilter === "all" || b.professional_id === proFilter)
    )
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const activePros = allPros.filter((p) => p.active);

  if (!token) {
    return (
      <div className="min-h-screen grid place-items-center bg-gradient-to-br from-[#DB2777] to-[#6a1b3a] p-5">
        <div className="w-full max-w-sm bg-white rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-2"><Logo /></div>
          <p className="text-center text-sm text-ink-muted mb-5">Área restrita</p>
          {loginErr && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-xl mb-3 border border-red-100">
              {loginErr}
            </div>
          )}
          <Field label="Senha">
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
              className={inputClass}
              placeholder="Digite a senha"
              autoFocus
            />
          </Field>
          <button onClick={login} className="w-full bg-primary text-white font-semibold py-3 rounded-xl mt-2 shadow-btn">
            Entrar
          </button>
        </div>
      </div>
    );
  }

  const nav: { id: Page; label: string; icon: string }[] = [
    { id: "dashboard", label: "Dashboard", icon: "📊" },
    { id: "agenda", label: "Agenda", icon: "📅" },
    { id: "clients", label: "Clientes", icon: "👥" },
    { id: "services", label: "Serviços", icon: "✂️" },
    { id: "professionals", label: "Profissionais", icon: "👩‍🦰" },
    { id: "hours", label: "Horários", icon: "🕐" },
  ];

  function openNewAt(time?: string, proId?: number) {
    setBookPrefill({ time, proId: proId ?? (typeof proFilter === "number" ? proFilter : activePros[0]?.id) });
    setBookOpen(true);
  }

  function openEvent(b: Booking) {
    setSelected(b);
    setCancelReason("");
    setEventOpen(true);
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#faf7f9]">
      <aside className="md:w-[240px] bg-[#2d1a32] text-white flex flex-col shrink-0">
        <div className="p-5 border-b border-white/10 font-script text-[22px] flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-mid to-primary grid place-items-center text-xs">✦</span>
          Janiquelen
        </div>
        <nav className="flex-1 p-2.5 space-y-0.5">
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex gap-2 items-center transition ${
                page === n.id ? "bg-white/15 text-white" : "text-white/65 hover:bg-white/10"
              }`}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
        </nav>
        <div className="p-3 border-t border-white/10 text-xs text-white/50 space-y-1">
          <button onClick={logout} className="block hover:text-white">Sair</button>
          <a href="/" className="block hover:text-white">← Ver site</a>
        </div>
      </aside>

      <main className="flex-1 p-4 md:p-7 overflow-auto">
        {/* DASHBOARD */}
        {page === "dashboard" && (
          <>
            <h1 className="text-2xl font-bold text-ink mb-5">Dashboard</h1>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6 stagger">
              {[
                { label: "Atendimentos hoje", value: String(mode === "supabase" && dash ? dash.todayCount : todayBookings.length), icon: "💅" },
                { label: "Faturamento estimado", value: `R$ ${revenue.toFixed(0)}`, icon: "💰" },
                { label: "Clientes cadastrados", value: String(mode === "supabase" && dash ? dash.clientCount : db.clients.length), icon: "👥" },
                { label: "Próximos hoje", value: todayBookings.slice(0, 1)[0]?.start_time || "—", icon: "🕐" },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-primary-border/60 p-4 shadow-card card-hover">
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="text-2xl font-bold text-ink">{c.value}</div>
                  <div className="text-xs text-ink-muted mt-1">{c.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-primary-border/60 p-4 shadow-card">
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-ink">Agenda de hoje</h2>
                <button onClick={() => setPage("agenda")} className="text-sm text-primary font-semibold">
                  Ver agenda →
                </button>
              </div>
              {todayBookings.length === 0 ? (
                <p className="text-ink-muted text-sm py-6 text-center">Nenhum atendimento hoje.</p>
              ) : (
                <div className="space-y-2">
                  {todayBookings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => { setDate(today); setPage("agenda"); openEvent(b); }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-primary-border hover:bg-primary-soft text-left"
                    >
                      <span className="font-bold text-primary w-14">{b.start_time}</span>
                      <span className="flex-1">
                        <span className="font-semibold text-ink block">{b.client_name}</span>
                        <span className="text-xs text-ink-muted">{b.service_name} · {b.professional_name}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* AGENDA — Google style, clickable */}
        {page === "agenda" && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h1 className="text-2xl font-bold text-ink">Agenda</h1>
              <div className="flex gap-2 items-center flex-wrap">
                <button type="button" onClick={() => shiftDate(date, -1, setDate)} className="nav-btn">‹</button>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-2 border-primary-border rounded-xl px-3 py-2 text-sm" />
                <button type="button" onClick={() => shiftDate(date, 1, setDate)} className="nav-btn">›</button>
                <button type="button" onClick={() => setDate(today)} className="px-3 py-2 rounded-xl border-2 border-primary-border bg-white text-sm font-semibold">
                  Hoje
                </button>
                <button onClick={() => openNewAt()} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-btn">
                  ＋ Novo
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3 items-center">
              <button
                type="button"
                onClick={() => { setLoadingAgenda(true); refresh(); }}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-primary-border bg-white text-ink flex items-center gap-1.5"
                disabled={loadingAgenda}
              >
                <span className={loadingAgenda ? "inline-block animate-spin" : ""}>↻</span>
                {loadingAgenda ? "Atualizando..." : "Atualizar agenda"}
              </button>
              {activePros.length > 1 && activePros.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setProFilter(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 ${
                    proFilter === p.id ? "text-white border-transparent" : "border-primary-border bg-white text-ink"
                  }`}
                  style={proFilter === p.id ? { background: p.color, borderColor: p.color } : undefined}
                >
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>

            <p className="text-sm text-ink-muted mb-2 capitalize">{formatDateBR(date)}</p>
            <p className="text-xs text-ink-muted mb-3">Clique em um horário vazio para agendar · clique em um evento para ver/cancelar</p>

            {/* Atalho grande */}
            <button
              type="button"
              onClick={() => openNewAt()}
              className="w-full mb-4 min-h-[52px] rounded-2xl bg-primary text-white font-bold text-base shadow-btn flex items-center justify-center gap-2 btn-press animate-pulse-soft"
            >
              ＋ Colocar cliente na agenda
            </button>

            <div className="bg-white rounded-2xl shadow-card border border-primary-border/50 overflow-x-auto">
              <div
                className="min-w-[480px] grid"
                style={{
                  gridTemplateColumns: `56px repeat(${proFilter === "all" ? activePros.length : 1}, minmax(160px, 1fr))`,
                }}
              >
                {/* header */}
                <div className="p-2 border-b border-r bg-primary-soft/40 text-[10px] text-ink-muted font-semibold" />
                {(proFilter === "all" ? activePros : activePros.filter((p) => p.id === proFilter)).map((p) => (
                  <div key={p.id} className="p-2 border-b text-center text-xs font-bold text-ink bg-primary-soft/40" style={{ borderBottomColor: p.color }}>
                    <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: p.color }} />
                    {p.name}
                  </div>
                ))}

                {/* time rows */}
                {Array.from({ length: HOUR_END - HOUR_START }, (_, i) => {
                  const hour = HOUR_START + i;
                  const label = `${String(hour).padStart(2, "0")}:00`;
                  const prosCol = proFilter === "all" ? activePros : activePros.filter((p) => p.id === proFilter);
                  return (
                    <div key={label} className="contents">
                      <div className="border-b border-r text-[10px] text-ink-muted text-right pr-2 pt-1" style={{ height: ROW_H }}>
                        {label}
                      </div>
                      {prosCol.map((p) => (
                        <div
                          key={p.id}
                          className="border-b border-l border-gray-100 relative cursor-pointer hover:bg-primary-soft/30 transition"
                          style={{ height: ROW_H }}
                          onClick={() => openNewAt(`${String(hour).padStart(2, "0")}:00`, p.id)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* events overlay - simplified per column using absolute within a relative wrapper */}
              <div className="relative -mt-[calc(56px*11)] pointer-events-none" style={{ height: ROW_H * (HOUR_END - HOUR_START) }}>
                {/* We render events in a parallel absolute layer matching columns */}
              </div>
            </div>

            {/* Event list with visual blocks (reliable click targets) */}
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-bold text-ink">Compromissos do dia</h3>
              {dayBookings.length === 0 ? (
                <div
                  className="border-2 border-dashed border-primary-border rounded-2xl p-8 text-center text-ink-muted text-sm cursor-pointer hover:bg-primary-soft/50"
                  onClick={() => openNewAt()}
                >
                  Nenhum agendamento. Clique para marcar.
                </div>
              ) : (
                dayBookings.map((b) => {
                  const pro = db.professionals.find((p) => p.id === b.professional_id);
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => openEvent(b)}
                      className="w-full text-left flex gap-3 p-3 rounded-xl border-l-4 bg-white border border-primary-border shadow-card hover:shadow-soft transition"
                      style={{ borderLeftColor: pro?.color || "#EC4899" }}
                    >
                      <div className="w-16 shrink-0">
                        <div className="font-bold text-ink text-sm">{b.start_time}</div>
                        <div className="text-[11px] text-ink-muted">{b.end_time}</div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink truncate">{b.client_name}</div>
                        <div className="text-xs text-ink-muted truncate">
                          {b.service_name} · {b.professional_name}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-primary">{b.service_price}</div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Interactive hour grid with event blocks */}
            <div className="mt-6 bg-white rounded-2xl border border-primary-border overflow-hidden shadow-card">
              <div className="px-4 py-2 bg-primary-soft/50 border-b text-xs font-semibold text-ink-muted">
                Grade horária — clique no espaço vazio para agendar
              </div>
              <DayGrid
                date={date}
                bookings={dayBookings}
                professionals={activePros}
                onSlotClick={(time, proId) => openNewAt(time, proId)}
                onEventClick={openEvent}
                loading={loadingAgenda}
              />
            </div>
          </>
        )}

        {page === "clients" && <ClientsView clients={db.clients} bookings={db.bookings} />}

        {page === "services" && (
          <ServicesView
            services={allServices}
            onEdit={(s) => { setEditingSvc(s); setSvcOpen(true); }}
            onNew={() => { setEditingSvc(null); setSvcOpen(true); }}
            onToggle={(s) => { updateService(s.id, { active: !s.active }); refresh(); }}
          />
        )}

        {page === "professionals" && (
          <ProsView
            pros={allPros}
            onToggle={async (p) => {
              try {
                await fetch("/api/professionals", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ id: p.id, active: !p.active }),
                });
              } catch {}
              setProfessionalActive(p.id, !p.active);
              refresh();
            }}
            onRemove={async (p) => {
              if (p.name.toLowerCase().includes("janiquelen")) {
                // allow remove but confirm
              }
              try {
                await fetch(`/api/professionals?id=${p.id}`, { method: "DELETE" });
              } catch {}
              setProfessionalActive(p.id, false);
              refresh();
            }}
          />
        )}

        {page === "hours" && <HoursView />}
      </main>

      {/* New booking modal */}
      <BookingModal
        open={bookOpen}
        onClose={() => setBookOpen(false)}
        date={date}
        prefill={bookPrefill}
        services={db.services.filter((s) => s.active)}
        professionals={activePros}
        onSaved={() => { setBookOpen(false); refresh(); }}
      />

      {/* Event detail / cancel */}
      <Modal open={eventOpen} title="Agendamento" onClose={() => setEventOpen(false)}>
        {selected && (
          <div className="space-y-3 text-sm">
            <Row k="Cliente" v={selected.client_name} />
            <Row k="WhatsApp" v={selected.client_whatsapp || "—"} />
            <Row k="Serviço" v={selected.service_name} />
            <Row k="Profissional" v={selected.professional_name} />
            <Row k="Data" v={formatDateBR(selected.date)} />
            <Row k="Horário" v={`${selected.start_time} – ${selected.end_time}`} />
            <Row k="Valor" v={selected.service_price} />
            {selected.notes && <Row k="Obs." v={selected.notes} />}

            <Field label="Motivo do cancelamento (opcional)">
              <input className={inputClass} value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex: cliente desmarcou" />
            </Field>
            <button
              className="w-full min-h-11 rounded-xl bg-red-50 text-danger font-semibold border border-red-100"
              onClick={async () => {
                if (mode === "supabase") {
                  await apiDelete(`/api/bookings?id=${selected.id}&reason=${encodeURIComponent(cancelReason || "")}`);
                } else {
                  cancelBooking(selected.id, cancelReason || undefined);
                }
                setEventOpen(false);
                refresh();
              }}
            >
              Cancelar agendamento
            </button>
          </div>
        )}
      </Modal>

      {/* Service edit modal */}
      <ServiceModal
        open={svcOpen}
        service={editingSvc}
        onClose={() => setSvcOpen(false)}
        onSave={() => { setSvcOpen(false); refresh(); }}
      />

      <AssistantChat role="admin" />

      <style jsx global>{`
        .nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 9999px;
          border: 2px solid #fbcfe8;
          background: white;
          display: grid;
          place-items: center;
        }
      `}</style>
    </div>
  );
}

function DayGrid({
  date,
  bookings,
  professionals,
  onSlotClick,
  onEventClick,
  loading,
}: {
  date: string;
  bookings: Booking[];
  professionals: Professional[];
  onSlotClick: (time: string, proId: number) => void;
  onEventClick: (b: Booking) => void;
  loading?: boolean;
}) {
  // half-hour slots from HOUR_START to HOUR_END
  const slots: string[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    slots.push(`${String(h).padStart(2, "0")}:30`);
  }

  const pro = professionals[0];

  if (loading) {
    return (
      <div className="py-16 text-center text-ink-muted text-sm">
        <div className="inline-block w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <div>Carregando agenda...</div>
      </div>
    );
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: `64px 1fr` }}>
      <div className="border-b bg-primary-soft/40" />
      <div className="text-center text-[11px] font-bold py-2 border-b text-ink bg-primary-soft/40">
        {pro ? pro.name : "Agenda"}
      </div>
      {slots.map((time) => {
        const cellBookings = bookings.filter((b) => {
          if (pro && b.professional_id !== pro.id) return false;
          return b.start_time === time;
        });
        // also show bookings that start in this half-hour window partially? only exact start for clarity
        return (
          <div key={time} className="contents">
            <div
              className="text-[11px] text-ink-muted text-right pr-2 border-b border-r font-medium"
              style={{ height: ROW_H, paddingTop: 8 }}
            >
              {time}
            </div>
            <div
              className="border-b border-gray-100 relative hover:bg-primary-soft/40 cursor-pointer transition"
              style={{ height: ROW_H }}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("[data-event]")) return;
                onSlotClick(time, pro?.id || 1);
              }}
              title={`Agendar às ${time}`}
            >
              {cellBookings.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  data-event
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(b);
                  }}
                  className="absolute inset-0.5 rounded-md px-2 text-[11px] leading-tight text-white font-semibold truncate text-left shadow-sm z-10"
                  style={{
                    background: pro?.color || "#EC4899",
                    minHeight: Math.max(ROW_H - 4, (b.duration_minutes / 30) * ROW_H - 4),
                  }}
                >
                  {b.start_time}–{b.end_time} · {b.client_name}
                  <span className="block opacity-90 font-normal truncate">{b.service_name}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BookingModal({
  open,
  onClose,
  date,
  prefill,
  services,
  professionals,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  prefill: { time?: string; proId?: number };
  services: Service[];
  professionals: Professional[];
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [whats, setWhats] = useState("");
  const [serviceId, setServiceId] = useState(services[0]?.id || 1);
  const [proId, setProId] = useState(prefill.proId || professionals[0]?.id || 1);
  const [time, setTime] = useState(prefill.time || "");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [bookingDate, setBookingDate] = useState(date);

  useEffect(() => {
    if (!open) return;
    setBookingDate(date);
    setProId(prefill.proId || professionals[0]?.id || 1);
    setTime(prefill.time || "");
    setName("");
    setWhats("");
    setNotes("");
    setError("");
    setServiceId(services[0]?.id || 1);
  }, [open, date, prefill, professionals, services]);

  const service = services.find((s) => s.id === serviceId);
  const slots = service
    ? getAvailableSlots(bookingDate, service.duration_minutes, proId)
    : [];

  async function save() {
    if (!name.trim()) {
      setError("Digite o nome da cliente.");
      return;
    }
    if (!time) {
      setError("Selecione um horário.");
      return;
    }
    try {
      // tenta API (Supabase); se falhar, local
      await apiPost("/api/bookings", {
        client_name: name,
        client_whatsapp: whats || undefined,
        service_id: serviceId,
        professional_id: proId,
        date: bookingDate,
        start_time: time,
        notes: notes || undefined,
        source: "admin",
      });
      onSaved();
    } catch (e: any) {
      const res = createBooking({
        client_name: name,
        client_whatsapp: whats || undefined,
        service_id: serviceId,
        professional_id: proId,
        date: bookingDate,
        start_time: time,
        notes: notes || undefined,
      });
      if (!res.ok) {
        setError(e?.message || res.error);
        return;
      }
      onSaved();
    }
  }

  return (
    <Modal open={open} title="Colocar na agenda" onClose={onClose}>
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-50 text-danger text-sm border border-red-100">{error}</div>
      )}
      <p className="text-xs text-ink-muted mb-3">Preencha o nome, o serviço e o horário. A Janiquelen já está selecionada.</p>
      <Field label="Nome da cliente *">
        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome da cliente" />
      </Field>
      <Field label="WhatsApp">
        <input className={inputClass} value={whats} onChange={(e) => setWhats(maskWhatsapp(e.target.value))} placeholder="(XX) 9XXXX-XXXX" />
      </Field>
      <Field label="Serviço *">
        <select className={inputClass} value={serviceId} onChange={(e) => { setServiceId(Number(e.target.value)); setTime(""); }}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.icon} {s.name} · {s.duration_minutes}min · {s.price}</option>
          ))}
        </select>
      </Field>
      {professionals.length > 1 && (
        <Field label="Profissional *">
          <select className={inputClass} value={proId} onChange={(e) => { setProId(Number(e.target.value)); setTime(""); }}>
            {professionals.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Data *">
        <input type="date" className={inputClass} value={bookingDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setBookingDate(e.target.value); setTime(""); }} />
      </Field>
      <Field label="Horário *">
        <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-y-auto">
          {slots.length === 0 ? (
            <p className="col-span-3 text-xs text-ink-muted py-2">Nenhum horário livre neste dia.</p>
          ) : (
            slots.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTime(t)}
                className={`min-h-9 rounded-lg text-xs font-semibold border-2 ${
                  time === t ? "bg-primary border-primary text-white" : "border-primary-border bg-white"
                }`}
              >
                {t}
              </button>
            ))
          )}
        </div>
      </Field>
      <Field label="Observações">
        <textarea className={inputClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <button onClick={save} className="w-full min-h-12 rounded-xl bg-primary text-white font-semibold shadow-btn mt-1">
        Salvar agendamento
      </button>
    </Modal>
  );
}

function ServiceModal({
  open,
  service,
  onClose,
  onSave,
}: {
  open: boolean;
  service: Service | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [icon, setIcon] = useState("✨");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    if (service) {
      setName(service.name);
      setDuration(String(service.duration_minutes));
      setPrice(service.price);
      setIcon(service.icon);
    } else {
      setName("");
      setDuration("30");
      setPrice("R$ 50,00");
      setIcon("✨");
    }
    setError("");
  }, [open, service]);

  async function save() {
    if (!name.trim()) {
      setError("Nome obrigatório");
      return;
    }
    const dur = parseInt(duration, 10);
    if (!dur || dur < 15) {
      setError("Duração mínima 15 min");
      return;
    }
    if (service) {
      updateService(service.id, { name: name.trim(), duration_minutes: dur, price, icon });
    } else {
      addService({ name: name.trim(), duration_minutes: dur, price, icon, active: true });
    }
    onSave();
  }

  return (
    <Modal open={open} title={service ? "Editar serviço" : "Novo serviço"} onClose={onClose}>
      {error && <div className="mb-3 p-3 rounded-xl bg-red-50 text-danger text-sm">{error}</div>}
      <Field label="Nome *"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Duração (minutos) *"><input className={inputClass} type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>
      <Field label="Preço"><input className={inputClass} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
      <Field label="Ícone">
        <div className="flex gap-2 flex-wrap">
          {["✂️", "💨", "✏️", "✨", "🤍", "🎨", "🥥", "💅", "🧴"].map((i) => (
            <button key={i} type="button" onClick={() => setIcon(i)} className={`w-10 h-10 rounded-xl border-2 text-lg ${icon === i ? "border-primary bg-primary-soft" : "border-primary-border"}`}>
              {i}
            </button>
          ))}
        </div>
      </Field>
      <button onClick={save} className="w-full min-h-12 rounded-xl bg-primary text-white font-semibold shadow-btn">
        Salvar
      </button>
    </Modal>
  );
}

function ClientsView({ clients, bookings }: { clients: Client[]; bookings: Booking[] }) {
  const [q, setQ] = useState("");
  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(q.toLowerCase()) ||
      (c.whatsapp || "").includes(q)
  );
  return (
    <>
      <h1 className="text-2xl font-bold text-ink mb-4">Clientes</h1>
      <input
        className={`${inputClass} mb-4 max-w-md`}
        placeholder="Buscar por nome ou WhatsApp..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="bg-white rounded-2xl border border-primary-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-ink-muted border-b bg-primary-soft/40">
              <th className="py-3 px-4">Nome</th>
              <th className="py-3 px-4">WhatsApp</th>
              <th className="py-3 px-4">Atendimentos</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} className="py-10 text-center text-ink-muted">Nenhum cliente</td></tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b hover:bg-primary-soft/30">
                  <td className="py-3 px-4 font-semibold">{c.name}</td>
                  <td className="py-3 px-4">{c.whatsapp || "—"}</td>
                  <td className="py-3 px-4">
                    {bookings.filter((b) => b.client_name === c.name && b.status === "confirmed").length}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ServicesView({
  services,
  onEdit,
  onNew,
  onToggle,
}: {
  services: Service[];
  onEdit: (s: Service) => void;
  onNew: () => void;
  onToggle: (s: Service) => void;
}) {
  return (
    <>
      <div className="flex justify-between items-center mb-4 gap-2 flex-wrap">
        <h1 className="text-2xl font-bold text-ink">Serviços</h1>
        <button onClick={onNew} className="bg-primary text-white text-sm font-semibold px-4 py-2 rounded-xl shadow-btn">
          ＋ Novo serviço
        </button>
      </div>
      <div className="bg-white rounded-2xl border border-primary-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-ink-muted border-b bg-primary-soft/40">
              <th className="py-3 px-4">Nome</th>
              <th className="py-3 px-4">Duração</th>
              <th className="py-3 px-4">Preço</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b hover:bg-primary-soft/30">
                <td className="py-3 px-4 font-semibold">{s.icon} {s.name}</td>
                <td className="py-3 px-4">{s.duration_minutes} min</td>
                <td className="py-3 px-4">{s.price}</td>
                <td className="py-3 px-4">
                  <button onClick={() => onToggle(s)} className={`text-xs font-semibold px-2 py-0.5 rounded ${s.active ? "bg-emerald-50 text-ok" : "bg-gray-100 text-gray-500"}`}>
                    {s.active ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="py-3 px-4">
                  <button onClick={() => onEdit(s)} className="text-xs font-semibold text-primary">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProsView({
  pros,
  onToggle,
  onRemove,
}: {
  pros: Professional[];
  onToggle: (p: Professional) => void;
  onRemove: (p: Professional) => void;
}) {
  return (
    <>
      <h1 className="text-2xl font-bold text-ink mb-2 animate-fade-up">Profissionais</h1>
      <p className="text-sm text-ink-muted mb-4 animate-fade-up">Ative, desative ou remova da lista pública de agendamento.</p>
      <div className="space-y-3 max-w-lg stagger">
        {pros.map((p) => (
          <div
            key={p.id}
            className={`flex items-center gap-3 p-4 bg-white rounded-2xl border shadow-card card-hover ${
              p.active ? "border-primary-border" : "border-gray-200 opacity-70"
            }`}
          >
            <div
              className="w-12 h-12 rounded-full text-white grid place-items-center font-bold animate-float"
              style={{ background: p.active ? p.color : "#9CA3AF" }}
            >
              {p.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-ink">{p.name}</div>
              <div className="text-xs text-ink-muted">{p.active ? "Aparece no agendamento" : "Oculta do site"}</div>
            </div>
            <button
              onClick={() => onToggle(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full btn-press ${
                p.active ? "bg-emerald-50 text-ok" : "bg-gray-100 text-gray-500"
              }`}
            >
              {p.active ? "Ativa" : "Inativa"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Remover ${p.name} da lista de profissionais?\n(O histórico de agendamentos é mantido)`)) {
                  onRemove(p);
                }
              }}
              className="text-xs font-semibold px-3 py-1.5 rounded-full bg-red-50 text-danger border border-red-100 btn-press"
              title="Remover"
            >
              Remover
            </button>
          </div>
        ))}
        {pros.length === 0 && (
          <p className="text-ink-muted text-sm py-8 text-center">Nenhuma profissional cadastrada.</p>
        )}
      </div>
    </>
  );
}

function HoursView() {
  return (
    <>
      <h1 className="text-2xl font-bold text-ink mb-4">Horários de funcionamento</h1>
      <div className="bg-white rounded-2xl border border-primary-border overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase text-ink-muted border-b bg-primary-soft/40">
              <th className="py-3 px-4">Dia</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Horário</th>
              <th className="py-3 px-4">Almoço</th>
            </tr>
          </thead>
          <tbody>
            {DAY_NAMES.map((name, i) => {
              const h = BUSINESS_HOURS[i];
              return (
                <tr key={i} className="border-b">
                  <td className="py-3 px-4 font-semibold">{name}</td>
                  <td className="py-3 px-4">{h.open ? "✅ Aberto" : "❌ Fechado"}</td>
                  <td className="py-3 px-4">{h.open ? `${h.openTime} – ${h.closeTime}` : "—"}</td>
                  <td className="py-3 px-4">{h.breakStart ? `${h.breakStart} – ${h.breakEnd}` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-primary-border/50">
      <span className="text-ink-muted">{k}</span>
      <span className="font-semibold text-ink text-right">{v}</span>
    </div>
  );
}

function shiftDate(date: string, delta: number, setDate: (d: string) => void) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + delta);
  setDate(d.toISOString().slice(0, 10));
}
