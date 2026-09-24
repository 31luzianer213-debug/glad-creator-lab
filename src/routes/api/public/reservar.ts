import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import {
  adminClient,
  dentroDoLimite,
  hashIp,
  ipDaRequisicao,
  json,
  lerJson,
  registrarEnvio,
  verificarTurnstile,
} from "@/lib/brecho-envio.server";

const VERSAO_CONSENTIMENTO = "2026-09-v1";

const Esquema = z.object({
  id: z.string().uuid(),
  nomeCompleto: z.string().trim().min(3).max(120),
  contato: z
    .string()
    .trim()
    .min(8)
    .max(120)
    .refine(
      (v) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || v.replace(/\D/g, "").length >= 10,
      "contato",
    ),
  codigoProduto: z.string().trim().min(1).max(20),
  tipoDoacao: z.string().trim().max(60),
  itemDoacao: z.string().trim().min(2).max(300),
  quantidade: z.number().int().min(1).max(100),
  consentimento: z.literal(true),
  site: z.string().max(0).optional(), // campo-isca invisível: robôs preenchem
  inicio: z.number().optional(),
  turnstile: z.string().max(4000).optional(),
});

export const Route = createFileRoute("/api/public/reservar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let dados: z.infer<typeof Esquema>;
        try {
          dados = Esquema.parse(await lerJson(request));
        } catch {
          return json({ erro: "Revise os campos: nome, contato (telefone com DDD ou e-mail), item e quantidade, e aceite a política de privacidade." }, 400);
        }

        // Preenchido rápido demais (< 3 s) = provável robô
        if (dados.inicio && Date.now() - dados.inicio < 3000) {
          return json({ erro: "Envio muito rápido. Aguarde alguns segundos e tente de novo." }, 429);
        }

        const ip = ipDaRequisicao(request);
        if (!(await verificarTurnstile(dados.turnstile, ip))) {
          return json({ erro: "Não conseguimos confirmar que você não é um robô. Tente novamente." }, 403);
        }

        const ipHash = hashIp(ip);
        if (!(await dentroDoLimite("reserva", ipHash, 5))) {
          return json({ erro: "Muitas reservas seguidas deste aparelho. Tente de novo em 1 hora." }, 429);
        }

        const sb = await adminClient();

        // Máx. 3 reservas por contato em 24 h
        const desde = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count } = await sb
          .from("reservas")
          .select("id", { count: "exact", head: true })
          .eq("contato", dados.contato)
          .gte("createdAt", desde);
        if ((count ?? 0) >= 3) {
          return json({ erro: "Este contato já fez 3 reservas nas últimas 24 horas. Fale com a equipe se precisar de mais." }, 429);
        }

        const { data: produto } = await sb
          .from("produtos")
          .select("codigo, nome, status")
          .eq("codigo", dados.codigoProduto)
          .maybeSingle();
        if (!produto) return json({ erro: "Essa peça não existe mais no catálogo." }, 404);
        if (produto.status !== "available") {
          return json({ erro: "Poxa, essa peça acabou de ser reservada por outra pessoa." }, 409);
        }

        await registrarEnvio("reserva", ipHash);

        const { error } = await sb.from("reservas").insert({
          id: dados.id,
          nomeCompleto: dados.nomeCompleto,
          contato: dados.contato,
          codigoProduto: produto.codigo,
          nomeProduto: produto.nome,
          tipoDoacao: dados.tipoDoacao,
          itemDoacao: dados.itemDoacao,
          quantidade: dados.quantidade,
          status: "Pendente",
          observacoesEquipe: "",
          consentimentoEm: new Date().toISOString(),
          consentimentoVersao: VERSAO_CONSENTIMENTO,
        });

        if (error) {
          if (String(error.message).includes("PECA_INDISPONIVEL")) {
            return json({ erro: "Poxa, essa peça acabou de ser reservada por outra pessoa." }, 409);
          }
          console.error("Erro ao gravar reserva:", error);
          return json({ erro: "Não foi possível registrar sua solicitação. Tente novamente." }, 500);
        }

        // Retenção LGPD: aproveita o envio para limpar dados antigos
        sb.rpc("anonimizar_reservas_antigas").then(({ error: e }) => e && console.error(e));

        return json({ ok: true, id: dados.id, nomeProduto: produto.nome });
      },
    },
  },
});
