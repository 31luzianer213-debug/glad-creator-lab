import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { SiteLayout, Cabecalho } from "@/components/brecho/Site";
import { consultarReserva } from "@/lib/catalogo.functions";
import { CHAVE_RESERVAS, URL_SITE, UUID_REGEX, dataBonita, lerLista } from "@/lib/catalogo";
import { enviarFormulario } from "@/lib/envio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/minha-reserva")({
  validateSearch: z.object({ codigo: z.string().max(40).optional().catch(undefined) }),
  head: () => ({
    meta: [
      { title: "Minha reserva · Brechó Solidário Online" },
      { name: "description", content: "Acompanhe a situação da sua reserva no Brechó Solidário usando o código recebido." },
      { property: "og:title", content: "Minha reserva · Brechó Solidário Online" },
      { property: "og:description", content: "Consulte a situação da sua reserva com o código de acompanhamento." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${URL_SITE}/minha-reserva` },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MinhaReserva,
});

const ETAPAS = ["Pendente", "Em análise", "Confirmada", "Vendido"];
const NOME_ETAPA: Record<string, string> = { Vendido: "Troca concluída" };

type Reserva = { status: string; codigoProduto: string; nomeProduto: string; createdAt: string };

function MinhaReserva() {
  const { codigo: codigoInicial } = Route.useSearch();
  const consultar = useServerFn(consultarReserva);
  const [codigo, setCodigo] = useState(codigoInicial ?? "");
  const [recentes, setRecentes] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [resultado, setResultado] = useState<{ id: string; reserva: Reserva | null } | null>(null);
  const [erro, setErro] = useState("");
  const [pedidoEnviado, setPedidoEnviado] = useState(false);

  useEffect(() => {
    setRecentes(lerLista(CHAVE_RESERVAS).filter((id) => UUID_REGEX.test(id)));
    if (codigoInicial && UUID_REGEX.test(codigoInicial)) buscar(codigoInicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function buscar(id: string) {
    const limpo = id.trim();
    setErro("");
    setPedidoEnviado(false);
    if (!UUID_REGEX.test(limpo)) {
      setErro("Código inválido. Ele tem 36 caracteres, como 1a2b3c4d-....");
      return;
    }
    setCarregando(true);
    try {
      const r = await consultar({ data: { id: limpo } });
      if (r.erro) setErro(r.erro);
      else setResultado({ id: limpo, reserva: r.reserva as Reserva | null });
    } catch {
      setErro("Não foi possível consultar agora. Tente novamente.");
    } finally {
      setCarregando(false);
    }
  }

  async function pedirExclusao(id: string) {
    if (!window.confirm("Pedir que a equipe apague seu nome e contato desta reserva?")) return;
    try {
      await enviarFormulario("/api/public/exclusao", { id });
      setPedidoEnviado(true);
      toast.success("Pedido de exclusão registrado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível enviar.");
    }
  }

  const r = resultado?.reserva;
  const cancelada = r?.status === "Cancelada";
  const etapaAtual = r ? ETAPAS.indexOf(r.status) : -1;

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Cabecalho kicker="Acompanhamento" titulo="Como está minha reserva?">
          Digite o código que você recebeu ao reservar.
        </Cabecalho>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            buscar(codigo);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="codigo" className="sr-only">Código da reserva</label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Cole aqui seu código"
            maxLength={40}
            className="flex-1 rounded-xl border border-input bg-card px-4 py-3 font-mono text-secondary focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button type="submit" disabled={carregando} className="rounded-xl bg-primary px-6 py-3 font-bold text-primary-foreground disabled:opacity-60">
            {carregando ? "Consultando..." : "Consultar"}
          </button>
        </form>

        {recentes.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-bold text-muted-foreground">Reservas feitas neste aparelho:</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {recentes.slice(0, 6).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setCodigo(id);
                    buscar(id);
                  }}
                  className="rounded-full border border-border bg-card px-3 py-1 font-mono text-xs text-secondary hover:bg-muted"
                >
                  {id.slice(0, 8)}…
                </button>
              ))}
            </div>
          </div>
        )}

        {erro && <p role="alert" className="mt-6 rounded-xl bg-destructive/10 p-4 font-semibold text-destructive">{erro}</p>}

        {resultado && !r && (
          <p className="mt-6 rounded-2xl bg-muted p-6">Não encontramos reserva com esse código. Confira se copiou certinho.</p>
        )}

        {r && (
          <section aria-live="polite" className="mt-8 rounded-[1.5rem] bg-card p-6 shadow-sm">
            <p className="text-xs font-bold uppercase text-muted-foreground">Feita em {dataBonita(r.createdAt)}</p>
            <h2 className="mt-1 text-xl font-extrabold text-secondary">
              #{r.codigoProduto} · {r.nomeProduto}
            </h2>
            {cancelada ? (
              <p className="mt-4 rounded-xl bg-muted p-4 font-semibold">
                Esta reserva foi cancelada. <Link to="/produtos" className="text-primary underline">Veja outras peças</Link>.
              </p>
            ) : (
              <ol className="mt-6 space-y-3">
                {ETAPAS.map((etapa, i) => (
                  <li key={etapa} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                        i <= etapaAtual ? "bg-success text-success-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {i < etapaAtual ? "✓" : i + 1}
                    </span>
                    <span className={cn("font-semibold", i === etapaAtual ? "text-secondary" : "text-muted-foreground")}>
                      {NOME_ETAPA[etapa] ?? etapa}
                      {i === etapaAtual && " — situação atual"}
                    </span>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-6 border-t border-border pt-4">
              {pedidoEnviado ? (
                <p className="font-bold text-success">Pedido enviado. A equipe vai apagar seus dados.</p>
              ) : (
                <button type="button" onClick={() => pedirExclusao(resultado!.id)} className="rounded-full border border-border px-4 py-2 text-sm font-bold text-secondary hover:bg-muted">
                  Pedir exclusão dos meus dados
                </button>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Saiba mais na <Link to="/privacidade" className="underline">Política de Privacidade</Link>.
              </p>
            </div>
          </section>
        )}
      </div>
    </SiteLayout>
  );
}
