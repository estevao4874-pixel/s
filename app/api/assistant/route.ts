import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

type Msg = { role: "user" | "assistant" | "system"; content: string };

const HOURS_TEXT = `Horários do Studio Janiquelen Alves:
- Domingo e Segunda: FECHADO
- Terça: 13:00 às 17:00
- Quarta a Sábado: 08:00 às 17:00 (almoço 11:00–13:00)
Profissional: Janiquelen Alves (única).
Senha do painel admin: o cliente NÃO deve receber — só oriente a falar com a dona.`;

async function buildContext(role: "client" | "admin") {
  const sb = getSupabase();
  let services = "";
  let todayAgenda = "";
  let stats = "";

  if (sb) {
    const { data: svcs } = await sb.from("services").select("*").eq("active", true).order("name");
    services = (svcs || [])
      .map((s) => `- ${s.name}: ${s.duration_minutes} min — ${s.price_label || `R$ ${s.price}`}`)
      .join("\n");

    const today = new Date().toISOString().slice(0, 10);
    const { data: books } = await sb
      .from("bookings")
      .select("*")
      .eq("date", today)
      .eq("status", "confirmed")
      .order("start_time");

    if (role === "admin") {
      todayAgenda = (books || [])
        .map((b) => `${b.start_time}–${b.end_time} ${b.client_name} (${b.client_whatsapp || "s/ tel"})`)
        .join("\n") || "Nenhum agendamento hoje.";
      const revenue = (books || []).reduce((s, b) => s + (Number(b.amount) || 0), 0);
      stats = `Atendimentos hoje: ${(books || []).length}. Faturamento estimado: R$ ${revenue.toFixed(2)}.`;
    } else {
      todayAgenda = `${(books || []).length} horário(s) já reservados hoje (não listar nomes de clientes).`;
    }
  }

  if (role === "client") {
    return `${HOURS_TEXT}

Serviços disponíveis:
${services || "(carregue os serviços no sistema)"}

Agenda de hoje: ${todayAgenda}

Você é a assistente virtual do Studio Janiquelen Alves, salão de beleza.
Fale em português do Brasil, tom carinhoso, profissional e curto.
Ajude a agendar: oriente a usar o botão "Agendar meu horário" no site.
Explique serviços, preços, duração e horários.
NÃO invente preços fora da lista.
NÃO revele senhas nem dados internos do admin.
Se não souber, diga para WhatsApp da Janiquelen ou agendar pelo site.`;
  }

  return `${HOURS_TEXT}

Serviços:
${services}

${stats}

Agenda de hoje:
${todayAgenda}

Você é a assistente interna do painel admin do Studio Janiquelen Alves.
Ajude a dona/recepção: agenda, horários livres, serviços, clientes.
Fale em português, objetiva e prática.
Sugira ações: "use Colocar cliente na agenda", "clique no horário 8:30", etc.
Não invente agendamentos que não estão no contexto.`;
}

