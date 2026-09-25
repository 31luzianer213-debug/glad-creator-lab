import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { Heart, Menu, X, Shirt } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo-bazar.png.asset.json";
import { textoStatus, type Peca, ehNovidade, nomeCategoria } from "@/lib/catalogo";

const LINKS = [
  { to: "/", label: "Início" },
  { to: "/produtos", label: "Catálogo" },
  { to: "/regras", label: "Regras" },
  { to: "/minha-reserva", label: "Minha reserva" },
  { to: "/avaliar", label: "Avaliar" },
] as const;

export function SiteLayout({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-secondary focus:px-4 focus:py-2 focus:text-secondary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-secondary">
            <img src={logo.url} alt="" width={44} height={44} className="h-11 w-11 rounded-full" />
            <span className="font-brand text-2xl font-normal tracking-wide">Bazar de Garagem</span>
          </Link>
          <nav aria-label="Principal" className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeOptions={{ exact: l.to === "/" }}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-secondary"
                activeProps={{ className: "bg-muted text-secondary" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            className="rounded-lg p-2 md:hidden"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={aberto}
            onClick={() => setAberto((v) => !v)}
          >
            {aberto ? <X /> : <Menu />}
          </button>
        </div>
        {aberto && (
          <nav aria-label="Menu móvel" className="border-t border-border px-4 pb-4 md:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setAberto(false)}
                className="block rounded-lg px-3 py-3 font-semibold text-secondary hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src={logo.url} alt="Logo Bazar de Garagem" width={48} height={48} className="h-12 w-12 rounded-full" />
            <p>Bazar de Garagem · Santarém - PA · Moda sustentável ♻️ · Novos e Usados 🛍️</p>
          </div>
          <div className="flex gap-4">
            <Link to="/privacidade" className="underline underline-offset-4">
              Política de Privacidade
            </Link>
            <Link to="/regras" className="underline underline-offset-4">
              Regras da troca
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function SeloStatus({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-extrabold uppercase tracking-wide",
        status === "available" && "bg-success text-success-foreground",
        status === "reserved" && "bg-primary text-primary-foreground",
        status !== "available" && status !== "reserved" && "bg-secondary text-secondary-foreground",
      )}
    >
      {textoStatus(status)}
    </span>
  );
}

export function CartaoPeca({
  peca,
  favorita,
  onFavoritar,
}: {
  peca: Peca;
  favorita: boolean;
  onFavoritar: () => void;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-muted">
        {peca.imagem ? (
          <img
            src={peca.imagem}
            alt={peca.nome}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-muted-foreground">
            <Shirt size={48} aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <SeloStatus status={peca.status} />
          {ehNovidade(peca) && (
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-extrabold uppercase text-accent-foreground">
              Novidade
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onFavoritar}
          aria-pressed={favorita}
          aria-label={favorita ? `Remover ${peca.nome} dos favoritos` : `Favoritar ${peca.nome}`}
          className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-card/90 shadow"
        >
          <Heart size={18} className={favorita ? "fill-secondary text-secondary" : "text-secondary"} />
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          #{peca.codigo} · {nomeCategoria(peca.categoria)}
        </p>
        <h3 className="text-lg font-bold text-secondary">
          <Link
            to="/produto/$codigo"
            params={{ codigo: peca.codigo }}
            className="after:absolute after:inset-0 focus-visible:outline-none"
          >
            {peca.nome}
          </Link>
        </h3>
        <p className="text-sm text-muted-foreground">
          Tamanho {peca.tamanho} · {peca.estado}
        </p>
        {peca.troca && <p className="mt-auto pt-3 text-sm font-semibold text-secondary">Troca: {peca.troca}</p>}
      </div>
    </article>
  );
}

export function Cabecalho({ kicker, titulo, children }: { kicker: string; titulo: string; children?: ReactNode }) {
  return (
    <div className="mb-8">
      <p className="font-brand text-lg tracking-[.12em] text-secondary">{kicker}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-secondary sm:text-4xl"><span className="sublinhado-pincel">{titulo}</span></h1>
      {children && <div className="mt-3 max-w-2xl text-muted-foreground">{children}</div>}
    </div>
  );
}
