# Melhorias e novas funções do Brechó Solidário

## Parte 1 — Correções (sem mudar o visual)
1. **Limpar o código antigo da ADM** que ficou no site público (cerca de 1.200 linhas sem uso) e parar de buscar reservas/avaliações que o visitante não pode ver.
2. **Tirar as 6 peças fictícias** que piscam antes do catálogo real e mostrar um "Carregando peças..." no lugar.
3. **Padronizar categorias**: converter "adulto" para "adult" no banco e aceitar só adult / children / shoes daqui em diante.

## Parte 2 — Novas funções no site público
4. **Busca no catálogo** por nome ou código, com **ordenação** (mais recentes / A-Z).
5. **Contador de peças** em cada cartão de categoria e etiqueta **"Novidade"** nas peças cadastradas nos últimos 7 dias.
6. **Compartilhar no WhatsApp**: botão na página da peça que envia o link e o nome dela.
7. **Favoritos**: coração em cada peça; lista "Meus favoritos" salva no próprio aparelho (sem login).
8. **Acompanhar minha reserva**: a pessoa digita o código da reserva recebido na confirmação e vê a situação (Pendente, Confirmada...). Mostra só a situação e a peça — nenhum dado pessoal.

## Parte 3 — Novas funções no painel da equipe (/equipe)
9. **Enviar foto direto do celular** (além de colar link), guardada no armazenamento do Lovable Cloud.
10. **Duplicar peça** para cadastrar parecidas mais rápido.
11. **Aviso de reservas paradas** há mais de 3 dias em "Pendente", destacadas no topo.
12. **Painel de impacto**: peças trocadas no mês, reservas por situação e total de doações recebidas.

## Detalhes técnicos
- Arquivos: `public/brecho/index.html`, `app.js`, `style.css`, `adm.html`, `adm.js`.
- Banco: migração para atualizar categoria + CHECK; bucket público `fotos-produtos` com envio só para admin (política `has_role`).
- Acompanhamento: função segura `consultar_reserva(id uuid)` (security definer) que retorna apenas `status`, `codigoProduto`, `nomeProduto`, `createdAt`; o id da reserva passa a ser gerado no navegador para ser mostrado na confirmação.
- Favoritos em localStorage; compartilhamento via `https://wa.me/?text=`.
- Testes com Playwright em 390px, 820px e 1440px ao final de cada parte.

## Fora do escopo (posso fazer depois)
E-mail automático de confirmação, várias fotos por peça, segunda conta de equipe.
