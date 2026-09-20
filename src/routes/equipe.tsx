import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Área da equipe · Brechó Solidário Online" },
      {
        name: "description",
        content:
          "Painel interno da equipe do Brechó Solidário: gestão de peças, reservas e avaliações.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Área da equipe · Brechó Solidário Online" },
      {
        property: "og:description",
        content: "Acesso restrito à equipe do Brechó Solidário Online.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Equipe,
});

function Equipe() {
  return (
    <iframe
      src="/brecho/adm.html"
      title="Área da equipe do Brechó Solidário"
      className="block h-dvh w-full"
    />
  );
}
