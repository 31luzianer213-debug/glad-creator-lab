import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { SiteLayout, CartaoPeca, Cabecalho } from "@/components/brecho/Site";
import { pecasQuery } from "@/lib/catalogo-queries";
import { useFavoritos } from "@/lib/use-favoritos";
import { CATEGORIAS, URL_SITE, buscaNormalizada, nomeCategoria } from "@/lib/catalogo";

const TITULO = "Catálogo de peças · Brechó Solidário Online";
const DESCRICAO =
  "Roupas adultas, infantis, calçados e acessórios disponíveis para troca solidária por alimentos ou itens de higiene.";

const Busca = z.object({
  categoria: z.enum(["todas", "adult", "children", "shoes"]).catch("todas").optional(),
});

export const Route = createFileRoute("/produtos")({
  validateSearch: Busca,
  loader: ({ context }) => context.queryClient.ensureQueryData(pecasQuery),
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${URL_SITE}/produtos` },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: `${URL_SITE}/produtos` }],
  }),
  component: Catalogo,
});

type Ordem = "recentes" | "nome" | "codigo";

function Catalogo() {
  const { data } = useSuspenseQuery(pecasQuery);
  const { categoria = "todas" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { favoritos, alternar } = useFavoritos();
  const [texto, setTexto] = useState("");
  const [status, setStatus] = useState<"available" | "todas">("available");
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [soFavoritos, setSoFavoritos] = useState(false);

  const lista = useMemo(() => {
    const termo = buscaNormalizada(texto);
    const filtradas = data.pecas.filter((p) => {
      if (categoria !== "todas" && p.categoria !== categoria) return false;
      if (status === "available" && p.status !== "available") return false;
      if (soFavoritos && !favoritos.includes(p.codigo)) return false;
      if (termo) {
        const alvo = buscaNormalizada(
          [p.nome, p.codigo, p.tamanho, p.descricao, p.estado, nomeCategoria(p.categoria)].join(" "),
        );
        if (!alvo.includes(termo)) return false;
      }
      return true;
    });
    if (ordem === "nome") filtradas.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (ordem === "codigo") filtradas.sort((a, b) => a.codigo.localeCompare(b.codigo, "pt-BR", { numeric: true }));
    return filtradas;
  }, [data.pecas, categoria, status, texto, ordem, soFavoritos, favoritos]);

  const campo =
    "rounded-xl border border-input bg-card px-4 py-3 text-sm font-semibold text-secondary focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <Cabecalho kicker="Catálogo solidário" titulo="Encontre uma peça para recomeçar">
          Cada peça tem um valor de troca em doação. Toque na peça para ver os detalhes e reservar.
        </Cabecalho>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Categorias">
          {[{ valor: "todas", nome: "Todas" }, ...CATEGORIAS].map((c) => (
            <button
              key={c.valor}
              type="button"
              aria-pressed={categoria === c.valor}
              onClick={() =>
                navigate({ search: { categoria: c.valor as "todas" }, replace: true, resetScroll: false })
              }
              className={
                categoria === c.valor
                  ? "rounded-full bg-secondary px-4 py-2 text-sm font-bold text-secondary-foreground"
                  : "rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-secondary hover:bg-muted"
              }
            >
              {c.nome}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="sr-only" htmlFor="busca">
            Buscar peças
          </label>
          <input
            id="busca"
            type="search"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar por nome, tamanho ou código"
            className={campo}
            maxLength={80}
          />
          <select aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value as "todas")} className={campo}>
            <option value="available">Só disponíveis</option>
            <option value="todas">Todas as situações</option>
          </select>
          <select aria-label="Ordenar" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className={campo}>
            <option value="recentes">Mais recentes</option>
            <option value="nome">Nome (A–Z)</option>
            <option value="codigo">Código</option>
          </select>
          <button type="button" aria-pressed={soFavoritos} onClick={() => setSoFavoritos((v) => !v)} className={campo}>
            {soFavoritos ? "♥ Favoritas" : "♡ Favoritas"} ({favoritos.length})
          </button>
        </div>

        <p className="mt-6 text-sm text-muted-foreground" aria-live="polite">
          {lista.length} {lista.length === 1 ? "peça encontrada" : "peças encontradas"}
        </p>

        {data.erro ? (
          <p className="mt-4 rounded-2xl bg-muted p-6">{data.erro}</p>
        ) : lista.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            Nenhuma peça com esses filtros. Tente limpar a busca ou escolher outra categoria.
          </div>
        ) : (
          <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((p) => (
              <CartaoPeca
                key={p.codigo}
                peca={p}
                favorita={favoritos.includes(p.codigo)}
                onFavoritar={() => alternar(p.codigo)}
              />
            ))}
          </div>
        )}
      </div>
    </SiteLayout>
  );
}
