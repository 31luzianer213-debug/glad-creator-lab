import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, Copy } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, Cabecalho } from "@/components/brecho/Site";
import { pecaQuery } from "@/lib/catalogo-queries";
import { CHAVE_RESERVAS, TIPOS_DOACAO, lerLista, salvarLista } from "@/lib/catalogo";
import { enviarFormulario, novoId } from "@/lib/envio";

export const Route = createFileRoute("/reservar/$codigo")({
  loader: async ({ context, params }) => {
    const { peca } = await context.queryClient.ensureQueryData(pecaQuery(params.codigo));
    if (!peca) throw notFound();
    return { peca };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `Reservar ${loaderData?.peca.nome ?? "peça"} · Brechó Solidário` },
      { name: "description", content: "Solicite a reserva desta peça informando a doação que vai entregar na troca." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Reservar peça · Brechó Solidário Online" },
      { property: "og:description", content: "Reserve a peça e informe sua doação solidária." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  notFoundComponent: () => (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-secondary">Essa peça não existe mais</h1>
        <Link to="/produtos" className="mt-6 inline-block rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Ver catálogo</Link>
      </div>
    </SiteLayout>
  ),
  errorComponent: ({ reset }) => (
    <SiteLayout>
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-extrabold text-secondary">Não conseguimos abrir a reserva</h1>
        <button type="button" onClick={reset} className="mt-6 rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">Tentar de novo</button>
      </div>
    </SiteLayout>
  ),
  component: Reservar,
});

const campo =
  "w-full rounded-xl border border-input bg-card px-4 py-3 text-secondary focus:outline-none focus:ring-2 focus:ring-ring";

function Reservar() {
  const { codigo } = Route.useParams();
  const { data } = useSuspenseQuery(pecaQuery(codigo));
  const queryClient = useQueryClient();
  const peca = data.peca!;
  const inicio = useRef(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [confirmada, setConfirmada] = useState<string | null>(null);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErro("");
    if (!f.get("consentimento")) {
      setErro("Para reservar, aceite a Política de Privacidade.");
      return;
    }
    setEnviando(true);
    const id = novoId();
    try {
      await enviarFormulario("/api/public/reservar", {
        id,
        nomeCompleto: String(f.get("nome") || "").trim(),
        contato: String(f.get("contato") || "").trim(),
        codigoProduto: peca.codigo,
        tipoDoacao: String(f.get("tipo") || ""),
        itemDoacao: String(f.get("item") || "").trim(),
        quantidade: Number(f.get("quantidade") || 1),
        consentimento: true,
        site: String(f.get("site") || ""),
        inicio: inicio.current || undefined,
      });
      salvarLista(CHAVE_RESERVAS, [id, ...lerLista(CHAVE_RESERVAS).filter((x) => x !== id)].slice(0, 20));
      queryClient.invalidateQueries({ queryKey: ["pecas"] });
      queryClient.invalidateQueries({ queryKey: ["peca", codigo] });
      setConfirmada(id);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : "Não foi possível enviar.";
      setErro(mensagem);
      toast.error(mensagem);
    } finally {
      setEnviando(false);
    }
  }

  if (confirmada) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-2xl px-4 py-14 text-center">
          <CheckCircle2 size={64} className="mx-auto text-success" aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold text-secondary">Reserva solicitada!</h1>
          <p className="mt-3 text-muted-foreground">
            A peça <strong>{peca.nome}</strong> ficou separada para você. A equipe vai analisar e entrar em contato.
          </p>
          <div className="mt-8 rounded-2xl border-2 border-dashed border-primary bg-card p-6">
            <p className="text-sm font-bold uppercase text-muted-foreground">Seu código de acompanhamento</p>
            <p className="mt-2 break-all font-mono text-lg font-bold text-secondary">{confirmada}</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(confirmada).then(() => toast.success("Código copiado"))}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-bold text-secondary"
            >
              <Copy size={16} /> Copiar código
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Guardamos esse código neste aparelho também.</p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/minha-reserva" search={{ codigo: confirmada }} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground">
              Acompanhar reserva
            </Link>
            <Link to="/produtos" className="rounded-xl border-2 border-secondary px-6 py-3 font-bold text-secondary">
              Voltar ao catálogo
            </Link>
          </div>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Link to="/produto/$codigo" params={{ codigo }} className="inline-flex items-center gap-2 text-sm font-bold text-secondary hover:text-primary">
          <ArrowLeft size={18} /> Voltar à peça
        </Link>
        <div className="mt-6">
          <Cabecalho kicker={`Peça #${peca.codigo}`} titulo="Vamos preparar sua troca">
            Você está reservando <strong className="text-secondary">{peca.nome}</strong>
            {peca.troca ? <> · troca sugerida: <strong className="text-secondary">{peca.troca}</strong></> : null}.
          </Cabecalho>
        </div>

        {peca.status !== "available" ? (
          <p className="rounded-2xl bg-muted p-6 font-semibold">
            Poxa, essa peça acabou de ser reservada. <Link to="/produtos" className="text-primary underline">Veja outras peças</Link>.
          </p>
        ) : (
          <form
            onSubmit={enviar}
            onFocus={() => {
              if (!inicio.current) inicio.current = Date.now();
            }}
            className="space-y-5 rounded-[1.5rem] bg-card p-6 shadow-sm sm:p-9"
            noValidate={false}
          >
            <div>
              <label htmlFor="nome" className="mb-2 block text-sm font-bold text-secondary">Nome completo</label>
              <input id="nome" name="nome" required minLength={3} maxLength={120} autoComplete="name" className={campo} />
            </div>
            <div>
              <label htmlFor="contato" className="mb-2 block text-sm font-bold text-secondary">WhatsApp com DDD ou e-mail</label>
              <input id="contato" name="contato" required minLength={8} maxLength={120} autoComplete="tel" className={campo} />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-bold text-secondary">O que você vai entregar na troca?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {TIPOS_DOACAO.map((t, i) => (
                  <label key={t} className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-4 has-[:checked]:border-primary has-[:checked]:bg-accent">
                    <input type="radio" name="tipo" value={t} defaultChecked={i === 0} />
                    <span className="font-semibold">{t}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <div>
                <label htmlFor="item" className="mb-2 block text-sm font-bold text-secondary">Qual item?</label>
                <input id="item" name="item" required minLength={2} maxLength={300} placeholder="Ex.: 2 kg de arroz" className={campo} />
              </div>
              <div>
                <label htmlFor="quantidade" className="mb-2 block text-sm font-bold text-secondary">Quantidade</label>
                <input id="quantidade" name="quantidade" type="number" min={1} max={100} defaultValue={1} required className={campo} />
              </div>
            </div>
            <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
              <label>Não preencha<input type="text" name="site" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <label className="flex items-start gap-3 rounded-xl border border-border p-4">
              <input type="checkbox" name="consentimento" required className="mt-1" />
              <span className="text-sm leading-relaxed text-muted-foreground">
                Li e aceito a{" "}
                <Link to="/privacidade" target="_blank" className="font-bold text-primary underline">Política de Privacidade</Link>.
                Meu nome e contato serão usados só para combinar esta troca e apagados até 6 meses após a conclusão.
              </span>
            </label>
            {erro && <p role="alert" className="rounded-xl bg-destructive/10 p-4 font-semibold text-destructive">{erro}</p>}
            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-primary px-6 py-4 font-bold text-primary-foreground shadow-md disabled:opacity-60"
            >
              {enviando ? "Enviando..." : "Solicitar reserva"}
            </button>
          </form>
        )}
      </div>
    </SiteLayout>
  );
}
