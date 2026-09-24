import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { normalizarCategoria, type Peca } from "./catalogo";

// Cliente público (somente leitura, respeita as regras de acesso do banco)
function clientePublico() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const COLUNAS = "id, codigo, nome, categoria, tamanho, estado, status, troca, descricao, imagem, createdAt";

function paraPeca(bruto: Record<string, unknown>): Peca {
  const t = (v: unknown, padrao = "") => (typeof v === "string" && v.trim() ? v.trim() : padrao);
  return {
    id: t(bruto["id"]),
    codigo: t(bruto["codigo"]),
    nome: t(bruto["nome"], "Peça sem nome"),
    categoria: normalizarCategoria(t(bruto["categoria"], "adult")),
    tamanho: t(bruto["tamanho"], "Não informado"),
    estado: t(bruto["estado"], "Não informado"),
    status: t(bruto["status"], "available"),
    troca: t(bruto["troca"]),
    descricao: t(bruto["descricao"]),
    imagem: t(bruto["imagem"]),
    createdAt: t(bruto["createdAt"]),
  };
}

export const listarPecas = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await clientePublico()
    .from("produtos")
    .select(COLUNAS)
    .order("createdAt", { ascending: false })
    .limit(500);
  if (error) {
    console.error("Falha ao listar peças:", error);
    return { pecas: [] as Peca[], erro: "Não foi possível carregar as peças agora." };
  }
  return {
    pecas: (data ?? []).map((p) => paraPeca(p as Record<string, unknown>)).filter((p) => p.codigo),
    erro: null as string | null,
  };
});

export const obterPeca = createServerFn({ method: "GET" })
  .inputValidator((d: { codigo: string }) => z.object({ codigo: z.string().trim().min(1).max(20) }).parse(d))
  .handler(async ({ data }) => {
    const { data: linha, error } = await clientePublico()
      .from("produtos")
      .select(COLUNAS)
      .eq("codigo", data.codigo)
      .maybeSingle();
    if (error) {
      console.error("Falha ao buscar peça:", error);
      throw new Error("Não foi possível carregar esta peça agora.");
    }
    return { peca: linha ? paraPeca(linha as Record<string, unknown>) : null };
  });

export const consultarReserva = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { data: linhas, error } = await clientePublico().rpc("consultar_reserva", { _id: data.id });
    if (error) {
      console.error("Falha ao consultar reserva:", error);
      return { reserva: null, erro: "Não foi possível consultar agora. Tente novamente." };
    }
    const r = Array.isArray(linhas) ? linhas[0] : null;
    return {
      reserva: r
        ? { status: r.status, codigoProduto: r.codigoProduto, nomeProduto: r.nomeProduto, createdAt: r.createdAt }
        : null,
      erro: null as string | null,
    };
  });
