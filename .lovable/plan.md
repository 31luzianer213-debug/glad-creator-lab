# Levar a logo e as cores do Bazar de Garagem ao painel /equipe e ao site antigo /brecho

## O que muda (só aparência)
1. **Painel /equipe:** logo no topo, faixa do topo em grafite, botões principais em amarelo com texto grafite, abas ativas em grafite, fundo creme, títulos na mesma fonte elegante do site novo e o "BAZAR DE GARAGEM" em letras grossas.
2. **Site antigo /brecho:** troca do laranja e azul-marinho pelo amarelo e grafite, mesmas fontes, logo no topo e no rodapé.
3. Ícone da aba do navegador com a logo nas duas páginas.

## O que NÃO muda
Login, reservas, peças, equipe, privacidade, histórico e todas as funções continuam iguais. Nenhum dado é alterado.

## Detalhes técnicos
- `public/brecho/adm.html`: variáveis `--navy/--orange` passam a apontar para grafite #2B2B2B e amarelo #FFD95A; `.btn-primary` com texto grafite; fontes Playfair Display + Bebas Neue + Work Sans; `<img>` da logo (URL do asset já existente) e favicon.
- `public/brecho/style.css` e `index.html`: mesma troca de variáveis/cores fixas, fontes e logo; `efeitos.css` só se tiver cores laranja fixas.
- `adm.js`/`app.js`: só troca de cores escritas direto no código, se houver.
- Teste com Playwright em celular e computador, conferindo leitura do texto sobre o amarelo.
