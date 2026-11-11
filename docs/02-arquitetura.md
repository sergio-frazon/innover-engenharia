# Arquitetura

## Visão geral

```
Navegador (PC / celular)
   │  HTTPS
   ▼
Next.js 15 na Vercel ── Server Components (leitura) / Server Actions (escrita)
   │  @supabase/ssr com o JWT do usuário logado (cookie)
   ▼
Supabase
   ├─ Auth      → login e-mail/senha, recuperação de senha, convites
   ├─ Postgres  → tabelas, RLS, triggers, views, funções RPC
   └─ Storage   → buckets privados "documentos" e "comprovantes"
```

Toda consulta usa o token do próprio usuário, então o RLS decide o que ele vê.
A chave `service_role` só é usada no servidor para criar/convidar/desativar usuários (`src/lib/supabase/admin.ts`).

## Dependências

Versões mínimas; fixar a versão exata no `package.json` ao instalar.

| Pacote | Uso |
|---|---|
| `next@15`, `react@19`, `react-dom@19` | App |
| `typescript`, `@types/*`, `eslint`, `eslint-config-next` | Qualidade |
| `tailwindcss@4`, `@tailwindcss/postcss` | Estilo |
| shadcn/ui (CLI `npx shadcn@latest init`) + `lucide-react` | Componentes: button, input, label, select, textarea, dialog, sheet, dropdown-menu, table, tabs, badge, card, form, sonner (toasts), calendar, popover, checkbox, separator, skeleton, alert, tooltip |
| `@supabase/supabase-js@2`, `@supabase/ssr` | Banco e auth |
| `supabase` (devDependency) | CLI: banco local, migrations, tipos, testes |
| `zod@3` | Validação |
| `date-fns@4` | Datas (`ptBR`) |
| `recharts@2` | Gráficos do painel |
| `vitest`, `@vitejs/plugin-react` | Testes unitários |

Gantt: **componente próprio** (CSS grid + divs), sem biblioteca. Ver `06-telas.md`.

## Estrutura de pastas

```
gestao-obras/
├─ CLAUDE.md
├─ docs/
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/              # um arquivo por módulo, ver 07-plano-execucao.md
│  ├─ seed.sql                 # dados de teste locais (NUNCA rodar em produção)
│  └─ tests/                   # pgTAP: *.test.sql
├─ scripts/
│  └─ criar-admin.ts           # cria o primeiro admin em produção (convite por e-mail)
├─ src/
│  ├─ middleware.ts            # renova sessão e redireciona não logados para /login
│  ├─ app/
│  │  ├─ (auth)/login, recuperar-senha, redefinir-senha
│  │  ├─ auth/callback/route.ts       # troca code por sessão (convite / recuperação)
│  │  └─ (app)/                       # layout com menu lateral, exige sessão
│  │     ├─ painel/
│  │     ├─ obras/  obras/nova/  obras/[obraId]/...
│  │     ├─ financeiro/ ...
│  │     ├─ cadastros/ ...
│  │     ├─ alertas/
│  │     └─ admin/usuarios/
│  ├─ components/
│  │  ├─ ui/                   # shadcn (gerado)
│  │  ├─ layout/               # menu, cabeçalho, breadcrumb
│  │  └─ <modulo>/             # componentes por módulo (obras, orcamento, diario...)
│  └─ lib/
│     ├─ supabase/server.ts, client.ts, admin.ts, middleware.ts, database.types.ts
│     ├─ auth.ts               # getUsuario(), exigirPapel(...papeis)
│     ├─ format.ts             # moeda, número, data, percentual (pt-BR)
│     ├─ erros.ts              # traduz erro do Supabase para mensagem ao usuário
│     ├─ storage.ts            # upload/URL assinada
│     └─ csv.ts                # exportação CSV (separador ";" e BOM UTF-8 para abrir no Excel)
└─ .env.example
```

## Variáveis de ambiente

`.env.example` (copiar para `.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=        # saída de `npx supabase status`
SUPABASE_SERVICE_ROLE_KEY=            # saída de `npx supabase status` — só servidor
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Nenhuma outra variável na Fase 1.

## Autenticação

- Login por e-mail e senha (`signInWithPassword`). **Cadastro público desativado** (`config.toml`: `enable_signup = false`).
- Novos usuários: admin preenche nome, e-mail, perfil e obras → `auth.admin.inviteUserByEmail` com `redirectTo = /auth/callback?next=/redefinir-senha`.
- Recuperação: `resetPasswordForEmail` com o mesmo redirect.
- Desativar usuário: `perfis.ativo = false` **e** `auth.admin.updateUserById(id, { ban_duration: '876000h' })`. Reativar remove o ban.
- `middleware.ts`: renova a sessão; rotas de `(app)` exigem sessão; usuário com `perfis.ativo = false` é deslogado.
- `exigirPapel()` no servidor protege páginas/ações por perfil (defesa extra; o RLS é a barreira real).
- Local: e-mails caem no Mailpit (http://localhost:54324).

## Padrão de Server Action

```ts
'use server'
export async function salvarServico(_prev: Resultado, formData: FormData): Promise<Resultado> {
  const dados = servicoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return { ok: false, erro: 'Verifique os campos.', campos: errosDeCampo(dados.error) }
  const supabase = await createClient()
  const { error } = await supabase.from('servicos').upsert(dados.data)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidatePath(`/obras/${dados.data.obra_id}/planejamento`)
  return { ok: true }
}
```

Operações que mexem em várias tabelas ao mesmo tempo (aprovar versão, criar revisão, aprovar diário, criar lançamento com parcelas)
são **funções RPC no Postgres** (transação única), chamadas com `supabase.rpc(...)`.

## Storage

| Bucket | Conteúdo | Limite | Tipos aceitos |
|---|---|---|---|
| `documentos` | Projetos, plantas, contratos | 50 MB | pdf, dwg, dxf, jpg, png, xlsx, xls, docx, doc, zip |
| `comprovantes` | Comprovantes de pagamento | 10 MB | pdf, jpg, png |

- Ambos **privados**. Download sempre por URL assinada (60 s).
- Caminho: `{obra_id}/{uuid}/{nome-original-sanitizado}`. Comprovante sem obra: `sem-obra/{uuid}/...`.
- Política de Storage: lê/escreve quem tem acesso à obra do primeiro segmento do caminho (ver `05-permissoes.md`).

## Deploy (feito ao final, ver passo 21 do plano)

1. Criar projeto no Supabase Cloud (região São Paulo, `sa-east-1`).
2. `npx supabase link --project-ref <ref>` e `npx supabase db push` (aplica migrations; **não** aplica seed).
3. Configurar no Supabase: Site URL e Redirect URLs (`https://<dominio>/auth/callback`), SMTP próprio (o padrão do Supabase tem limite baixo de e-mails), signup desativado.
4. Criar projeto na Vercel apontando para o repositório, com as 4 variáveis de ambiente.
5. Rodar `npx tsx scripts/criar-admin.ts <email> "<nome>"` com as variáveis de produção para convidar o primeiro admin.
6. Backups: o plano Pro do Supabase faz backup diário com restauração (exigência da seção 8). No plano gratuito, não há backup gerenciado; ver `08-decisoes.md`.
