import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/equipe")({
  head: () => ({
    meta: [
      { title: "Área da equipe · Bazar de Garagem" },
      {
        name: "description",
        content:
          "Painel interno da equipe do Bazar de Garagem: gestão de peças, reservas e avaliações.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Área da equipe · Bazar de Garagem" },
      {
        property: "og:description",
        content: "Acesso restrito à equipe do Bazar de Garagem.",
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
      title="Área da equipe do Bazar de Garagem"
      className="block h-dvh w-full"
    />
  );
}
