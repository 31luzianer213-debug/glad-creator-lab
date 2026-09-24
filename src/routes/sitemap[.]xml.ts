import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { URL_SITE } from "@/lib/catalogo";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const fixas = ["", "/produtos", "/regras", "/minha-reserva", "/avaliar", "/privacidade"];
        let pecas: { codigo: string; createdAt: string }[] = [];
        try {
          const key = process.env["SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_ANON_KEY"]!;
          const sb = createClient(process.env["SUPABASE_URL"]!, key, {
            auth: { persistSession: false },
            global: {
              fetch: (input, init) => {
                const h = new Headers(init?.headers);
                if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
                h.set("apikey", key);
                return fetch(input, { ...init, headers: h });
              },
            },
          });
          const { data } = await sb.from("produtos").select("codigo, createdAt").eq("status", "available").limit(1000);
          pecas = (data ?? []) as typeof pecas;
        } catch (e) {
          console.error("sitemap:", e);
        }
        const urls = [
          ...fixas.map((p) => `<url><loc>${URL_SITE}${p}</loc></url>`),
          ...pecas.map(
            (p) =>
              `<url><loc>${URL_SITE}/produto/${esc(encodeURIComponent(p.codigo))}</loc>${
                p.createdAt ? `<lastmod>${p.createdAt.slice(0, 10)}</lastmod>` : ""
              }</url>`,
          ),
        ];
        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
