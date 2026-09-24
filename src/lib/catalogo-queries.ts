import { queryOptions } from "@tanstack/react-query";
import { listarPecas, obterPeca } from "./catalogo.functions";

export const pecasQuery = queryOptions({
  queryKey: ["pecas"],
  queryFn: () => listarPecas(),
  staleTime: 30_000,
});

export const pecaQuery = (codigo: string) =>
  queryOptions({
    queryKey: ["peca", codigo],
    queryFn: () => obterPeca({ data: { codigo } }),
    staleTime: 15_000,
  });
