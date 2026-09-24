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

const Esquema = z.object({
  nota: z.number().int().min(1).max(5),
  facilidade: z.string().trim().max(60),
  satisfacao: z.string().trim().max(60),
  participariaNovamente: z.string().trim().max(60),
  recomendaria: z.string().trim().max(60),
  sugestao: z.string().trim().max(1000),
  site: z.string().max(0).optional(),
  inicio: z.number().optional(),
  turnstile: z.string().max(4000).optional(),
});

export const Route = createFileRoute("/api/public/avaliar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let dados: z.infer<typeof Esquema>;
        try {
          dados = Esquema.parse(await lerJson(request));
        } catch {
          return json({ erro: "Revise os campos da avaliação." }, 400);
        }
        if (dados.inicio && Date.now() - dados.inicio < 3000) {
          return json({ erro: "Envio muito rápido. Aguarde alguns segundos e tente de novo." }, 429);
        }
        const ip = ipDaRequisicao(request);
        if (!(await verificarTurnstile(dados.turnstile, ip))) {
          return json({ erro: "Não conseguimos confirmar que você não é um robô. Tente novamente." }, 403);
        }
        const ipHash = hashIp(ip);
        if (!(await dentroDoLimite("avaliacao", ipHash, 5))) {
          return json({ erro: "Muitas avaliações seguidas deste aparelho. Tente de novo em 1 hora." }, 429);
        }
        await registrarEnvio("avaliacao", ipHash);

        const sb = await adminClient();
        const { error } = await sb.from("avaliacoes").insert({
          nota: dados.nota,
          facilidade: dados.facilidade,
          satisfacao: dados.satisfacao,
          participariaNovamente: dados.participariaNovamente,
          recomendaria: dados.recomendaria,
          sugestao: dados.sugestao,
        });
        if (error) {
          console.error("Erro ao gravar avaliação:", error);
          return json({ erro: "Não foi possível enviar sua avaliação. Tente novamente." }, 500);
        }
        return json({ ok: true });
      },
    },
  },
});
