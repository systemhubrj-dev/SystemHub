# SystemHub — Documentação do Projeto

> Este arquivo existe pra você poder pegar **só ele**, colar numa conversa com uma IA (Claude, ChatGPT, etc.) e ela já ter contexto suficiente pra te ajudar a mexer no projeto sem precisar re-explicar tudo do zero.

## 1. O que é

Sistema de gestão para clínicas veterinárias com IA integrada (bulário, prontuário, agenda, financeiro, estoque, equipe). Site público: **https://systemhub.app.br**

**Plano e preço (desde 17/11/2026):** plano único **VetPro — R$ 49,90/mês** (antes R$ 129,90), 7 dias grátis. O id do plano no código é `vetpro` (os ids antigos `essencial`/`profissional`/`clinica` ainda existem nas funções de pagamento só por compatibilidade e cobram o mesmo valor).

## 2. Onde está tudo

| O quê | Onde |
|---|---|
| Código-fonte (pasta local) | `C:\Users\jvito\OneDrive\Desktop\SystemHub` |
| Repositório Git | `https://github.com/systemhubrj-dev/SystemHub` (privado) |
| Deploy / hospedagem | Vercel — projeto `system-hub-com-ru97`, time `joao-monteiro-s-projects` |
| Login Vercel usado | conta `systemhubrj-1717` (relogado neste computador em 17/11/2026 via `npx vercel login`) |
| Banco de dados / backend | Supabase — projeto `systemhub` (id `nktskwrwvnefpyfdpiyu`), organização `systemhubrj-dev's Org` (plano Free). Painel: https://supabase.com/dashboard/project/nktskwrwvnefpyfdpiyu |
| Domínio de produção | `systemhub.app.br` (alias aponta pra `www.systemhub.app.br`) |
| DNS do domínio | **Registro.br** (servidores `a.sec.dns.br` / `c.sec.dns.br`) — é lá que se adicionam registros TXT/CNAME |
| Pagamentos | Mercado Pago (funções `mp-*` dentro de `supabase/functions`) |
| Busca do Google | Google Search Console — propriedade `systemhub.app.br` (ver seção 11) |

⚠️ A pasta fica dentro do OneDrive, então ela sincroniza pra nuvem automaticamente. Isso inclui o `.env` (chaves do Supabase) — não é um problema grave, mas evite compartilhar essa pasta publicamente.

⚠️ **Pendência de segurança**: o remote do Git (`.git/config`) tem um token do GitHub (`ghp_...`) embutido na URL em texto puro. Isso funciona, mas é um risco — o ideal é revogar esse token em github.com/settings/tokens e reconfigurar o Git pra pedir login (credential manager) em vez de guardar o token na URL. Perguntar pra IA "troca a autenticação do git desse projeto pra não deixar token na URL" resolve.

## 3. Stack técnica

- **Frontend**: React 18 + TypeScript + Vite
- **Estilo**: Tailwind CSS + shadcn/ui (componentes em cima do Radix UI)
- **Backend**: Supabase (Postgres + Edge Functions em Deno/TypeScript, em `supabase/functions/`)
- **Deploy**: Vercel (SPA, com rewrite de todas as rotas pra `index.html` — ver `vercel.json`)
- **Gerenciador de pacotes**: o projeto tem `package-lock.json` (npm) e `bun.lock`/`bun.lockb` (bun) — ambos funcionam, mas prefira **npm** pra manter consistência (foi o que validamos no build).
- **Testes**: Vitest (unitário) + Playwright (`playwright.config.ts`, testes e2e)

## 4. Estrutura de pastas (visão geral)

