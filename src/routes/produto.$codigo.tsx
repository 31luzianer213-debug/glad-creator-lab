import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Heart, Share2, Shirt } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, SeloStatus, CartaoPeca } from "@/components/brecho/Site";
import { pecaQuery, pecasQuery } from "@/lib/catalogo-queries";
import { useFavoritos } from "@/lib/use-favoritos";
import { URL_SITE, nomeCategoria } from "@/lib/catalogo";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/produto/$codigo")({
  loader: async ({ context, params }) => {
    const { peca } = await context.queryClient.ensureQueryData(pecaQuery(params.codigo));
    if (!peca) throw notFound();
    return { peca };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Peça não encontrada · Brechó Solidário Online" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const p = loaderData.peca;
    const titulo = `${p.nome} (tam. ${p.tamanho}) · Brechó Solidário`;
    const descricao = (
      p.descricao ||
      `${nomeCategoria(p.categoria)}, tamanho ${p.tamanho}, estado ${p.estado}. Troca solidária: ${p.troca || "doação"}.`
    ).slice(0, 160);
    const url = `${URL_SITE}/produto/${encodeURIComponent(params.codigo)}`;
    const imagemAbsoluta = /^https:\/\//.test(p.imagem) ? p.imagem : "";
    return {
      meta: [
        { title: titulo },
        { name: "description", content: descricao },
        { property: "og:title", content: titulo },
        { property: "og:description", content: descricao },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        ...(imagemAbsoluta
          ? [
              { property: "og:image", content: imagemAbsoluta },
              { name: "twitter:image", content: imagemAbsoluta },
            ]
          : []),
        { name: "twitter:card", content: imagemAbsoluta ? "summary_large_image" : "summary" },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: PecaNaoEncontrada,
  errorComponent: ErroPeca,
  component: DetalhePeca,
});

function PecaNaoEncontrada() {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-3xl font-extrabold text-secondary">Essa peça não está mais no catálogo</h1>
        <p className="mt-3 text-muted-foreground">Ela pode já ter sido trocada. Veja outras peças disponíveis.</p>
        <Link to="/produtos" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
          Ver catálogo
        </Link>
      </div>
    </SiteLayout>
  );
}

function ErroPeca({ reset }: { reset: () => void }) {
  return (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-secondary">Não conseguimos carregar esta peça</h1>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
          Tentar de novo
        </button>
      </div>
    </SiteLayout>
  );
}

function DetalhePeca() {
  const { codigo } = Route.useParams();
  const { data } = useSuspenseQuery(pecaQuery(codigo));
  const { data: todas } = useQuery(pecasQuery);
  const { favoritos, alternar } = useFavoritos();
  const peca = data.peca!;
  const favorita = favoritos.includes(peca.codigo);
  const disponivel = peca.status === "available";
  const parecidas = (todas?.pecas ?? [])
    .filter((p) => p.codigo !== peca.codigo && p.status === "available" && p.categoria === peca.categoria)
    .slice(0, 3);

  async function compartilhar() {
    const url = `${window.location.origin}/produto/${encodeURIComponent(peca.codigo)}`;
    const texto = `Olha essa peça no Brechó Solidário: ${peca.nome} (tam. ${peca.tamanho})`;
    if (navigator.share) {
      try {
        await navigator.share({ title: peca.nome, text: texto, url });
        return;
      } catch {
        /* cancelado */
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${texto} ${url}`)}`, "_blank", "noopener");
  }

  const linhas: [string, string][] = [
    ["Categoria", nomeCategoria(peca.categoria)],
    ["Tamanho", peca.tamanho],
    ["Estado", peca.estado],
    ["Código", `#${peca.codigo}`],
  ];

  return (
    <SiteLayout>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <Link to="/produtos" className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary">
          <ArrowLeft size={18} /> Voltar ao catálogo
        </Link>
        <div className="mt-6 grid gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-[1.5rem] bg-muted">
            {peca.imagem ? (
              <img src={peca.imagem} alt={peca.nome} className="aspect-[4/5] w-full object-cover" />
            ) : (
              <div className="grid aspect-[4/5] place-items-center text-muted-foreground">
                <Shirt size={72} aria-hidden />
              </div>
            )}
          </div>
          <div>
            <SeloStatus status={peca.status} />
            <h1 className="mt-4 text-4xl font-extrabold text-secondary">{peca.nome}</h1>
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {linhas.map(([rotulo, valor]) => (
                <div key={rotulo} className="rounded-xl bg-card p-4 shadow-sm">
                  <dt className="text-xs font-bold uppercase text-muted-foreground">{rotulo}</dt>
                  <dd className="mt-1 font-semibold text-secondary">{valor}</dd>
                </div>
              ))}
            </dl>
            {peca.troca && (
              <div className="mt-4 rounded-xl border-2 border-primary/40 bg-accent p-4">
                <p className="text-xs font-bold uppercase text-accent-foreground">Valor da troca solidária</p>
                <p className="mt-1 text-lg font-bold text-secondary">{peca.troca}</p>
              </div>
            )}
            {peca.descricao && <p className="mt-6 whitespace-pre-line leading-relaxed text-muted-foreground">{peca.descricao}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              {disponivel ? (
                <Link
                  to="/reservar/$codigo"
                  params={{ codigo: peca.codigo }}
                  className="rounded-xl bg-primary px-7 py-3 font-bold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5"
                >
                  Quero reservar
                </Link>
              ) : (
                <p className="rounded-xl bg-muted px-5 py-3 font-semibold text-muted-foreground">
                  Esta peça já foi {peca.status === "reserved" ? "reservada" : "trocada"}.
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  alternar(peca.codigo);
                  toast.success(favorita ? "Removida dos favoritos" : "Salva nos favoritos");
                }}
                aria-pressed={favorita}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-bold text-secondary"
              >
                <Heart size={18} className={favorita ? "fill-primary text-primary" : ""} /> {favorita ? "Favorita" : "Favoritar"}
              </button>
              <button
                type="button"
                onClick={compartilhar}
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-3 font-bold text-secondary"
              >
                <Share2 size={18} /> Compartilhar
              </button>
            </div>
          </div>
        </div>
        {parecidas.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-extrabold text-secondary">Você também pode gostar</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {parecidas.map((p) => (
                <CartaoPeca key={p.codigo} peca={p} favorita={favoritos.includes(p.codigo)} onFavoritar={() => alternar(p.codigo)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
