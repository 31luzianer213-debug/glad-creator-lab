# Deixar o site com a cara do Bazar de Garagem

## O que muda (só visual e textos de marca, sem mexer em reservas, painel ou banco)
1. **Nome:** "Brechó Solidário" vira **"Bazar de Garagem"** no topo, rodapé, títulos das páginas e prévias do WhatsApp/Google.
2. **Logo:** a logo enviada (sacola com "BG" no círculo) entra no topo, no rodapé e como ícone da aba do navegador.
3. **Cores da marca:**
   - Amarelo da logo (#FFD95A aprox.) como cor principal: botões, destaques, faixa do início.
   - Grafite quase preto (#2B2B2B) para textos, bordas e rodapé.
   - Fundo creme bem claro; verde discreto só para "Disponível".
   - Sai o laranja e o azul-marinho atuais.
4. **Fontes:** títulos em fonte serifada elegante (parecida com o "BG" da logo); detalhes curtos em letras grossas maiúsculas, como "BAZAR DE GARAGEM"; texto corrido continua fácil de ler.
5. **Detalhes da marca:** traço de pincel sublinhando títulos (igual ao da logo), selos redondos com borda grossa, início com a frase **"Os melhores garimpos aqui!"**, e uma faixa com "Santarém - PA · Moda sustentável ♻️ · Novos e Usados 🛍️ · Empreendedorismo".
6. **Página inicial:** a foto principal ganha moldura amarela no lugar da laranja; "Chegaram agora" vira "Garimpos da semana".
7. **Painel /equipe e site antigo /brecho:** recebem o mesmo nome, logo e cores (só aparência).

## O que NÃO muda
Regra da troca por doação, reservas, favoritos, busca, proteções, LGPD e painel continuam funcionando igual.

## Detalhes técnicos
- `src/styles.css`: novos valores de --primary, --secondary, --accent, --background, --ring; utilitário `sublinhado-pincel`.
- `src/routes/__root.tsx`: fontes (ex.: Playfair Display + Bebas Neue + Work Sans), theme-color, favicon.
- Logo via lovable-assets; favicon real em `public/`.
- `Site.tsx`, `index.tsx` e `head()` de todas as rotas: nome e textos.
- `public/brecho/style.css`, `adm.html`: cores e nome.
- Teste com Playwright em celular e computador, checando contraste do amarelo (texto sempre grafite sobre amarelo).

## Pergunta antes de começar
A bio fala em "Novos e Usados" e "Empreendedorismo". O site continua sendo **troca por doação** (como hoje) ou o bazar também **vende**? Neste plano mantenho a troca por doação; se for venda, ajusto os textos.