```
SystemHub/
├── src/
│   ├── pages/
│   │   ├── dashboard/        ← telas internas: Clientes, Financeiro, Estoque, Agenda, Caixa, Animais, Pacientes, etc.
│   │   ├── admin/             ← painel administrativo (AdminAnalytics, AdminClients, AdminImport, etc.)
│   │   ├── BularioPublico.tsx  ← PÁGINA INICIAL (rota "/") — bulário gratuito + chamada pro plano
│   │   ├── Index.tsx           ← página "Sobre" (rota "/sobre")
│   │   ├── Login.tsx / Register.tsx / ForgotPassword.tsx / ResetPassword.tsx
│   │   └── Planos.tsx (rota "/planos"), Privacidade.tsx
│   ├── components/            ← componentes reutilizáveis (inclui components/dashboard/AppSidebar.tsx = menu lateral)
│   ├── integrations/
│   │   └── supabase/client.ts ← configuração do cliente Supabase (usa as env vars VITE_SUPABASE_*)
│   ├── verticals/              ← suporte a diferentes "verticais" de negócio
│   ├── hooks/, lib/, assets/
│   ├── index.css               ← ⚠️ CORES E TEMA DO SITE FICAM AQUI (variáveis CSS --primary, --accent, etc.)
│   └── App.tsx
├── supabase/
│   ├── functions/              ← Edge Functions (backend serverless): cash-ai, clinical-ai, nutri-ai, vet-assistant,
│   │                              validate-drug, enrich-drug, drug-autocomplete, mp-* (Mercado Pago), admin-*, etc.
│   ├── migrations/              ← alterações de banco de dados (SQL)
│   └── config.toml
├── scripts/prospecting/        ← scripts Python de prospecção de leads (scraping + envio de e-mail), rodam
│                                   automaticamente via GitHub Actions (.github/workflows/daily-campaign.yml, 10h BRT todo dia)
├── public/                     ← arquivos estáticos
├── tailwind.config.ts          ← mapeia as variáveis de --index.css para classes Tailwind (bg-primary, text-accent, etc.)
├── vercel.json                 ← config de deploy (rewrite de rotas SPA)
├── .env                        ← variáveis de ambiente reais (NÃO versionado no Git)
└── .env.example                ← modelo do .env
```

## 5. Como alterar cores / tema visual

O tema inteiro (cor primária, secundária, destaque, sidebar, gradientes) é controlado por variáveis CSS em **`src/index.css`**, dentro do bloco `:root { ... }` (modo claro) e `.dark { ... }` (modo escuro). Elas usam o formato HSL sem a função `hsl()`, ex: `--primary: 215 60% 28%;` (matiz, saturação, luminosidade).

O `tailwind.config.ts` só referencia essas variáveis (`hsl(var(--primary))`), então normalmente **não precisa mexer no Tailwind**, só no `index.css`.

## 6. Como rodar localmente (testar antes de publicar)

```bash
cd "C:\Users\jvito\OneDrive\Desktop\SystemHub"
npm install          # só na primeira vez ou se package.json mudou
npm run dev           # abre em http://localhost:5173 (ou porta similar)
```

Outros comandos úteis:
```bash
npm run build          # gera a build de produção em dist/ (bom pra checar se não quebrou nada)
npm run lint            # checa erros de lint
npm run test             # roda os testes (vitest)
```

## 7. Como publicar uma atualização (deploy)

**Importante**: este projeto **NÃO faz deploy automático** quando você dá `git push`. O Vercel aqui não está com a integração automática do GitHub ativada — o deploy é sempre manual, via CLI. Confirmamos isso na prática: um push sem rodar o comando de deploy não mudou nada no site em produção.

Passo a passo completo:

```bash
cd "C:\Users\jvito\OneDrive\Desktop\SystemHub"

# 1. Confira o que vai mudar
git status
git diff

# 2. Suba só os arquivos que você realmente alterou pra essa tarefa
git add caminho/do/arquivo.tsx
git commit -m "descrição curta da mudança"

# 3. Envie pro GitHub (isso é só backup/histórico, NÃO publica o site)
git push origin main

# 4. Publique de fato em produção (isso sim coloca no ar)
npx vercel --prod --yes
```

