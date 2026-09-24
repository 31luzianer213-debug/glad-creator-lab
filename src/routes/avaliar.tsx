import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState, type FormEvent } from "react";
import { Star, HeartHandshake } from "lucide-react";
import { toast } from "sonner";
import { SiteLayout, Cabecalho } from "@/components/brecho/Site";
import { URL_SITE } from "@/lib/catalogo";
import { enviarFormulario } from "@/lib/envio";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/avaliar")({
  head: () => ({
    meta: [
      { title: "Avalie sua troca · Brechó Solidário Online" },
      { name: "description", content: "Conte como foi sua experiência no Brechó Solidário e ajude a melhorar as próximas trocas." },
      { property: "og:title", content: "Avalie sua troca · Brechó Solidário Online" },
      { property: "og:description", content: "Sua opinião ajuda a melhorar o Brechó Solidário." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${URL_SITE}/avaliar` },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Avaliar,
});

const PERGUNTAS = [
  { nome: "facilidade", texto: "Foi fácil encontrar e reservar a peça?", opcoes: ["Muito fácil", "Fácil", "Mais ou menos", "Difícil"] },
  { nome: "satisfacao", texto: "Ficou satisfeita(o) com a peça?", opcoes: ["Muito", "Sim", "Pouco", "Não"] },
  { nome: "participariaNovamente", texto: "Participaria de novo?", opcoes: ["Sim", "Talvez", "Não"] },
  { nome: "recomendaria", texto: "Recomendaria para alguém?", opcoes: ["Sim", "Talvez", "Não"] },
] as const;

function Avaliar() {
  const [nota, setNota] = useState(5);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const inicio = useRef(0);

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      await enviarFormulario("/api/public/avaliar", {
        nota,
        facilidade: String(f.get("facilidade") || ""),
        satisfacao: String(f.get("satisfacao") || ""),
        participariaNovamente: String(f.get("participariaNovamente") || ""),
        recomendaria: String(f.get("recomendaria") || ""),
        sugestao: String(f.get("sugestao") || "").slice(0, 1000),
        site: String(f.get("site") || ""),
        inicio: inicio.current || undefined,
      });
      setEnviado(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <SiteLayout>
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <HeartHandshake size={64} className="mx-auto text-primary" aria-hidden />
          <h1 className="mt-4 text-3xl font-extrabold text-secondary">Obrigado pela avaliação!</h1>
          <p className="mt-3 text-muted-foreground">Sua opinião ajuda a melhorar as próximas trocas.</p>
        </div>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Cabecalho kicker="Pós-troca" titulo="Conte como foi sua experiência" />
        <form
          onSubmit={enviar}
          onFocus={() => {
            if (!inicio.current) inicio.current = Date.now();
          }}
          className="space-y-6 rounded-[1.5rem] bg-card p-6 shadow-sm sm:p-9"
        >
          <fieldset>
            <legend className="mb-2 text-sm font-bold text-secondary">Nota geral</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setNota(n)}
                  aria-label={`${n} de 5 estrelas`}
                  aria-pressed={nota === n}
                  className="rounded-lg p-1"
                >
                  <Star size={34} className={cn(n <= nota ? "fill-primary text-primary" : "text-border")} />
                </button>
              ))}
            </div>
          </fieldset>
          {PERGUNTAS.map((p) => (
            <fieldset key={p.nome}>
              <legend className="mb-2 text-sm font-bold text-secondary">{p.texto}</legend>
              <div className="flex flex-wrap gap-2">
                {p.opcoes.map((o, i) => (
                  <label key={o} className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold has-[:checked]:border-primary has-[:checked]:bg-accent">
                    <input type="radio" name={p.nome} value={o} defaultChecked={i === 0} className="sr-only" />
                    {o}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div>
            <label htmlFor="sugestao" className="mb-2 block text-sm font-bold text-secondary">Sugestão (opcional)</label>
            <textarea id="sugestao" name="sugestao" rows={4} maxLength={1000} className="w-full rounded-xl border border-input bg-background px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
            <label>Não preencha<input type="text" name="site" tabIndex={-1} autoComplete="off" /></label>
          </div>
          <button type="submit" disabled={enviando} className="w-full rounded-xl bg-primary px-6 py-4 font-bold text-primary-foreground disabled:opacity-60">
            {enviando ? "Enviando..." : "Enviar avaliação"}
          </button>
        </form>
      </div>
    </SiteLayout>
  );
}
