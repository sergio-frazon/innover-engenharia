# Gestão de Obras

Sistema web para planejamento, execução e controle financeiro de obras: orçamento e cronograma com versões,
diário de obra pelo celular, medições com aprovação, avanço físico ponderado pelo orçamento, contas a pagar e
a receber, fluxo de caixa e alertas. Funciona no navegador do computador e do celular.

Especificação e regras completas: [`docs/`](docs/) (comece por [`docs/01-escopo.md`](docs/01-escopo.md)).

## Perfis

| Perfil | Pode |
|---|---|
| Administrador | Tudo, em todas as obras, e gerenciar usuários |
| Gestor / engenheiro | Obras de que é membro: planejamento, orçamento, cronograma, aprovar diários e medições; vê o financeiro da obra |
| Equipe de campo | Diário de obra e medições das suas obras. **Não vê valores em R$** |
| Financeiro | Contas a pagar e a receber, pagamentos, fluxo de caixa |

---

## Rodar no computador (desenvolvimento)

Pré-requisitos: **Node 20+**, **Docker Desktop aberto** e Git.

```bash
npm install
npx supabase start
```

Copie `.env.example` para `.env.local` e preencha com os valores de `npx supabase status`
(`API_URL`, `ANON_KEY` e `SERVICE_ROLE_KEY`). Depois:

```bash
npx supabase db reset
```

```bash
npm run dev
```

Abra http://localhost:3000.

### Usuários de teste (só no banco local)

Criados pelo `supabase/seed.sql`, todos com a senha de teste definida no topo desse arquivo.

| E-mail | Perfil |
|---|---|
| admin@teste.local | Administrador |
| gestor@teste.local | Gestor (obras A e B) |
| gestor2@teste.local | Gestor (obra C) |
| campo@teste.local | Campo (obra A) |
| financeiro@teste.local | Financeiro (obras A e B) |
| inativo@teste.local | Desativado (não entra) |

E-mails enviados localmente (convites, recuperação de senha) aparecem em http://localhost:54324.
O painel do banco local fica em http://localhost:54323.

### Verificação completa

```bash
npm run lint && npm run typecheck && npm test && npx supabase test db
```

```bash
NEXT_DIST_DIR=.next-verificacao npm run build
```

- `npm test`: testes das funções de formatação, parcelas e cronograma (Vitest).
- `npx supabase test db`: 137 testes das regras de negócio e das permissões direto no banco (pgTAP).

---

## Colocar no ar (produção)

> Use um projeto Supabase **novo**, exclusivo deste sistema.

### 1. Supabase

1. Em https://supabase.com, crie um projeto. Região: **South America (São Paulo)**. Guarde a senha do banco.
2. Em **Project Settings → API**, anote a *Project URL*, a *anon key* e a *service_role key*.
3. No computador, na pasta do projeto:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

   ```bash
   npx supabase db push
   ```

   O `db push` aplica as migrations. O seed de teste **não** vai para produção.
4. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**. Ninguém se cadastra sozinho: os usuários entram por convite.
5. Em **Authentication → URL Configuration**:
   - *Site URL*: `https://SEU-DOMINIO`
   - *Redirect URLs*: `https://SEU-DOMINIO/**`
6. Em **Authentication → Emails → SMTP Settings**, configure um SMTP próprio (Resend, Brevo, etc.). O SMTP padrão do Supabase envia poucos e-mails por hora e não serve para uso real.
7. **Backup:** o plano gratuito não tem backup gerenciado. Antes de colocar dados reais, assine o plano **Pro**, que faz backup diário com restauração.

### 2. Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, importe o repositório.
3. Em **Environment Variables**, cadastre:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**secreta**) |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` |

4. Faça o deploy e, se quiser, configure um domínio próprio em **Settings → Domains**.

### 3. Primeiro administrador

Com as variáveis de produção no terminal:

```bash
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SITE_URL=https://SEU-DOMINIO npx tsx scripts/criar-admin.ts email@empresa.com.br "Nome Completo"
```

A pessoa recebe um e-mail, define a senha e entra como administrador. Os demais usuários são convidados pela tela
**Administração → Usuários**.

### Atualizações futuras do banco

Nunca edite uma migration que já foi aplicada em produção. Crie um arquivo novo em `supabase/migrations/` e rode
`npx supabase db push`.

---

## Estrutura

```
docs/                 especificação, regras, permissões, telas, plano e decisões
supabase/migrations/  banco: tabelas, regras (triggers), permissões (RLS), views
supabase/tests/       testes pgTAP das regras e permissões
supabase/seed.sql     dados de teste (somente local)
src/app/              telas (Next.js App Router) e ações do servidor
src/components/       componentes de interface
src/lib/              utilitários (formatação, autenticação, upload, cálculos)
scripts/criar-admin.ts
```
