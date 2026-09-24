# Plano de lançamento do Brechó Solidário (baseado na sua lista)

Segui a sua ordem de fases. Em cada item marquei o que dá para fazer agora, o que depende de você e onde a sua sugestão original precisa de um ajuste técnico.

## Fase 0 — Bloqueadores

**0.1 Spam nos formulários**
- **Cloudflare Turnstile** na reserva e na avaliação. A verificação do "não sou robô" acontece no servidor do site, não só na tela.
  - Precisa de você: criar a chave grátis no Cloudflare e me passar a chave pública e a secreta (vou pedir num campo seguro).
- **Limite por IP:** no máximo 5 reservas por hora e 5 avaliações por hora por IP, além de 3 por contato por dia.
  - Ajuste: em vez de uma Edge Function, isso roda no próprio servidor do site, que é o padrão desta plataforma.
  - Os formulários deixam de gravar direto no banco. O envio público direto é bloqueado, então robôs não conseguem pular a proteção.

**0.2 Tirar o site da "moldura" (iframe)**
- Migrar para páginas reais, com o mesmo visual e a mesma lógica atual como referência.
- As páginas serão `/`, `/produtos`, `/produto/007`, `/reservar/007`, `/minha-reserva`, `/regras`, `/como-funciona`, `/pos-venda`, `/privacidade` e `/equipe`.
- O catálogo e cada peça já chegam prontos do servidor, com título, descrição e foto próprios para Google e WhatsApp.
- Também entram `sitemap.xml` automático com todas as peças, `robots.txt`, navegação por teclado e página 404.
- Os endereços antigos continuam funcionando e levam para os novos.

**0.3 Mais de um administrador**
- Função segura para uma administradora promover ou remover outro e-mail, com proteção para nunca remover a última administradora.
- Log de quem promoveu quem e quando.
- No painel: aba "Equipe" com a lista de administradoras e um botão "Adicionar por e-mail".
  - A pessoa promovida precisa ter uma conta. Como o cadastro público está desligado, a administradora envia um convite por e-mail pelo painel.

**0.4 Testes automáticos e CI**
- Adicionar um workflow do GitHub Actions rodando lint e checagem de tipos em cada PR.
- Adicionar testes básicos: formatação e escape de textos, regras de categoria e status, e limite de envios.
  - Precisa de você: conectar o projeto ao GitHub (Configurações → GitHub) para o pipeline rodar.

**0.5 LGPD**
- Página `/privacidade` e caixa de consentimento obrigatória na reserva, com link para a política.
- O banco guarda a data e a versão do consentimento aceito.
- Retenção documentada: nome e contato de reservas encerradas são apagados automaticamente após 6 meses (o prazo pode ser ajustado). A estatística da peça continua.
- "Pedir exclusão dos meus dados" pelo código da reserva.
  - Precisa de você: nome da organização responsável e um e-mail ou WhatsApp de contato para a política.

## Fase 1 — Segurança e confiabilidade
- **Fotos:** tentei deixar o local das fotos público, mas o seu espaço de trabalho bloqueia isso.
  - Opção A: você libera "pastas públicas" em Configurações → Privacidade e segurança, e eu troco por links permanentes.
  - Opção B: mantenho privado e o site gera links novos automaticamente ao exibir as fotos (sem validade de 10 anos).
- **Validação de imagem também no servidor:** limite de 5 MB e só JPG, PNG ou WEBP, com regras no próprio local das fotos, não só na tela.
- **Auditoria de escape:** revisar cada texto vindo do banco em `app.js` e `adm.js`. Com a migração para React, o escape passa a ser automático.
- **Monitoramento:** hoje os erros vão só para o registro interno da plataforma, não para um serviço como o Sentry. Vou ligar a captura também no painel.
  - Precisa de você: criar uma conta no Sentry, se quiser alertas por e-mail.
- **Backups:** o Lovable Cloud faz backup automático. Eu não consigo testar uma restauração por aqui; isso é feito pelo suporte ou pelo painel do Cloud. Vou documentar o passo a passo e exportar uma cópia manual dos dados antes do lançamento.
- **Segredos:** já conferido. No navegador só existe a chave pública; nenhuma chave de serviço aparece no site. Vou repetir a checagem após a migração.