O comando `vercel --prod` builda o projeto na nuvem e, ao terminar, já publica automaticamente em `www.systemhub.app.br` (o domínio já está com alias configurado — não precisa reconfigurar nada).

Depois do deploy, sempre confira em **https://systemhub.app.br** com um refresh forçado (`Ctrl+Shift+R`) pra não pegar cache antigo do navegador.

Se o `npx vercel` disser "Logged out", rode `npx vercel login`, abra o link que ele mostrar e aprove com a conta `systemhubrj-1717`.

### 7.1 Publicar Edge Functions (backend no Supabase) — passo separado!

⚠️ O `vercel --prod` publica **só o site**. Se você alterar algo em `supabase/functions/` (ex.: preço nas funções `mp-*`), precisa publicar a função no Supabase também — senão o site mostra uma coisa e o backend faz outra (ex.: site mostra um preço e o Mercado Pago cobra outro).

**Como publicar hoje (jeito que funciona):** pelo painel do Supabase, no navegador logado na conta `systemhubrj-dev`:
1. https://supabase.com/dashboard/project/nktskwrwvnefpyfdpiyu/functions → clique na função → aba **Code**
2. Edite **só o trecho necessário** → botão **Deploy updates** → confirmar.

**Pelo terminal (CLI):** `npx supabase functions deploy <nome> --project-ref nktskwrwvnefpyfdpiyu` — em 17/11/2026 isso **não funcionou**: os tokens de acesso da conta estavam todos expirados e o CLI deu erro 403. Pra voltar a usar, gere um token novo em https://supabase.com/dashboard/account/tokens e rode, no PowerShell, `npx supabase login --token SEU_TOKEN` (nunca cole o token em chat/IA).

⚠️ **As funções publicadas são diferentes (mais antigas) que as do repositório.** Várias foram publicadas há ~6 meses e nunca atualizadas; o código em `supabase/functions/` evoluiu depois (ex.: usa `../_shared/cors.ts`, que a versão publicada não tem). **Não substitua uma função publicada inteira pelo arquivo do repositório sem comparar antes** — edite só o necessário.

## 8. Como desfazer uma alteração (rollback)

Se algo quebrar depois de um deploy:

```bash
# Desfaz o último commit (cria um commit novo revertendo, mantém histórico limpo)
git revert --no-edit HEAD
git push origin main
npx vercel --prod --yes
```

Alternativa mais rápida sem mexer no código: promover uma build anterior direto no Vercel:
```bash
npx vercel ls              # lista deployments anteriores com suas URLs
npx vercel promote <url-do-deployment-antigo>
```

Também dá pra ver/gerenciar deployments pelo painel: https://vercel.com/joao-monteiro-s-projects/system-hub-com-ru97

## 9. Variáveis de ambiente

Ficam em `.env` (não commitado). Modelo em `.env.example`:
```
VITE_SUPABASE_URL="https://SEU-PROJECT-ID.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-anon-key-aqui"
VITE_SUPABASE_PROJECT_ID="seu-project-id-aqui"
```
Essas mesmas variáveis também precisam estar configuradas no painel do Vercel (Settings → Environment Variables) pra funcionar em produção — se um dia o Supabase parar de responder em produção mas funcionar local, é o primeiro lugar pra checar.

## 10. Coisas boas de saber antes de mexer

- **Estado em 17/11/2026**: `supabase/config.toml` tem alteração não commitada, e há vários scripts novos e não versionados em `scripts/prospecting/` (scraping de leads, envio de e-mail em massa via Brevo, agendamento). Isso pode já ter mudado quando você ler isto; rode `git status` pra ver o estado atual antes de mexer, pra não misturar seu pedido com trabalho de outra tarefa.
- **Tela de Clientes (tutores)** (`src/pages/dashboard/Clientes.tsx`): mostra os animais de cada tutor como etiquetas clicáveis que abrem o prontuário (`/dashboard/animais/:id`), também dentro da janela de edição; a busca encontra o tutor pelo nome do animal.
- **Pagamentos — o que está publicado (17/11/2026):** `mp-create-subscription` (cartão), `mp-create-pix` e `mp-create-pix-native` cobram R$ 49,90 e aceitam o plano `vetpro`. Antes disso, as versões publicadas só conheciam os planos antigos e recusavam `vetpro` com "Plano inválido" — ou seja, assinar pelo site provavelmente falhava.

