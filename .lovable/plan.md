# Plano completo para lançar e comercializar o Brechó Solidário

Esta revisão combinou leitura do código, auditoria automática do banco e testes no navegador. Tudo abaixo foi observado no site atual, não é suposição. São 8 fases, em ordem de prioridade, e cada uma pode ser aprovada separadamente.

## Diagnóstico

### Bloqueadores (não dá para lançar assim)
1. **Reserva dupla:** a peça só vira "Reservada" na tela de quem reservou; no banco continua "Disponível" e outra pessoa pode reservá-la.
2. **Spam sem limite:** qualquer um pode enviar milhares de reservas e avaliações falsas. Não há limite por contato nem proteção contra robôs.
3. **LGPD:** o site coleta nome e telefone sem política de privacidade, sem consentimento e sem forma de pedir exclusão dos dados.
4. **Site dentro de uma "moldura":** o Google só enxerga uma página vazia. Não existe link próprio por peça, o voltar do celular sai do site e o endereço nunca muda.
5. **Tailwind de teste em produção:** o console avisa que "cdn.tailwindcss.com should not be used in production". Ele gera o visual no aparelho de cada visitante, o que deixa o site lento e piscando.
6. **5 arquivos vêm de sites externos** (Tailwind, supabase-js, ícones, fontes, foto da capa). Se algum desses sites cair, o site quebra.
7. **Banco:** 4 avisos de segurança sobre funções internas que visitantes conseguem chamar.

### Graves
8. Sem página 404 própria dentro do site, sem arquivo de robôs e sem mapa do site.
9. Sem favicon próprio, sem manifesto de app e sem endereço oficial (canonical) informado ao Google.
10. O rodapé não tem nenhum contato: WhatsApp, Instagram, endereço ou horário.
11. 104 estilos escritos direto nos elementos e 81 marcações de um editor antigo ("data-template-id"), o que torna manutenção e ajustes lentos.
12. Emojis usados como ícones (🥫🧴) aparecem como quadrados em alguns aparelhos (visto no teste do computador).
13. O texto "OU 2 produtos de higiene pessoal" é fixo e aparece em toda peça, mesmo que a troca seja outra.
14. A imagem principal da página da peça não tem descrição para leitores de tela quando a peça não tem foto.
15. Painel: sem recuperação de senha, sem histórico, sem ações em lote e sem segundo usuário.
16. Fotos no tamanho original (vários MB) deixam o celular lento e gastam dados.
17. Nenhuma medição: você não sabe quantas pessoas visitam nem quais peças atraem mais.

### Melhorias de produto (para vender e crescer)
18. Não há como a pessoa ser avisada quando chegar uma peça do tamanho dela.
19. Sem página "Sobre", sem prova social (depoimentos e números de impacto) e sem perguntas frequentes.
20. Sem suporte a vários pontos de coleta ou eventos (feiras).
21. Sem modelo para outras organizações usarem (se a ideia for comercializar o sistema).

## Fase 1 — Segurança e reservas (obrigatória)
- Travar a peça no banco na hora da reserva, com trava contra duas reservas simultâneas. Cancelar libera a peça; concluir marca como "Trocada".
- Recusar reserva de peça indisponível, com mensagem clara ao visitante.
- Limite: 3 reservas e 3 avaliações por contato a cada 24 h. Telefone BR ou e-mail validado.
- Campo "anti-robô" invisível e tempo mínimo de preenchimento do formulário.
- Restringir as 4 funções apontadas pelo banco.
- Painel: recuperação de senha, saída automática após 30 min parado e confirmação antes de excluir.

## Fase 2 — Reconstrução técnica (velocidade, Google, links)
- Tirar da "moldura": cada tela vira uma página real com endereço próprio: `/`, `/catalogo`, `/peca/007`, `/reservar/007`, `/minha-reserva`, `/regras`, `/como-funciona`, `/pos-venda`, `/equipe`.
- Visual idêntico ao atual, mas compilado (sem o Tailwind de teste) e com todos os arquivos servidos pelo próprio site.
- Ícones e fontes locais, e emojis trocados por ícones de verdade.
- Carregamento do catálogo no servidor: a página já chega pronta, sem piscar.
- Título, descrição e foto de compartilhamento próprios por página e por peça.
- Arquivo de robôs, mapa do site automático com todas as peças, dados de produto para o Google e endereço oficial por página.
- Página 404 com busca e atalho para o catálogo.

