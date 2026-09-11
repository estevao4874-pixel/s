/** Cliente HTTP para a API (Supabase no servidor) */

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na API");
  return data as T;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na API");
  return data as T;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(path, { method: "DELETE" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro na API");
  return data as T;
}

export async function checkMode(): Promise<"supabase" | "localStorage"> {
  try {
    const h = await apiGet<{ mode: string }>("/api/health");
    return h.mode === "supabase" ? "supabase" : "localStorage";
  } catch {
    return "localStorage";
  }
}
