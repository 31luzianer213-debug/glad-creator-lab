import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { adminClient, json, lerJson } from "@/lib/brecho-envio.server";

const Esquema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

// Uma administradora promove (ou convida) outro e-mail para a equipe.
export const Route = createFileRoute("/api/public/equipe-convidar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
        if (!token) return json({ erro: "Entre novamente no painel." }, 401);

        const url = process.env["SUPABASE_URL"]!;
        const chave = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
        const comoUsuario = createClient<Database>(url, chave, {
          auth: { persistSession: false, autoRefreshToken: false },
          global: {
            fetch: (input, init) => {
              const h = new Headers(init?.headers);
              h.set("apikey", chave);
              h.set("Authorization", `Bearer ${token}`);
              return fetch(input, { ...init, headers: h });
            },
          },
        });

        const { data: quem, error: erroUser } = await comoUsuario.auth.getUser(token);
        if (erroUser || !quem.user) return json({ erro: "Sessão expirada. Entre novamente." }, 401);

        const { data: ehAdmin } = await comoUsuario.rpc("has_role", {
          _user_id: quem.user.id,
          _role: "admin",
        });
        if (!ehAdmin) return json({ erro: "Só administradoras podem adicionar pessoas." }, 403);

        let dados: z.infer<typeof Esquema>;
        try {
          dados = Esquema.parse(await lerJson(request));
        } catch {
          return json({ erro: "Informe um e-mail válido." }, 400);
        }

        const sb = await adminClient();

        // Procura conta existente
        let alvoId: string | null = null;
        for (let pagina = 1; pagina <= 10 && !alvoId; pagina++) {
          const { data } = await sb.auth.admin.listUsers({ page: pagina, perPage: 200 });
          const achado = data?.users.find((u) => (u.email || "").toLowerCase() === dados.email);
          if (achado) alvoId = achado.id;
          if (!data || data.users.length < 200) break;
        }

        let acao: "promoveu" | "convidou" = "promoveu";
        if (!alvoId) {
          const origem = new URL(request.url).origin;
          const { data, error } = await sb.auth.admin.inviteUserByEmail(dados.email, {
            redirectTo: `${origem}/brecho/adm.html`,
          });
          if (error || !data.user) {
            console.error("Falha ao convidar:", error);
            return json({ erro: "Não foi possível enviar o convite agora. Tente novamente." }, 500);
          }
          alvoId = data.user.id;
          acao = "convidou";
        }

        const { error: erroPapel } = await sb
          .from("user_roles")
          .upsert({ user_id: alvoId, role: "admin" }, { onConflict: "user_id,role" });
        if (erroPapel) {
          console.error("Falha ao dar papel:", erroPapel);
          return json({ erro: "Não foi possível dar acesso agora." }, 500);
        }

        await sb.from("admin_log").insert({
          acao,
          alvo_email: dados.email,
          autor: quem.user.id,
          autor_email: quem.user.email || "",
        });

        return json({ ok: true, acao });
      },
    },
  },
});