### Pendências conhecidas
- **Assinantes antigos no cartão** continuam pagando R$ 129,90: o Mercado Pago guarda o valor em cada assinatura já criada. Pra baixar, editar cada uma em Mercado Pago → Seu negócio → Assinaturas.
- **`mp-check-payment` publicada não valida o valor do PIX pago** (a versão do repositório valida, mas nunca foi publicada). Vale publicar essa validação com cuidado (ver 7.1).
- **Vercel sem 2FA**: ativar em https://vercel.com/account/settings/authentication
- **Token do GitHub na URL do remote** (ver aviso na seção 2).
- A IA do sistema (bulário, clínico, caixa, nutri, vet-assistant) **migrou do gateway da Lovable para a API da Anthropic (Claude)** — commit `607008f`. Se for mexer nas edge functions de IA, é lá que a chamada ao modelo acontece.
- Os bundles JS de produção estão grandes (alguns acima de 500kB) — o Vite avisa disso no build. Não é erro, é só uma sugestão de otimização (code-splitting) pra considerar no futuro, não bloqueia nada.
- Há testes E2E com Playwright (`playwright.config.ts`, `playwright-fixture.ts`) — rodar `npx playwright test` se quiser validar fluxos completos antes de um deploy grande.
- Pasta `scripts/prospecting/` guarda os scripts Python da campanha de captação de leads (scraping do Google Maps/diretórios + disparo de e-mail via Brevo), com logs (`*_log.txt`) e planilha de backup (`leads_backup.xlsx`) — roda automatizado via GitHub Actions todo dia às 10h BRT.

## 11. Aparecer no Google (SEO / Search Console)

O site não precisa estar hospedado no Google pra aparecer nas buscas — o que importa é estar cadastrado no **Google Search Console**:
- Já prontos no projeto: `public/robots.txt` (libera Googlebot e aponta o sitemap), `public/sitemap.xml`, e título/descrição/imagem de compartilhamento no `index.html`.
- Cadastro: https://search.google.com/search-console → propriedade do tipo **Domínio** `systemhub.app.br` → o Google dá um registro **TXT** (`google-site-verification=...`) que vai no DNS do **Registro.br** → verificar → em **Sitemaps** enviar `https://www.systemhub.app.br/sitemap.xml`.
- Se adicionar páginas públicas novas, inclua-as no `public/sitemap.xml`.
- **Status (17/11/2026): ✅ verificado e sitemap enviado**, na conta Google `jvitor.souza10@gmail.com`. Painel: https://search.google.com/search-console?resource_id=sc-domain:systemhub.app.br
- ⚠️ **Não apague** o registro TXT `google-site-verification=...` da zona DNS no Registro.br — sem ele o Google perde a verificação.

## 12. Resumo rápido pra colar numa IA nova

> "Esse é o projeto SystemHub, um SaaS de gestão veterinária (plano único VetPro, R$ 49,90/mês). Fica em `C:\Users\jvito\OneDrive\Desktop\SystemHub`, é React+Vite+TypeScript+Tailwind com Supabase de backend (projeto `nktskwrwvnefpyfdpiyu`). Deploy do site é manual via `npx vercel --prod --yes` depois de commitar e dar `git push origin main` (não tem deploy automático). Edge functions do Supabase são publicadas à parte, pelo painel do Supabase, e as versões publicadas são mais antigas que o repositório — edite só o necessário. Site em produção: https://systemhub.app.br. Antes de mexer, leia a DOCUMENTACAO.md e rode `git status` pra ver o que já está pendente."
