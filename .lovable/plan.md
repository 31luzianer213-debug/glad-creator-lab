# Plano completo para lançar o Brechó Solidário

Resultado da revisão: o site funciona, mas tem **problemas que impedem um lançamento sério**. Eles estão ordenados por gravidade. Cada fase pode ser aprovada separadamente.

## Diagnóstico (o que está errado hoje)

**Bloqueadores (graves)**
1. **Duas pessoas podem reservar a mesma peça.** A peça só vira "Reservada" na tela de quem reservou; no banco ela continua disponível.
2. **Qualquer pessoa pode lotar o banco com reservas e avaliações falsas.** Não há limite de envios nem proteção contra robôs.
3. **Falta aviso de privacidade (LGPD).** O site coleta nome e telefone sem explicar o uso, sem pedir consentimento e sem oferecer forma de pedir exclusão dos dados.
4. **O site inteiro roda dentro de uma "moldura" (iframe).** O Google não enxerga as peças, links diretos para uma peça não funcionam, o botão voltar do celular sai do site e o título da aba às vezes mostra "Lovable App".
5. **O visual depende de uma versão de teste do Tailwind carregada da internet.** Ela é lenta, mostra aviso no console e não é recomendada para produção. O supabase-js e os ícones também vêm de sites externos.

**Importantes**
6. Não há páginas de Termos de uso, Política de privacidade, Contato, Sobre nós nem de erro 404.
7. Não existe forma de contato (WhatsApp, Instagram, endereço, horário de retirada).
8. Não há ícone do site (favicon próprio), imagem de compartilhamento por peça nem mapa do site para o Google.
9. As fotos não são otimizadas (tamanho original), o que deixa o celular lento.
10. O painel não tem histórico, ações em lote, recuperação de senha nem segundo usuário.
11. Não há medição de visitas nem de peças mais vistas.
12. O banco apontou 4 avisos de segurança: funções internas que qualquer pessoa pode chamar (precisam ser revisadas e restritas).

## Fase 1 — Segurança e reservas (obrigatório antes de publicar)
- Reservar trava a peça no banco. Se a peça já estiver reservada, a reserva é recusada com uma mensagem clara. Cancelar libera a peça, e concluir marca como "Trocada".
- Limite de envios: no máximo 3 reservas e 3 avaliações por contato por dia, e contato validado (telefone BR ou e-mail).
- Campo "anti-robô" invisível nos formulários.
- Revisar as 4 funções apontadas pelo banco e deixar públicas só as necessárias.
- Recuperação de senha no painel e sessão que expira por inatividade.

## Fase 2 — Reestruturação técnica (desempenho, Google, links)
- Tirar o site da "moldura": transformar as telas em páginas reais (Início, Catálogo, Peça, Reserva, Acompanhar, Regras, Como funciona, Pós-venda, Equipe), cada uma com endereço próprio (ex.: `/peca/007`).
- Botão voltar do celular, links diretos e compartilhamento funcionando.
- Visual e textos idênticos aos de hoje, só que sem a versão de teste do Tailwind e sem arquivos de sites externos.
- Título, descrição e imagem próprios em cada página, com a foto da peça ao compartilhar no WhatsApp.
- Mapa do site, arquivo de robôs e dados estruturados de produto para o Google.

## Fase 3 — Confiança e LGPD
- Páginas: Sobre o projeto, Contato, Política de privacidade, Termos de uso, Perguntas frequentes e página 404 amigável.
- Caixa de consentimento no formulário de reserva e aviso de cookies simples.
- Botão "Pedir exclusão dos meus dados" (vira um pedido no painel).
- Exclusão automática dos dados pessoais de reservas encerradas há mais de 6 meses.
- Rodapé completo: contato, WhatsApp, Instagram, endereço e horário de retirada.

## Fase 4 — Experiência do visitante
- Vitrine "Chegaram agora" na página inicial e contadores de impacto públicos ("X peças já trocadas").
- Filtros por tamanho e estado de conservação, e botão "Carregar mais" para catálogos grandes.
- Várias fotos por peça, com galeria e ampliação, e "Você também pode gostar".
- Fotos otimizadas automaticamente no envio (redimensionadas e comprimidas no aparelho).
- Botão flutuante de WhatsApp da equipe.
- Instalável como aplicativo no celular (ícone na tela inicial).

## Fase 5 — Painel da equipe profissional
- Histórico de alterações por peça e reserva.
- Ações em lote e busca avançada.
- Segundo cargo "equipe", com acesso só às reservas.
- Painel de relatórios: peças mais vistas, trocas por mês e doações por tipo, com exportação em PDF/planilha.
- Envio de várias fotos com reordenação.
- Tela de pedidos de exclusão de dados (LGPD).

## Fase 6 — Comunicação e crescimento
- E-mail automático de confirmação e de mudança de situação da reserva (precisa de um domínio de e-mail).
- Medição de visitas sem cookies de terceiros.
- Domínio próprio (ex.: brechosolidario.com.br) e checklist final de publicação.

## Detalhes técnicos
- F1: gatilhos `BEFORE INSERT` em `reservas` (bloqueia se `produtos.status <> 'available'`, com trava via `SELECT ... FOR UPDATE`) e `AFTER UPDATE` (Cancelada → available, Vendido → exchanged). Gatilho de limite diário por `contato`. Revogar `EXECUTE` de `has_role`/`reivindicar_admin` onde não for necessário, mantendo só `consultar_reserva` pública.
- F2: migrar `public/brecho/*` para rotas TanStack (`src/routes/*.tsx`) com Tailwind v4 do projeto, cliente Supabase gerado, `head()` por rota e `/peca/$codigo` com loader público. O estilo atual será portado para tokens em `src/styles.css`.
- F3: tabelas `pedidos_exclusao` e job agendado de limpeza, ambos com GRANT e RLS.
- F4: compressão via canvas no navegador antes do upload, e `produtos.imagens text[]`.
- F5: enum `app_role` + `equipe`, tabela `historico` alimentada por gatilhos, políticas separadas por cargo.
- F6: domínio de e-mail do Lovable Cloud e filas de envio.

## Precisa de você
- Dados reais para Contato/Sobre: WhatsApp, Instagram, endereço, horário de retirada e nome da organização responsável (para a política de privacidade).
- E-mail da segunda pessoa da equipe (Fase 5).
- Se já tem um domínio próprio (Fase 6).
- Por qual fase começar. Minha recomendação: Fase 1 e depois Fase 2.
