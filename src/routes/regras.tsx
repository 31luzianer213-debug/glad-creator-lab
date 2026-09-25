import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteLayout, Cabecalho } from "@/components/brecho/Site";
import { URL_SITE } from "@/lib/catalogo";

const TITULO = "Regras da troca solidária · Bazar de Garagem";
const DESCRICAO =
  "Entenda como funciona a troca: as peças não são vendidas, são trocadas por alimentos não perecíveis ou produtos de higiene novos.";

export const Route = createFileRoute("/regras")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "article" },
      { property: "og:url", content: `${URL_SITE}/regras` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${URL_SITE}/regras` }],
  }),
  component: Regras,
});

const REGRAS = [
  "Os produtos oferecidos no brechó não são vendidos por dinheiro.",
  "Cada peça possui um valor de troca solidária indicado na página do produto.",
  "Serão aceitos alimentos não perecíveis dentro do prazo de validade.",
  "Serão aceitos produtos de higiene pessoal novos e lacrados.",
  "A reserva somente será confirmada após análise da equipe.",
  "Caso a troca não seja realizada no prazo, a peça voltará ao catálogo.",
];

function Regras() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-12">
        <Cabecalho kicker="Transparência e cuidado" titulo="Regras da troca solidária" />
        <ul className="space-y-4 rounded-[1.5rem] bg-card p-6 shadow-sm sm:p-10">
          {REGRAS.map((r) => (
            <li key={r} className="flex gap-3 text-secondary">
              <CheckCircle2 className="mt-0.5 shrink-0 text-primary" aria-hidden />
              <span>{r}</span>
            </li>
          ))}
        </ul>
        <Link to="/produtos" className="mt-8 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
          Escolher uma peça
        </Link>
      </div>
    </SiteLayout>
  );
}