## Fase 3 — Confiança, LGPD e institucional
- Páginas: Sobre o projeto, Contato, Perguntas frequentes, Política de privacidade e Termos de uso.
- Consentimento obrigatório na reserva e aviso de cookies.
- "Pedir exclusão dos meus dados" pelo código da reserva, virando um pedido no painel.
- Apagamento automático dos dados pessoais de reservas encerradas há mais de 6 meses.
- Rodapé completo: WhatsApp, Instagram, endereço, horário de retirada e responsável.
- Botão flutuante de WhatsApp da equipe.

## Fase 4 — Experiência do visitante
- Página inicial: "Chegaram agora" (4 peças), números de impacto ao vivo e depoimentos das avaliações 5 estrelas (só com consentimento).
- Catálogo: filtros por tamanho, conservação e tipo de troca; "Carregar mais"; lembrar o filtro ao voltar.
- Peça: até 5 fotos com galeria e ampliação, texto de troca real (sem "OU" fixo) e "Você também pode gostar".
- "Me avise quando chegar": a pessoa deixa o contato e o tamanho e é avisada quando entrar uma peça compatível (depende da Fase 7).
- Instalável como aplicativo no celular, com ícone próprio e funcionamento básico sem internet.
- Acessibilidade: navegação por teclado, contraste revisado, textos alternativos e foco visível.

## Fase 5 — Painel da equipe profissional
- Histórico de alterações (quem, quando, o quê) por peça e por reserva.
- Ações em lote, busca avançada e filtros salvos.
- Cargos: Administradora (tudo) e Equipe (só reservas), com convite por e-mail.
- Fotos: várias por peça, compressão automática, reordenação e remoção.
- Relatórios: trocas por mês, doações por tipo, peças mais vistas e tempo médio até a troca; exportação em planilha e PDF.
- Tela de pedidos LGPD e lista de interessados ("me avise").
- Impressão de etiquetas com código e QR code da peça para colar na roupa física.

## Fase 6 — Medição e crescimento
- Contador de visitas e visualizações por peça, sem cookies de terceiros.
- Funil: visitou → abriu peça → reservou → concluiu.
- Links rastreáveis para Instagram e WhatsApp (saber de onde vêm as reservas).

## Fase 7 — Comunicação automática
- E-mail de confirmação da reserva e de cada mudança de situação.
- E-mail "chegou uma peça do seu tamanho".
- Resumo diário para a equipe com as reservas pendentes.
- Requer: um domínio de e-mail configurado.

## Fase 8 — Lançamento e comercialização
- Domínio próprio (ex.: brechosolidario.com.br) e cadastro no Google Search Console.
- Checklist final: velocidade medida, teste em 3 celulares, revisão de textos e backup.
- Se a ideia for vender o sistema para outras ONGs ou brechós: nome, cores e textos configuráveis pelo painel, várias organizações no mesmo sistema e página de apresentação do produto com planos. Isso é uma fase grande à parte e precisa de decisão sua.

## Detalhes técnicos
- F1: gatilho `BEFORE INSERT` em `reservas` com `SELECT ... FOR UPDATE` em `produtos` (rejeita se `status <> 'available'`, depois marca `reserved`); `AFTER UPDATE` (Cancelada → available, Vendido → exchanged); limite por `contato` em janela de 24 h via gatilho; `REVOKE EXECUTE` de `has_role`/`reivindicar_admin` para anon; `consultar_reserva` continua pública.
- F2: portar `public/brecho/*` para rotas TanStack (`src/routes/*.tsx`), componentes React, Tailwind v4 com tokens em `src/styles.css`, cliente Supabase gerado, loaders públicos com `ensureQueryData`, `head()` por rota, `/peca/$codigo` com og:image da peça, `sitemap.xml` como rota de servidor, `lucide-react` e fontes via `<link>` no `__root`. `/equipe` vira rota com login próprio. Os arquivos antigos saem só após a validação.
- F3: tabelas `pedidos_exclusao` e `consentimentos` (GRANT + RLS) e limpeza agendada (pg_cron).
- F4: `produtos.imagens text[]` (backfill de `imagem`), `interesses` (contato, tamanho, categoria), manifest + service worker simples.
- F5: `app_role` + `equipe`, tabela `historico` alimentada por gatilhos, políticas separadas por cargo, `visualizacoes` agregadas por dia.
- F7: domínio de e-mail do Lovable Cloud e filas de envio.

## Precisa de você
- **Contato real:** WhatsApp, Instagram, endereço, horário de retirada e nome da organização responsável (para a política de privacidade).
- **Objetivo comercial:** é um brechó próprio para divulgar, ou um sistema para vender a outras organizações? (muda a Fase 8)
- **E-mail da segunda pessoa da equipe** (Fase 5).
- **Domínio próprio:** já tem um? (Fases 7 e 8)
- **Ordem:** recomendo Fase 1 → Fase 2 → Fase 3 antes de divulgar.
