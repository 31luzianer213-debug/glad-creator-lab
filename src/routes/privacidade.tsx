import { createFileRoute, Link } from "@tanstack/react-router";

const URL_SITE = "https://glad-creator-lab.lovable.app/privacidade";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade · Brechó Solidário Online" },
      {
        name: "description",
        content:
          "Como o Brechó Solidário Online coleta, usa, guarda e apaga os dados de quem faz reservas e avaliações (LGPD).",
      },
      { property: "og:title", content: "Política de Privacidade · Brechó Solidário Online" },
      {
        property: "og:description",
        content: "Quais dados coletamos, por quanto tempo guardamos e como pedir a exclusão.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: URL_SITE },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: URL_SITE }],
  }),
  component: Privacidade,
});

function Privacidade() {
  return (
    <main className="min-h-dvh bg-background px-4 py-12 text-foreground">
      <article className="mx-auto max-w-3xl space-y-6 leading-relaxed">
        <Link to="/" className="text-sm font-bold underline">
          ← Voltar ao brechó
        </Link>
        <h1 className="text-3xl font-bold">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground">Versão 2026-09-v1 · atualizada em setembro de 2026</p>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">1. Quem é responsável</h2>
          <p>
            O Brechó Solidário Online é mantido por <strong>[nome da organização responsável]</strong>.
            Dúvidas ou pedidos sobre seus dados: <strong>[e-mail ou WhatsApp de contato]</strong>.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">2. Quais dados coletamos</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Reserva:</strong> nome completo, telefone ou e-mail, peça escolhida e item que você
              vai doar.
            </li>
            <li>
              <strong>Avaliação:</strong> nota e respostas, sem nome nem contato.
            </li>
            <li>
              <strong>Segurança:</strong> uma versão embaralhada (irreversível) do endereço de internet,
              usada só para barrar envios em massa e apagada da contagem após 1 hora de uso.
            </li>
            <li>
              <strong>No seu aparelho:</strong> favoritos e códigos das suas reservas ficam salvos só no
              seu navegador. Não usamos cookies de propaganda.
            </li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">3. Para que usamos</h2>
          <p>
            Apenas para combinar a troca solidária com você e melhorar o atendimento. Não vendemos nem
            compartilhamos seus dados com terceiros. A base legal é o seu consentimento, dado ao marcar a
            caixa no formulário de reserva.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">4. Por quanto tempo guardamos</h2>
          <p>
            Nome e contato de reservas <strong>concluídas ou canceladas são apagados automaticamente
            após 6 meses</strong>. Mantemos apenas a peça e a situação da troca para estatísticas, sem
            identificar você.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">5. Seus direitos</h2>
          <p>
            Você pode pedir acesso, correção ou exclusão dos seus dados a qualquer momento. O jeito mais
            rápido: abra <Link to="/" className="font-bold underline">o brechó</Link>, entre em
            &quot;Minha reserva&quot;, consulte pelo código e toque em &quot;Pedir exclusão dos meus
            dados&quot;. Você também pode falar com o contato acima.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-bold">6. Segurança</h2>
          <p>
            Os dados das reservas só podem ser vistos pela equipe autorizada, com login. Toda alteração
            feita no painel fica registrada.
          </p>
        </section>
      </article>
    </main>
  );
}
