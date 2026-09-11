"use client";

import { useEffect, useMemo, useState } from "react";
import {
  loadDb,
  createBooking,
  getAvailableSlots,
  getOpenDates,
  formatDateBR,
  maskWhatsapp,
  type Service,
  type Professional,
  type Booking,
} from "@/lib/store";
import { Logo } from "./Logo";
import { Leaves } from "./Leaves";
import { Progress } from "./Progress";
import { Modal } from "./Modal";
import { apiGet, apiPost, checkMode } from "@/lib/api";

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 9;

const MONTHS = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const DOW = ["D","S","T","Q","Q","S","S"];

export function BookingApp() {
  const [tick, setTick] = useState(0);
  const [mode, setMode] = useState<"supabase" | "localStorage">("localStorage");
  const [remoteServices, setRemoteServices] = useState<Service[] | null>(null);
  const [remotePros, setRemotePros] = useState<Professional[] | null>(null);
  const db = useMemo(() => loadDb(), [tick]);
  const services = remoteServices ?? db.services.filter((s) => s.active);
  const professionals = remotePros ?? db.professionals.filter((p) => p.active);

  useEffect(() => {
    checkMode().then(async (m) => {
      setMode(m);
      if (m === "supabase") {
        try {
          const [svcs, pros] = await Promise.all([
            apiGet<any[]>("/api/services"),
            apiGet<any[]>("/api/professionals"),
          ]);
          setRemoteServices(
            svcs.map((s) => ({
              id: s.id,
              name: s.name,
              duration_minutes: s.duration_minutes,
              price: s.price_label || `R$ ${Number(s.price).toFixed(2).replace(".", ",")}`,
              icon: s.icon || "✨",
              active: s.active,
            }))
          );
          setRemotePros(
            pros.map((p) => ({
              id: p.id,
              name: p.name,
              active: p.active,
              color: p.color || "#EC4899",
            }))
          );
        } catch (e) {
          console.error(e);
        }
      }
    });
  }, [tick]);

  const [step, setStep] = useState<Step>(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [nameError, setNameError] = useState(false);
  const [service, setService] = useState<Service | null>(null);
  const [pro, setPro] = useState<Professional | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [search, setSearch] = useState("");
  const [calMonth, setCalMonth] = useState(() => new Date());
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [lockOpen, setLockOpen] = useState(false);
  const [lockPwd, setLockPwd] = useState("");
  const [lockErr, setLockErr] = useState("");

  useEffect(() => {
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("studio-db-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("studio-db-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const openDates = useMemo(() => new Set(getOpenDates(90)), [tick]);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  useEffect(() => {
    if (!date || !service || !pro) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    setSlotsLoading(true);
    (async () => {
      if (mode === "supabase") {
        try {
          const res = await apiGet<{ slots: string[] }>(
            `/api/slots?date=${date}&serviceId=${service.id}&professionalId=${pro.id}`
          );
          if (!cancelled) setSlots(res.slots || []);
        } catch {
          if (!cancelled) setSlots([]);
        }
      } else {
        if (!cancelled) setSlots(getAvailableSlots(date, service.duration_minutes, pro.id));
      }
      if (!cancelled) setSlotsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [date, service, pro, tick, mode]);

  function go(s: Step, direction: "fwd" | "back" = "fwd") {
    setDir(direction);
    setStep(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    if (step === 9) return go(4, "back");
    if (step > 0 && step < 6) go((step - 1) as Step, "back");
  }

  function validateData() {
    if (name.trim().length < 2) {
      setNameError(true);
      return;
    }
    setNameError(false);
    go(2);
  }

  async function confirmBooking() {
    if (!service || !pro || !date || !time) return;
    setLoading(true);
    try {
      if (mode === "supabase") {
        const res = await apiPost<{ success: boolean; booking: Booking; error?: string }>("/api/bookings", {
          client_name: name.trim(),
          client_whatsapp: whatsapp || undefined,
          service_id: service.id,
          professional_id: pro.id,
          date,
          start_time: time,
          source: "client",
        });
        setBooking(res.booking);
        go(6);
      } else {
        const res = createBooking({
          client_name: name.trim(),
          client_whatsapp: whatsapp || undefined,
          service_id: service.id,
          professional_id: pro.id,
          date,
          start_time: time,
        });
        if (!res.ok) {
          go(9);
          setTick((t) => t + 1);
          return;
        }
        setBooking(res.booking);
        go(6);
      }
    } catch (e) {
      go(9);
      setTick((t) => t + 1);
    } finally {
      setLoading(false);
    }
  }

  function shareWa() {
    if (!booking) return;
    const msg =
      `Olá! Meu agendamento no Studio Janiquelen Alves:\n\n` +
      `👤 Nome: ${booking.client_name}\n` +
      `✂️ Serviço: ${booking.service_name}\n` +
      `👩‍🦰 Profissional: ${booking.professional_name}\n` +
      `📅 Data: ${formatDateBR(booking.date)}\n` +
      `🕐 Horário: ${booking.start_time}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function reset() {
    setStep(0);
    setName("");
    setWhatsapp("");
    setService(null);
    setPro(null);
    setDate("");
    setTime("");
    setBooking(null);
    setNameError(false);
  }

  function tryUnlock() {
    if (lockPwd === "9415") {
      sessionStorage.setItem("admin_unlocked", "1");
      localStorage.setItem("admin_token", "demo");
      window.location.href = "/admin";
    } else {
      setLockErr("Senha incorreta");
    }
  }

  const anim = dir === "back" ? "animate-slide-in-back" : "animate-slide-in";
  const showSummary = step >= 2 && step <= 5 && (service || pro || date || time);

  if (step === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <div
          className="relative flex flex-col justify-end text-white px-5 pb-8 pt-4"
          style={{
            minHeight: "54vh",
            backgroundImage:
              "linear-gradient(to top, rgba(131,24,67,.8) 0%, rgba(131,24,67,.35) 45%, rgba(131,24,67,.08) 70%), url(/images/hero.jpg)",
            backgroundSize: "cover",
            backgroundPosition: "center 20%",
          }}
        >
          <div className="absolute top-4 left-4"><Logo white size="lg" /></div>
          <h1 className="text-[28px] font-bold leading-tight max-w-[280px] drop-shadow mb-2">
            Cuidado, beleza e autoestima em um só lugar
          </h1>
          <p className="text-white/90 text-sm mb-5 max-w-[260px]">
            Agende seu horário de forma rápida e prática.
          </p>
          <button
            onClick={() => go(1)}
            className="animate-pulse-soft max-w-[250px] min-h-12 rounded-xl bg-primary text-white font-semibold text-[15px] shadow-btn btn-press"
          >
            📅 Agendar meu horário
          </button>
        </div>
        <div className="relative px-5 py-6 flex-1 bg-white">
          <div className="animate-leaf"><div className="animate-leaf pointer-events-none"><Leaves /></div></div>
          <div className="relative z-10 flex justify-between gap-2 text-center">
            {[
              { icon: "👩‍🦰", t: "Profissionais\nqualificadas" },
              { icon: "💖", t: "Atendimento\npersonalizado" },
              { icon: "🏠", t: "Ambiente\naconchegante" },
            ].map((f) => (
              <div key={f.t} className="flex-1 text-[11px] text-ink-muted leading-snug whitespace-pre-line">
                <div className="w-11 h-11 rounded-full bg-primary-soft border border-primary-border grid place-items-center mx-auto mb-2 text-lg shadow-card animate-float">
                  {f.icon}
                </div>
                {f.t}
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-ink-muted mt-5 leading-relaxed">
            Terça 13h–17h · Qua–Sáb 8h–17h
            <br />
            Fechado: Domingo e Segunda
          </p>
          <div className="flex justify-center mt-8">
            <button
              type="button"
              onClick={() => { setLockOpen(true); setLockPwd(""); setLockErr(""); }}
              className="w-9 h-9 rounded-full border border-primary-border/60 text-ink-muted/40 hover:text-ink-muted grid place-items-center text-sm"
              aria-label="Área restrita"
            >
              🔒
            </button>
          </div>
        </div>

        <Modal open={lockOpen} title="Área restrita" onClose={() => setLockOpen(false)}>
          {lockErr && <div className="mb-3 p-3 rounded-xl bg-red-50 text-danger text-sm">{lockErr}</div>}
          <input
            type="password"
            value={lockPwd}
            onChange={(e) => setLockPwd(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
            placeholder="Senha"
            className="w-full min-h-12 px-4 rounded-xl border-2 border-primary-border outline-none focus:border-primary mb-3"
            autoFocus
          />
          <button onClick={tryUnlock} className="w-full min-h-12 rounded-xl bg-primary text-white font-semibold shadow-btn">
            Entrar
          </button>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-3 bg-white/95 backdrop-blur border-b border-primary-border">
        <button type="button" onClick={back} className={`w-11 h-11 grid place-items-center rounded-full text-2xl text-ink ${step === 6 ? "invisible" : ""}`} aria-label="Voltar">
          ‹
        </button>
        <Logo size="sm" />
        <div className="w-11" />
      </header>

      {step >= 1 && step <= 5 && <div className="animate-fade-in"><Progress step={step} /></div>}

      {/* Sticky summary */}
      {showSummary && (
        <div className="sticky top-14 z-30 mx-3 mt-2 mb-1 rounded-2xl border border-primary-border bg-primary-soft/90 backdrop-blur px-3 py-2 text-[11px] flex flex-wrap gap-x-3 gap-y-1 text-ink shadow-card animate-slide-up">
          {service && <span>✂️ <b>{service.name}</b></span>}
          {pro && <span>👩 {pro.name.split(" ")[0]}</span>}
          {date && <span>📅 {date.split("-").reverse().join("/")}</span>}
          {time && <span>🕐 {time}</span>}
          {service && <span className="text-primary font-bold">💰 {service.price}</span>}
        </div>
      )}

      <div className="relative flex-1 px-5 py-4 pb-10 overflow-y-auto">
        <div className="animate-leaf pointer-events-none"><Leaves /></div>
        <div key={step} className={`relative z-10 ${anim}`}>
          {step === 1 && (
            <>
              <h2 className="text-xl font-bold text-ink mb-1">Seus dados</h2>
              <p className="text-sm text-ink-muted mb-5">Para continuar, precisamos de algumas informações.</p>
              <label className="block text-[13px] font-semibold text-ink mb-1.5">
                Nome completo <em className="text-primary not-italic">*</em>
              </label>
              <input
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                placeholder="Digite seu nome"
                className={`w-full min-h-12 px-4 rounded-xl border-2 bg-white text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 ${nameError ? "border-danger" : "border-primary-border"}`}
              />
              {nameError && <p className="text-danger text-xs mt-1.5 font-medium">Digite seu nome para continuar.</p>}
              <label className="block text-[13px] font-semibold text-ink mb-1.5 mt-4">WhatsApp</label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(maskWhatsapp(e.target.value))}
                placeholder="(XX) 9XXXX-XXXX"
                inputMode="numeric"
                className="w-full min-h-12 px-4 rounded-xl border-2 border-primary-border bg-white text-base outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
              <button onClick={validateData} className="btn-primary mt-5">Continuar</button>
              <button onClick={() => go(0, "back")} className="btn-ghost">‹ Voltar</button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-bold text-ink mb-1">Escolha o serviço</h2>
              <p className="text-sm text-ink-muted mb-3">Selecione o que deseja fazer</p>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar serviço..." className="w-full min-h-11 px-4 mb-3 rounded-xl border-2 border-primary-border text-sm outline-none focus:border-primary" />
              <div className="stagger flex flex-col gap-2.5">
                {services.filter((s) => s.name.toLowerCase().includes(search.toLowerCase())).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setService(s);
                      if (professionals.length === 1) {
                        setPro(professionals[0]);
                        setDate("");
                        setTime("");
                        go(4);
                      } else {
                        go(3);
                      }
                    }}
                    className="flex items-center gap-3 p-3.5 rounded-2xl border-2 border-primary-border bg-white shadow-card text-left hover:border-primary hover:bg-primary-soft card-hover btn-press min-h-16"
                  >
                    <span className="w-11 h-11 rounded-xl bg-primary-soft border border-primary-border grid place-items-center text-lg shrink-0">{s.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-semibold text-[15px] text-ink">{s.name}</span>
                      <span className="text-xs text-ink-muted">{s.duration_minutes} min</span>
                    </span>
                    <span className="text-primary font-bold text-sm whitespace-nowrap">{s.price}</span>
                    <span className="text-primary-mid text-xl">›</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-bold text-ink mb-1">Profissional</h2>
              <p className="text-sm text-ink-muted mb-4">Escolha quem irá te atender.</p>
              <div className="stagger flex flex-col gap-2.5">
                {professionals.map((p) => {
                  const on = pro?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPro(p)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition min-h-16 ${on ? "border-primary bg-primary-soft shadow-soft" : "border-primary-border bg-white shadow-card"}`}
                    >
                      <span className="w-12 h-12 rounded-full text-white grid place-items-center font-bold" style={{ background: p.color }}>
                        {p.name[0]}
                      </span>
                      <span className="flex-1 font-semibold text-ink">{p.name}</span>
                      <span className={`w-[22px] h-[22px] rounded-full border-2 grid place-items-center ${on ? "border-primary" : "border-primary-border"}`}>
                        {on && <span className="w-3 h-3 rounded-full bg-primary" />}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button disabled={!pro} onClick={() => { setDate(""); setTime(""); go(4); }} className="btn-primary mt-5 disabled:opacity-50">Continuar</button>
              <button onClick={() => go(2, "back")} className="btn-ghost">‹ Voltar</button>
            </>
          )}

          {step === 4 && service && pro && (
            <>
              <h2 className="text-xl font-bold text-ink mb-1">Escolha a data</h2>
              <p className="text-sm text-ink-muted mb-3">Dias disponíveis em destaque</p>
              <Calendar
                month={calMonth}
                selected={date}
                openDates={openDates}
                onMonth={setCalMonth}
                onSelect={(ds) => { setDate(ds); setTime(""); setTick((t) => t + 1); }}
              />
              {date && (
                <>
                  <h2 className="text-lg font-bold text-ink mt-2 mb-1">Horários livres</h2>
                  <p className="text-sm text-ink-muted mb-3 capitalize">{formatDateBR(date)} · {pro.name.split(" ")[0]}</p>
                  {slotsLoading ? (
                    <div className="text-center p-8 text-ink-muted text-sm">
                      <div className="inline-block w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
                      <div>Carregando horários...</div>
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="text-center p-5 rounded-2xl bg-primary-soft text-primary font-semibold text-sm border border-primary-border">
                      Nenhum horário disponível.<br />Escolha outra data.
                    </div>
                  ) : (
                    <div className="stagger grid grid-cols-3 gap-2">
                      {slots.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setTime(t); go(5); }}
                          className={`min-h-11 rounded-xl border-2 text-sm font-medium btn-press card-hover ${
                            time === t ? "bg-primary border-primary text-white shadow-btn" : "border-primary-border bg-white hover:border-primary hover:bg-primary-soft"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {step === 5 && service && pro && (
            <>
              <h2 className="text-xl font-bold text-ink mb-1">Confirmar</h2>
              <p className="text-sm text-ink-muted mb-4">Revise e confirme seu horário</p>
              <div className="rounded-2xl border-2 border-primary-border bg-primary-soft px-4 shadow-card">
                {[
                  ["👤 Cliente", name],
                  ["📱 WhatsApp", whatsapp || "—"],
                  ["✂️ Serviço", `${service.name} · ${service.duration_minutes} min`],
                  ["👩‍🦰 Profissional", pro.name],
                  ["📅 Data", formatDateBR(date)],
                  ["🕐 Horário", time],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-3 border-b border-primary-border last:border-0 text-sm">
                    <span className="text-ink-muted">{k}</span>
                    <span className="font-semibold text-ink text-right max-w-[58%]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center mt-3 mb-4 text-base font-bold text-ink">
                <span>Valor total</span>
                <span className="text-primary">{service.price}</span>
              </div>
              <button onClick={confirmBooking} disabled={loading} className="btn-primary disabled:opacity-50">
                {loading ? "Confirmando..." : "Confirmar agendamento"}
              </button>
              <button onClick={() => go(4, "back")} className="btn-ghost">‹ Voltar</button>
            </>
          )}

          {step === 6 && booking && (
            <div className="text-center pt-6">
              <div className="animate-pop w-[76px] h-[76px] rounded-full bg-emerald-50 text-ok border-2 border-emerald-200 grid place-items-center text-3xl mx-auto mb-4 shadow-soft">✓</div>
              <h2 className="text-xl font-bold text-ok mb-1">Agendamento confirmado!</h2>
              <p className="text-sm text-ink-muted mb-4">Seu horário foi reservado com sucesso.</p>
              <div className="text-left rounded-2xl border border-primary-border bg-primary-soft p-4 text-sm leading-relaxed mb-4">
                <strong>{booking.client_name}</strong><br />
                {booking.service_name} · {booking.service_price}<br />
                {formatDateBR(booking.date)} às {booking.start_time}<br />
                Com {booking.professional_name}
              </div>
              <button onClick={shareWa} className="w-full min-h-12 rounded-xl bg-[#25D366] text-white font-semibold shadow-[0_6px_16px_rgba(37,211,102,.3)]">
                Compartilhar no WhatsApp
              </button>
              <button onClick={reset} className="btn-ghost border border-primary-border">Novo agendamento</button>
            </div>
          )}

          {step === 9 && (
            <div className="text-center pt-10">
              <div className="w-[76px] h-[76px] rounded-full bg-orange-50 text-orange-600 grid place-items-center text-3xl mx-auto mb-4">🔔</div>
              <h2 className="text-xl font-bold text-ink mb-2">Esse horário acabou de ser reservado.</h2>
              <p className="text-sm text-ink-muted mb-6">Por favor, escolha outro horário.</p>
              <button onClick={() => { setTime(""); setTick((t) => t + 1); go(4, "back"); }} className="btn-primary">
                Voltar para os horários
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .btn-primary {
          width: 100%; min-height: 48px; border-radius: 12px;
          background: #ec4899; color: #fff; font-weight: 600; font-size: 15px;
          box-shadow: 0 8px 20px rgba(236, 72, 153, 0.28);
        }
        .btn-primary:active { transform: scale(0.98); }
        .btn-ghost {
          width: 100%; min-height: 48px; margin-top: 10px; border-radius: 12px;
          background: #fdf2f8; color: #831843; font-weight: 600; font-size: 15px;
          border: 1px solid #fbcfe8;
        }
      `}</style>
    </div>
  );
}

function Calendar({
  month, selected, openDates, onMonth, onSelect,
}: {
  month: Date; selected: string; openDates: Set<string>;
  onMonth: (d: Date) => void; onSelect: (ds: string) => void;
}) {
  const y = month.getFullYear();
  const m = month.getMonth();
  const start = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const cells: (number | null)[] = [];
  for (let i = 0; i < start; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-3">
        <button type="button" className="w-10 h-10 rounded-full border-2 border-primary-border grid place-items-center" onClick={() => onMonth(new Date(y, m - 1, 1))}>‹</button>
        <strong className="text-sm capitalize text-ink">{MONTHS[m]} {y}</strong>
        <button type="button" className="w-10 h-10 rounded-full border-2 border-primary-border grid place-items-center" onClick={() => onMonth(new Date(y, m + 1, 1))}>›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {DOW.map((d) => <div key={d} className="text-center text-[11px] font-semibold text-ink-muted py-1">{d}</div>)}
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const ds = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const free = openDates.has(ds) && ds >= today;
          const sel = selected === ds;
          return (
            <button
              key={ds}
              type="button"
              disabled={!free}
              onClick={() => onSelect(ds)}
              className={`aspect-square min-h-10 rounded-xl text-[13px] font-medium transition ${
                sel ? "bg-primary text-white shadow-btn"
                : free ? "border-2 border-primary/40 bg-primary-soft text-ink font-semibold hover:border-primary"
                : "text-[#D4B5C6] cursor-default"
              }`}
            >
              {d}
            </button>
          );
        })}
      </div>
      <div className="flex gap-4 text-xs text-ink-muted mb-2">
        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-primary inline-block" /> Disponível</span>
        <span className="flex items-center gap-1.5"><i className="w-2 h-2 rounded-full bg-[#D4B5C6] inline-block" /> Fechado</span>
      </div>
    </div>
  );
}
