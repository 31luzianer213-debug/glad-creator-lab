// Tipos e utilidades do catálogo, seguros para o navegador e o servidor.

export const URL_SITE = "https://glad-creator-lab.lovable.app";
export const DIAS_NOVIDADE = 7;

export type Categoria = "adult" | "children" | "shoes";
export type StatusPeca = "available" | "reserved" | "exchanged";

export interface Peca {
  id: string;
  codigo: string;
  nome: string;
  categoria: Categoria | string;
  tamanho: string;
  estado: string;
  status: StatusPeca | string;
  troca: string;
  descricao: string;
  imagem: string;
  createdAt: string;
}

export const CATEGORIAS: { valor: Categoria; nome: string }[] = [
  { valor: "adult", nome: "Vestuário Adulto" },
  { valor: "children", nome: "Vestuário Infantil" },
  { valor: "shoes", nome: "Calçados e Acessórios" },
];

function normalizar(valor: string) {
  return String(valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function normalizarCategoria(categoria: string): string {
  const c = normalizar(categoria);
  if (["adult", "adulto", "vestuario adulto"].includes(c)) return "adult";
  if (["children", "child", "infantil", "vestuario infantil"].includes(c)) return "children";
  if (["shoes", "shoe", "calcados", "acessorios", "accessories", "calcados e acessorios"].includes(c))
    return "shoes";
  return c;
}

export function nomeCategoria(categoria: string) {
  return CATEGORIAS.find((c) => c.valor === normalizarCategoria(categoria))?.nome ?? "Outros";
}

export function textoStatus(status: string) {
  if (status === "available") return "Disponível";
  if (status === "reserved") return "Reservada";
  return "Trocada";
}

export function ehNovidade(peca: Peca) {
  const data = Date.parse(peca.createdAt || "");
  return Boolean(data) && Date.now() - data < DIAS_NOVIDADE * 86_400_000;
}

export function buscaNormalizada(texto: string) {
  return normalizar(texto);
}

export const TIPOS_DOACAO = ["Alimento não perecível", "Produto de higiene pessoal"] as const;

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Armazenamento local (compartilhado com a versão anterior do site)
export const CHAVE_FAVORITOS = "brecho-favoritos";
export const CHAVE_RESERVAS = "brecho-minhas-reservas";

export function lerLista(chave: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const valor = JSON.parse(window.localStorage.getItem(chave) || "[]");
    return Array.isArray(valor)
      ? valor.filter((v): v is string => typeof v === "string").slice(0, 200)
      : [];
  } catch {
    return [];
  }
}

export function salvarLista(chave: string, lista: string[]) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(lista.slice(0, 200)));
  } catch {
    /* modo privado ou sem espaço: segue sem salvar */
  }
}

export function dataBonita(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}
