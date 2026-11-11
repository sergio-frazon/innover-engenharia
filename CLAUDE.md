# Sistema de Gestão de Obras — instruções para o Claude

Sistema web para uso real (usuários reais, dados reais) de uma empresa de engenharia.
Centraliza planejamento, execução e financeiro de obras. Interface 100% em português do Brasil.

## Leia antes de qualquer tarefa

| Arquivo | Quando ler |
|---|---|
| `docs/00-especificacao-original.md` | Fonte da verdade funcional (documento do cliente). Não editar. |
| `docs/01-escopo.md` | O que entra e o que NÃO entra na fase atual |
| `docs/02-arquitetura.md` | Stack, estrutura de pastas, padrões de código |
| `docs/03-modelo-dados.md` | Todas as tabelas, colunas, constraints, views e funções |
| `docs/04-regras-negocio.md` | Cálculos e regras (percentuais, versões, aprovações, duplicidade) |
| `docs/05-permissoes.md` | Matriz perfil × ação e como as políticas RLS a implementam |
| `docs/06-telas.md` | Rotas, telas e o que cada uma mostra |
| `docs/07-plano-execucao.md` | Ordem de execução, passo a passo, com critério de pronto |
| `docs/08-decisoes.md` | Decisões tomadas e suposições adotadas |

Se um documento contradisser outro, a ordem de prioridade é: `00` > `04` > `03` > `05` > demais.
Se encontrar uma contradição real, registre em `docs/08-decisoes.md` (seção "Suposições") a escolha feita.

## Stack (versões fixas — não atualizar sem motivo)

- Next.js 15 (App Router, Server Components, Server Actions), React 19, TypeScript `strict`
- Tailwind CSS 4 + shadcn/ui + lucide-react
- Supabase: Postgres 15+, Auth, Storage, RLS. Local via Supabase CLI (Docker). Produção: Supabase Cloud
- Hospedagem: Vercel
- Validação: zod. Datas: date-fns com locale `ptBR`. Gráficos: recharts
- Testes: Vitest (funções TS puras) e pgTAP via `supabase test db` (RLS, triggers, funções SQL)

## Comandos

```bash
npm run dev            # Next em http://localhost:3000
npx supabase start     # Supabase local (Studio: http://localhost:54323, e-mails: http://localhost:54324)
npx supabase db reset  # recria o banco local aplicando migrations + seed
npx supabase test db   # testes pgTAP em supabase/tests
npm run db:types       # regenera src/lib/supabase/database.types.ts
npm run lint && npm run typecheck && npm test && npm run build   # verificação completa
```

## Regras inegociáveis

1. **Regra de negócio e segurança moram no banco.** Constraints, triggers, RLS e funções RPC garantem integridade.
   A UI pode validar antes (para dar mensagem amigável), mas nunca é a única barreira.
2. **RLS ligado em TODAS as tabelas de `public`.** Nenhuma tabela sem política. A chave `service_role`
   só é usada em `src/lib/supabase/admin.ts`, apenas para gestão de usuários, e nunca chega ao navegador.
3. **Nada de exclusão física de registros de negócio.** Use `ativo = false`, `cancelado = true` ou status.
   Só rascunhos podem ser apagados de verdade.
4. **Versões aprovadas são imutáveis.** Orçamento e cronograma aprovados não podem ser alterados (trigger bloqueia).
   Revisão = nova versão copiada da aprovada.
5. **Dinheiro:** `numeric(14,2)` no banco, nunca `float`. Quantidades: `numeric(14,4)`. Cálculos agregados em views SQL.
   No TS, apenas formatação (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).
6. **Datas:** `date` para datas de calendário (diário, vencimento), `timestamptz` para eventos.
   Fuso de referência: `America/Sao_Paulo`. "Hoje" no banco = `(now() at time zone 'America/Sao_Paulo')::date`.
7. **Auditoria:** toda tabela marcada como "auditada" em `03-modelo-dados.md` recebe o trigger `auditar()`.
8. **Nomes:** tabelas, colunas e funções do domínio em português, `snake_case`, sem acentos (`orcamento_itens`).
   Código genérico (componentes, utilitários) pode ser em inglês. Textos de tela sempre em português com acentos.
9. **Migrations são imutáveis depois de aplicadas em produção.** Para mudar, crie uma nova migration.
   Antes do primeiro deploy, pode editar e rodar `npx supabase db reset`.
10. **Não invente funcionalidade fora do escopo** (`docs/01-escopo.md`). Se algo parecer necessário, anote em `08-decisoes.md`.

## Padrões de código

- Leitura de dados em Server Components via `createClient()` de `src/lib/supabase/server.ts`.
- Escrita via Server Actions em `src/app/**/actions.ts`, sempre: validar com zod → chamar Supabase →
  tratar erro → `revalidatePath`. Retornar `{ ok: true } | { ok: false, erro: string, campos?: Record<string,string> }`.
- Erros do Postgres levantados por triggers usam `raise exception using errcode = 'P0001', message = '<mensagem em português para o usuário>'`.
  A action repassa `error.message` ao usuário quando `error.code === 'P0001'`; nos demais casos, mensagem genérica + `console.error`.
- Componentes de formulário: client components pequenos usando `useActionState`.
- Tipos do banco sempre de `database.types.ts` (gerado). Nunca escrever tipos de tabela à mão.
- Celular primeiro: toda tela precisa funcionar a partir de 360px de largura. Tabelas largas viram cards no celular.

## Definição de pronto (vale para cada passo do plano)

- `npm run lint`, `npm run typecheck`, `npm test` e `npx supabase test db` passam sem erros.
- A funcionalidade foi testada no navegador com pelo menos um usuário de cada perfil afetado (ver usuários do seed).
- O passo foi marcado como concluído em `docs/07-plano-execucao.md`.
