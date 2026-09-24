# Plano: melhorar o Brechó Solidário por inteiro

Tudo será feito em etapas. Ao fim de cada etapa eu mostro o que ficou pronto antes de seguir. Nada do que já funciona será removido.

## Etapa 1 — Catálogo em páginas próprias (encontrável no Google)
- Novas páginas de verdade: Início, Catálogo (`/produtos`), Peça (`/produto/012`), Reservar, Minha reserva, Regras e Avaliar, com o mesmo visual de hoje.
- Cada peça ganha título, descrição e foto próprios ao ser compartilhada no WhatsApp ou em redes sociais.
- Mapa do site e arquivo para buscadores, para o Google achar as peças.
- O site antigo continua funcionando até a troca ser confirmada; os links antigos passam a levar às páginas novas.

## Etapa 2 — Experiência de quem troca
- Várias fotos por peça, com zoom e opção de arrastar para o lado.
- Filtro por tamanho (P/M/G, numeração e infantil).
- Agendar dia e horário de retirada na reserva.
- "Me avise quando chegar": a pessoa informa tamanho e tipo de peça e recebe um e-mail quando entrar algo parecido.
- E-mails automáticos de reserva recebida, confirmada, pronta para retirar e cancelada.
- Acessibilidade: navegação por teclado, bom contraste e textos para leitores de tela.
- Instalar como aplicativo no celular, com ícone próprio.

## Etapa 3 — Painel da equipe
- Cadastro rápido pelo celular: tirar a foto e cadastrar na hora.
- Cadastro de várias peças de uma vez, inclusive por planilha.
- Etiqueta com QR Code para imprimir e colar na peça.
- Registro da doação recebida (o que chegou e quanto), com lista de quem reservou e não entregou.
- Reserva vencida é cancelada sozinha após X dias, e a peça volta ao catálogo.
- Novo nível de acesso "voluntária": cuida só de reservas, sem excluir peças nem mexer na equipe.
- Aviso por e-mail para a equipe a cada nova reserva.

## Etapa 4 — Impacto e relatórios
- Página pública de impacto: peças trocadas, doações arrecadadas e trocas concluídas.
- Relatório mensal em PDF para parceiros.
- No painel: peças mais vistas, categorias mais procuradas e tempo médio até a troca.

## Etapa 5 — Segurança e confiabilidade
- Páginas amigáveis de erro e de "sem internet".
- Botão no painel para baixar uma cópia de segurança completa (peças, reservas e avaliações).
- Revisão final de segurança do banco de dados e teste completo de ponta a ponta.

## O que depende de você (não trava as etapas acima)
- Nome da organização e contato, para completar a Política de Privacidade.
- Chaves do Cloudflare Turnstile, para a verificação "não sou robô".
- Conexão com o GitHub, para a checagem automática a cada mudança.
- Endereço e horários de retirada, para o agendamento da Etapa 2.

## Detalhes técnicos
- Etapa 1: rotas TanStack com SSR e `head()` por rota, reaproveitando as consultas de `app.js`; `sitemap[.]xml.ts` e `robots.txt`; o iframe `/brecho` sai só depois da validação.
- Fotos: nova tabela `produto_fotos` (ordem, caminho) com leitura pública e escrita somente para admin; bucket privado com URLs assinadas.
- Papel `voluntaria` entra no enum `app_role`; políticas de acesso ajustadas com `has_role`.
- E-mails pelo sistema de e-mail do Lovable Cloud (exige configurar um domínio de envio).
- Colunas novas em `reservas` (retirada agendada, doação recebida) sempre opcionais ou com valor padrão, sem quebrar o que já existe.