## Fase 2 — Experiência e conversão
- **Busca:** já existe por nome e código. Vou ampliar para descrição, tamanho e estado.
- **"Carregar mais":** hoje o catálogo carrega até 500 peças de uma vez. Passa a carregar de 24 em 24, com paginação no servidor.
- **Estados vazios:** revisar todos (favoritos vazios, busca sem resultado, catálogo vazio, nenhuma disponível, reserva não encontrada, erro de conexão).
- **Confirmação por WhatsApp:** botão "Enviar comprovante para mim" com mensagem pronta contendo peça, código e link de acompanhamento. O e-mail automático fica para quando houver domínio de e-mail.
- **"Esqueci o código":** a pessoa digita o contato usado e recebe as reservas ligadas a ele, com verificação para não expor dados de terceiros (mostra só peça e situação, e só se o contato for idêntico). O código também fica guardado no aparelho.
- **Painel no celular:** teste e ajuste em 360px, com cartões empilhados, botões grandes e abas roláveis.
- **Imagens:** compressão e redimensionamento no aparelho antes do envio (máx. 1600px, cerca de 300 KB), e miniaturas menores no catálogo.

## Fase 3 — Operação e painel
- **Conferência das estatísticas:** comparar cada número do painel com consultas diretas ao banco e corrigir divergências. Hoje "itens doados" soma só reservas concluídas; vou confirmar com você se é essa a regra.
- **Alerta de reserva parada:** prazo configurável no painel (padrão de 48 h, como você sugeriu).
- **Planilhas:** exportação só para administradoras (verificado no servidor). A planilha avisa que contém dados pessoais, e há a opção "exportar sem contato".
- **Duplicar peça:** o código novo é sugerido automaticamente (próximo número livre) e checado no banco antes de salvar. O banco já recusa códigos repetidos com uma mensagem clara.
- **Log de ações:** registro automático de toda criação, edição, mudança de situação e exclusão, com quem, quando, antes e depois. Fica visível numa aba "Histórico".

## Ordem de execução sugerida
1. 0.3 (admins) + 0.5 (LGPD) + limite por IP (não dependem de você)
2. 0.2 (migração para páginas reais) — maior etapa
3. Turnstile e CI (assim que você enviar as chaves e conectar o GitHub)
4. Fases 1, 2 e 3

## Detalhes técnicos
- Limite/Turnstile: server route `src/routes/api/public/reservar.ts` e `avaliar.ts` (validação Zod, verificação Turnstile via `siteverify`, IP de `cf-connecting-ip`), gravando com o cliente admin após as checagens. Tabela `limites_envio` (ip_hash, contato_hash, tipo, criado_em). Revogar os INSERTs anônimos em `reservas`/`avaliacoes`.
- Admins: `promover_admin(email)` / `remover_admin(user_id)` security definer, com checagem `has_role(auth.uid(),'admin')` e recusa de remover o último admin; tabela `admin_log`; convite via Auth Admin API em server function autenticada.
- Migração: rotas TanStack com loaders públicos (`ensureQueryData`), componentes React, Tailwind v4 com tokens em `src/styles.css`, `lucide-react`, `/produto/$codigo` com `head()` dinâmico, `sitemap[.]xml.ts` como server route, redirects dos caminhos antigos.
- LGPD: colunas `consentimento_em`/`consentimento_versao` em `reservas`, tabela `pedidos_exclusao`, rotina pg_cron de anonimização.
- Log: tabela `historico` alimentada por gatilhos em `produtos`/`reservas` (before/after em jsonb).
- CI: `.github/workflows/ci.yml` com `bun install`, `bun run lint`, typecheck e `bunx vitest run`.

## Precisa de você
- Chaves do Cloudflare Turnstile.
- Nome da organização e contato para a política de privacidade.
- Conectar o GitHub.
- Fotos: opção A ou B.
- Opcional: conta no Sentry.