function ruleBasedAnswer(message: string, role: "client" | "admin", context: string): string {
  const m = message.toLowerCase();

  if (/hora|funcion|abre|fecha|que dia|domingo|segunda|terça|quarta/.test(m)) {
    return role === "client"
      ? "Funcionamos assim:\n• Dom e Seg: fechado\n• Terça: 13h–17h\n• Qua–Sáb: 8h–17h (almoço 11h–13h)\n\nQuer agendar? Toque em **Agendar meu horário** 💕"
      : "Horário do salão: Dom/Seg fechado · Ter 13–17h · Qua–Sáb 8–17h (almoço 11–13h). Na agenda, use o botão **Colocar cliente na agenda** ou clique num horário (:00 ou :30).";
  }

  if (/preço|valor|quanto custa|tabela|serviço|corte|escova|sobrancelha|coloração|coconut/.test(m)) {
    const lines = context.split("\n").filter((l) => l.trim().startsWith("- "));
    if (lines.length) {
      return (role === "client" ? "Nossos serviços:\n" : "Procedimentos cadastrados:\n") + lines.join("\n") + (role === "client" ? "\n\nPosso te ajudar a agendar pelo site ✨" : "");
    }
  }

  if (/agendar|marcar|horário|vaga|dispon/.test(m)) {
    return role === "client"
      ? "Para agendar:\n1. Toque em **Agendar meu horário**\n2. Informe seu nome\n3. Escolha o serviço\n4. Escolha data e horário livre\n5. Confirme\n\nSó aparecem horários realmente livres 👍"
      : "Para colocar na agenda: botão rosa **＋ Colocar cliente na agenda** ou clique em um horário (ex.: 8:30) na grade. Preencha nome + serviço e confirme.";
  }

  if (/cancel|desmarc|remarcar/.test(m)) {
    return role === "client"
      ? "Para cancelar ou remarcar, fale com a Janiquelen pelo WhatsApp ou avise no salão. No app, a dona também pode cancelar pelo painel."
      : "Para cancelar: na **Agenda**, clique no evento da cliente → **Cancelar agendamento** (pode informar o motivo). O horário volta a ficar livre no site.";
  }

  if (/admin|painel|senha|entrar/.test(m) && role === "client") {
    return "O painel é só da equipe do salão 🔒 Se você é cliente, use o site para agendar. Se é a dona, use o cadeado na página inicial.";
  }

  if (role === "admin" && (/hoje|agenda|quantos|fatur/.test(m))) {
    const statsLine = context.split("\n").find((l) => l.includes("Atendimentos hoje"));
    const agendaBlock = context.includes("Agenda de hoje:")
      ? context.split("Agenda de hoje:")[1]?.split("\n\n")[0]
      : "";
    return `${statsLine || ""}\n\nHoje:\n${agendaBlock?.trim() || "Sem dados."}\n\nAtualize a agenda com o botão ↻ se acabou de marcar alguém.`;
  }

  if (/oi|olá|ola|bom dia|boa tarde|boa noite|ajuda|help/.test(m)) {
    return role === "client"
      ? "Oi! 💕 Sou a assistente do **Studio Janiquelen Alves**. Posso falar de horários, serviços, preços ou te guiar para agendar. O que você precisa?"
      : "Oi! Estou aqui para ajudar no painel: agenda de hoje, como marcar cliente, horários e serviços. O que precisa?";
  }

  return role === "client"
    ? "Posso ajudar com:\n• Horários de funcionamento\n• Serviços e preços\n• Como agendar no site\n\nPergunte algo disso ou toque em **Agendar meu horário** ✨"
    : "Posso ajudar com agenda de hoje, como marcar/cancelar cliente, horários do salão e lista de serviços. Pergunte de forma direta, ex.: “quantos atendimentos hoje?”";
}

async function callLLM(system: string, messages: Msg[]): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY || process.env.XAI_API_KEY || process.env.GROK_API_KEY;
  if (!key) return null;

  const isXai = !!(process.env.XAI_API_KEY || process.env.GROK_API_KEY);
  const base = isXai ? "https://api.x.ai/v1" : "https://api.openai.com/v1";
  const model = isXai ? "grok-2-latest" : "gpt-4o-mini";

  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        max_tokens: 500,
        messages: [{ role: "system", content: system }, ...messages.filter((m) => m.role !== "system")],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role: "client" | "admin" = body.role === "admin" ? "admin" : "client";
    const message = String(body.message || "").trim();
    const history: Msg[] = Array.isArray(body.history) ? body.history.slice(-8) : [];

    if (!message) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }

    const system = await buildContext(role);
    const llm = await callLLM(system, [...history, { role: "user", content: message }]);
    const reply = llm || ruleBasedAnswer(message, role, system);

    return NextResponse.json({
      reply,
      engine: llm ? "llm" : "rules",
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro no assistente" },
      { status: 500 }
    );
  }
}
