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
} from "@/lib/brecho-envio.server";

const Esquema = z.object({ id: z.string().uuid() });

// Pedido de exclusão de dados (LGPD) a partir do código da reserva.
export const Route = createFileRoute("/api/public/exclusao")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let dados: z.infer<typeof Esquema>;
        try {
          dados = Esquema.parse(await lerJson(request));
        } catch {
          return json({ erro: "Código de reserva inválido." }, 400);
        }
        const ipHash = hashIp(ipDaRequisicao(request));
        if (!(await dentroDoLimite("exclusao", ipHash, 5))) {
          return json({ erro: "Muitos pedidos seguidos. Tente de novo em 1 hora." }, 429);
        }
        await registrarEnvio("exclusao", ipHash);

        const sb = await adminClient();
        const { data: reserva } = await sb.from("reservas").select("id").eq("id", dados.id).maybeSingle();
        // Resposta igual exista ou não, para não revelar códigos válidos
        if (reserva) {
          const { data: jaExiste } = await sb
            .from("pedidos_exclusao")
            .select("id")
            .eq("reserva_id", dados.id)
            .eq("status", "Pendente")
            .maybeSingle();
          if (!jaExiste) await sb.from("pedidos_exclusao").insert({ reserva_id: dados.id });
        }
        return json({ ok: true });
      },
    },
  },
});
