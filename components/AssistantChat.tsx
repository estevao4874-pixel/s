"use client";

import { useEffect, useRef, useState } from "react";

type ChatMsg = { role: "user" | "assistant"; content: string };

export function AssistantChat({ role = "client" }: { role?: "client" | "admin" }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: "assistant",
      content:
        role === "admin"
          ? "Oi! Sou sua assistente do painel. Pergunte sobre a agenda de hoje, como marcar cliente ou horários do salão."
          : "Oi! 💕 Sou a assistente do Studio Janiquelen. Posso falar de serviços, preços, horários ou te ajudar a agendar.",
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...msgs, { role: "user" as const, content: text }];
    setMsgs(next);
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          message: text,
          history: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: data.reply || data.error || "Não consegui responder agora." },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Falha de conexão. Tente de novo em instantes." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quick =
    role === "admin"
      ? ["Agenda de hoje", "Como marcar cliente?", "Horário de funcionamento"]
      : ["Quais serviços?", "Que horas abre?", "Como agendar?"];

  return (
    <>
      {/* FAB */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`fixed z-[90] bottom-5 right-5 w-14 h-14 rounded-full shadow-btn flex items-center justify-center text-2xl transition-all duration-300 btn-press ${
          open ? "bg-ink text-white rotate-90" : "bg-primary text-white animate-pulse-soft"
        }`}
        aria-label="Assistente"
        title="Assistente IA"
      >
        {open ? "×" : "💬"}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed z-[90] bottom-22 right-5 w-[min(100vw-1.5rem,360px)] h-[min(70vh,520px)] bg-white rounded-2xl shadow-2xl border border-primary-border flex flex-col overflow-hidden animate-slide-up"
          style={{ bottom: "5.5rem" }}
        >
          <div className="bg-gradient-to-r from-primary to-primary-dark text-white px-4 py-3 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-white/20 grid place-items-center text-sm animate-float">✦</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">Assistente Janiquelen</div>
              <div className="text-[11px] text-white/80">
                {role === "admin" ? "Ajuda do painel" : "Ajuda para agendar"}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-primary-soft/30">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`max-w-[88%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap animate-fade-up ${
                  m.role === "user"
                    ? "ml-auto bg-primary text-white rounded-br-md"
                    : "mr-auto bg-white border border-primary-border text-ink rounded-bl-md shadow-card"
                }`}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="mr-auto bg-white border border-primary-border rounded-2xl px-4 py-3 text-sm text-ink-muted flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Pensando...
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="px-2 pt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
            {quick.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => {
                  setInput(q);
                  setTimeout(() => {
                    /* user can send */
                  }, 0);
                }}
                className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-primary-border bg-white text-ink hover:bg-primary-soft"
              >
                {q}
              </button>
            ))}
          </div>

          <div className="p-2 border-t border-primary-border flex gap-2 bg-white">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Digite sua dúvida..."
              className="flex-1 min-h-11 px-3 rounded-xl border-2 border-primary-border text-sm outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-11 h-11 rounded-xl bg-primary text-white font-bold disabled:opacity-40 btn-press"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
