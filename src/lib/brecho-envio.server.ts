// Helpers de servidor para os envios públicos do brechó (anti-spam, limites, Turnstile).
import { createHash } from "crypto";

export function json(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export function ipDaRequisicao(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    "desconhecido"
  );
}

export function hashIp(ip: string): string {
  // Guardamos só o hash, nunca o IP em texto (LGPD).
  const sal = process.env["SUPABASE_URL"] || "brecho";
  return createHash("sha256").update(`${sal}:${ip}`).digest("hex");
}

export async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

type Tipo = "reserva" | "avaliacao" | "exclusao";

/** Retorna true se o IP ainda pode enviar (máx. `limite` por hora). */
export async function dentroDoLimite(tipo: Tipo, ipHash: string, limite: number) {
  const sb = await adminClient();
  const desde = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await sb
    .from("limites_envio")
    .select("id", { count: "exact", head: true })
    .eq("tipo", tipo)
    .eq("ip_hash", ipHash)
    .gte("criado_em", desde);
  if (error) {
    console.error("Falha ao checar limite:", error);
    return false;
  }
  return (count ?? 0) < limite;
}

export async function registrarEnvio(tipo: Tipo, ipHash: string) {
  const sb = await adminClient();
  await sb.from("limites_envio").insert({ tipo, ip_hash: ipHash });
}

/**
 * Verifica o Cloudflare Turnstile. Enquanto a chave secreta não estiver
 * configurada, a verificação é pulada (o limite por IP continua valendo).
 */
export async function verificarTurnstile(token: string | undefined, ip: string) {
  const segredo = process.env["TURNSTILE_SECRET_KEY"];
  if (!segredo) return true;
  if (!token) return false;
  try {
    const corpo = new FormData();
    corpo.append("secret", segredo);
    corpo.append("response", token);
    corpo.append("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: corpo,
    });
    const dados = (await r.json()) as { success?: boolean };
    return dados.success === true;
  } catch (erro) {
    console.error("Falha no Turnstile:", erro);
    return false;
  }
}

export async function lerJson(request: Request): Promise<unknown> {
  const texto = await request.text();
  if (texto.length > 8000) throw new Error("grande demais");
  return JSON.parse(texto);
}
