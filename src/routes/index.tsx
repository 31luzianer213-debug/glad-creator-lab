import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Brechó Solidário Online" },
      {
        name: "description",
        content:
          "Brechó Solidário Online: encontre peças, reserve itens e participe de trocas solidárias.",
      },
      { property: "og:title", content: "Brechó Solidário Online" },
      {
        property: "og:description",
        content:
          "Brechó Solidário Online: encontre peças, reserve itens e participe de trocas solidárias.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:image",
        content:
          "https://images.pexels.com/photos/6068975/pexels-photo-6068975.jpeg",
      },
      {
        name: "twitter:image",
        content:
          "https://images.pexels.com/photos/6068975/pexels-photo-6068975.jpeg",
      },
      { name: "twitter:card", content: "summary_large_image" },

    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/brecho/index.html"
      title="Brechó Solidário Online"
      className="block h-dvh w-full border-0"
    />
  );
}
