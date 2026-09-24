import { useCallback, useEffect, useState } from "react";
import { CHAVE_FAVORITOS, lerLista, salvarLista } from "./catalogo";

export function useFavoritos() {
  const [favoritos, setFavoritos] = useState<string[]>([]);
  useEffect(() => setFavoritos(lerLista(CHAVE_FAVORITOS)), []);
  const alternar = useCallback((codigo: string) => {
    setFavoritos((atual) => {
      const nova = atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [codigo, ...atual];
      salvarLista(CHAVE_FAVORITOS, nova);
      return nova;
    });
  }, []);
  return { favoritos, alternar };
}
