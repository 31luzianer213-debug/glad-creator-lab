# Próxima rodada de melhorias do Brechó Solidário

## Parte 1 — Correções importantes nas reservas (prioridade)
1. **A peça passa a ficar "Reservada" de verdade no banco quando alguém reserva.** Hoje ela só muda na tela de quem reservou; para os outros visitantes continua "Disponível", e duas pessoas podem reservar a mesma peça.
2. **O sistema recusa reserva de peça que não está disponível**, mesmo que alguém tente por fora do site.
3. **A peça volta a ficar disponível sozinha** quando a equipe cancela a reserva, e fica "Trocada" quando a reserva é marcada como concluída.

## Parte 2 — Site público
4. **Vitrine "Chegaram agora" na página inicial**, com as 4 peças mais recentes e botão para o catálogo.
5. **Filtro por tamanho** no catálogo (os tamanhos são montados a partir das peças cadastradas).
6. **Várias fotos por peça** (até 5), com galeria na página da peça e foto ampliada ao tocar.
7. **"Você também pode gostar"**: até 3 peças da mesma categoria no fim da página da peça.
8. **Link direto para cada peça**: o link do WhatsApp abre a peça certa, e não só a página inicial.

## Parte 3 — Painel da equipe
9. **Histórico**: registro de quando cada peça e cada reserva mudou de situação e quem mudou, visível no painel.
10. **Ações em lote**: marcar várias peças ou reservas e mudar a situação delas de uma vez.
11. **Envio de várias fotos** por peça, com reordenação e opção de remover.
12. **Segunda conta de equipe com acesso limitado**: pode cuidar das reservas, mas não pode excluir peças nem ver planilhas. Você informaria o e-mail dessa pessoa.

## Detalhes técnicos
- Banco: gatilhos em `reservas` para travar e liberar a peça (`produtos.status`), com um bloqueio que rejeita a reserva se a peça não estiver `available`. Nova tabela `historico` (com GRANT e RLS, leitura só para a equipe) alimentada por gatilhos. Nova coluna `produtos.imagens text[]` (máx. 5 URLs https), copiando a `imagem` atual para ela. Novo cargo `equipe` no `app_role`, com políticas que liberam reservas para admin e equipe, e peças/exclusões só para admin.
- Arquivos: `public/brecho/index.html`, `app.js`, `efeitos.css`, `adm.html`, `adm.js`.
- Link por peça: `/?peca=CODIGO` lido pela página ao abrir.
- Testes com Playwright no celular e no computador, incluindo tentativa de reserva dupla.

## Precisa de você
- Para o item 12: o e-mail da segunda pessoa da equipe (ou pule esse item por enquanto).
- Envio automático de e-mail de confirmação da reserva fica para outra etapa, porque exige configurar um domínio de e-mail.
