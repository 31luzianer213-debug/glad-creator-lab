import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowRight, HandHeart, Search, PackageCheck } from "lucide-react";
import { SiteLayout, CartaoPeca } from "@/components/brecho/Site";
import { pecasQuery } from "@/lib/catalogo-queries";
import { useFavoritos } from "@/lib/use-favoritos";
import { URL_SITE } from "@/lib/catalogo";

const TITULO = "Bazar de Garagem · Roupas em troca de doações";
const DESCRICAO =
  "Escolha roupas, calçados e acessórios e troque por alimentos não perecíveis ou itens de higiene. Consumo consciente que ajuda quem precisa.";
const IMAGEM = "https://images.pexels.com/photos/6068975/pexels-photo-6068975.jpeg";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(pecasQuery),
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL_SITE },
      { property: "og:image", content: IMAGEM },
      { name: "twitter:image", content: IMAGEM },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: URL_SITE }],
  }),
  component: Inicio,
});

const PASSOS = [
  { icone: Search, titulo: "Escolha a peça", texto: "Veja o catálogo e encontre algo do seu tamanho." },
  { icone: HandHeart, titulo: "Reserve com uma doação", texto: "Informe o alimento ou item de higiene que vai trazer." },
  { icone: PackageCheck, titulo: "Retire e doe", texto: "A equipe confirma, você entrega a doação e leva a peça." },
];

function Inicio() {
  const { data } = useSuspenseQuery(pecasQuery);
  const { favoritos, alternar } = useFavoritos();
  const disponiveis = data.pecas.filter((p) => p.status === "available");
  const trocadas = data.pecas.filter((p) => p.status === "exchanged").length;

  return (
    <SiteLayout>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div>
            <p className="font-brand text-xl tracking-[.12em] text-secondary">
              Os melhores garimpos aqui!
            </p>
            <h1 className="mt-3 text-4xl font-extrabold leading-[1.02] text-secondary sm:text-6xl">
              <span className="sublinhado-pincel">Bazar de Garagem</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              Aqui as roupas não são vendidas: você leva a peça que escolher e, em troca, doa um alimento
              não perecível ou um produto de higiene.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/produtos"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5"
              >
                Ver catálogo <ArrowRight size={18} />
              </Link>
              <Link
                to="/regras"
                className="rounded-xl border-2 border-secondary px-6 py-3 font-bold text-secondary hover:bg-muted"
              >
                Como funciona
              </Link>
            </div>
            <dl className="mt-10 flex gap-8">
              <div>
                <dt className="text-sm text-muted-foreground">Peças disponíveis</dt>
                <dd className="font-display text-3xl font-extrabold text-secondary">{disponiveis.length}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Trocas feitas</dt>
                <dd className="font-display text-3xl font-extrabold text-secondary">{trocadas}</dd>
              </div>
            </dl>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 -rotate-3 rounded-[2rem] bg-accent" aria-hidden />
            <img
              src={IMAGEM}
              alt="Araras com roupas doadas prontas para troca"
              className="relative aspect-[4/3] w-full rounded-[2rem] object-cover shadow-xl"
              width={1200}
              height={900}
            />
          </div>
        </div>
      </section>

      <div className="border-y-2 border-secondary bg-primary py-3 text-center font-brand text-lg tracking-[.12em] text-primary-foreground">
        25 de Setembro · Santarém - PA · Moda sustentável ♻️ · Novos e Usados 🛍️ · Empreendedorismo
      </div>
      <section className="bg-card py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-extrabold text-secondary sm:text-3xl">Como funciona a troca?</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {PASSOS.map((p, i) => (
              <li key={p.titulo} className="rounded-2xl border border-border bg-background p-6">
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                  <p.icone aria-hidden />
                </span>
                <h3 className="mt-4 text-lg font-bold text-secondary">
                  {i + 1}. {p.titulo}
                </h3>
                <p className="mt-1 text-muted-foreground">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-2xl font-extrabold text-secondary sm:text-3xl">Garimpos da semana</h2>
          <Link to="/produtos" className="font-bold text-secondary underline underline-offset-4">
            Ver todas as peças
          </Link>
        </div>
        {data.erro ? (
          <p className="mt-6 rounded-2xl bg-muted p-6">{data.erro}</p>
        ) : disponiveis.length === 0 ? (
          <p className="mt-6 rounded-2xl bg-muted p-6 text-muted-foreground">
            Novas peças estão sendo separadas. Volte em breve!
          </p>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {disponiveis.slice(0, 8).map((p) => (
              <CartaoPeca
                key={p.codigo}
                peca={p}
                favorita={favoritos.includes(p.codigo)}
                onFavoritar={() => alternar(p.codigo)}
              />
            ))}
          </div>
        )}
      </section>
    </SiteLayout>
  );
}
