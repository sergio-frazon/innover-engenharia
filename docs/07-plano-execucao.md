# Plano de execução — Fase 1

Executar **na ordem**. Cada passo só começa quando o anterior cumpre o "Pronto quando".
Ao concluir um passo: marcar `[x]`, rodar a verificação e fazer um commit `passo NN: <resumo>`.
Se um passo falhar de forma que exija mudar uma decisão, parar e registrar em `08-decisoes.md` antes de seguir.

Banco primeiro, telas depois: as telas só começam (passo 11) quando todas as regras do banco estiverem testadas.

---

## Passo 0 — Pré-requisitos (feitos pelo usuário, não pelo Claude)

- [x] Docker Desktop instalado e **aberto** (o Supabase local roda nele). Verificar: `docker info` sem erro.
- [x] Node 20+ (já instalado: v24) e Git (já instalado).
- [ ] Para o deploy, no final: conta no Supabase e na Vercel, e um repositório no GitHub.

---

## Banco de dados

> Status em 11/11/2026: passos 1 a 21 concluídos. Pendente: deploy (exige as contas do cliente) — ver README.

### Passo 1 — Projeto base
- [x] `create-next-app` (TypeScript, Tailwind, ESLint, App Router, `src/`, alias `@/*`) na pasta `gestao-obras/` (que já contém `CLAUDE.md` e `docs/`).
- [x] Instalar dependências de `02-arquitetura.md`; `npx shadcn@latest init` e adicionar os componentes listados.
- [x] Scripts no `package.json`: `typecheck` (`tsc --noEmit`), `test` (`vitest run`), `db:types` (`supabase gen types typescript --local > src/lib/supabase/database.types.ts`).
- [x] `git init`, `.gitignore` (inclui `.env*.local`, `supabase/.temp`), `.env.example`.
- [x] `<html lang="pt-BR">`, fonte Inter (next/font), metadata "Gestão de Obras".

**Pronto quando:** `npm run dev` abre a página inicial; `lint`, `typecheck` e `build` passam.

### Passo 2 — Supabase local
- [x] `npx supabase init`; em `config.toml`: `[auth] enable_signup = false`, `site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/auth/callback"]`, `[auth.email] enable_confirmations = false`.
- [x] `npx supabase start`; copiar URL e chaves para `.env.local`.

**Pronto quando:** Studio abre em http://localhost:54323.

### Passo 3 — Migration `0001_base.sql`
- [x] Extensão `pgtap` (para testes) e `pgcrypto` se necessário.
- [x] Funções `tocar_atualizado_em()`, `hoje()`.
- [x] Tabela `perfis` + trigger em `auth.users` + trigger de proteção de colunas (`papel`, `ativo`, `email`) + regra "último admin ativo".
- [x] Funções `papel_atual()`, `eh_admin()`, `tem_papel()`.
- [x] Tabela `auditoria` + função `auditar()` (genérica, `security definer`, lê `obra_id` de `new`/`old` quando existir, ou de um argumento do trigger que diz como achar a obra pelo pai).
- [x] Função `exigir_via_rpc()` para bloquear mudança direta de `status` (ver `05-permissoes.md`).
- [x] RLS de `perfis` e `auditoria`.

**Pronto quando:** `npx supabase db reset` sem erro e `supabase/tests/base.test.sql` cobre: criação de perfil pelo trigger, usuário comum não muda o próprio papel, auditoria não aceita insert direto.

### Passo 4 — Migration `0002_cadastros_obras.sql`
- [x] `pessoas`, `v_pessoas_basico`, `profissionais`, `materiais`, `equipamentos`, `categorias_financeiras` (com categorias padrão inseridas).
- [x] `obras` (código automático), `obra_membros` (trigger R-OBR-01), `acessa_obra()`, `obra_editavel()`, triggers R-OBR-02/04.
- [x] RLS e auditoria de todas.

**Pronto quando:** testes pgTAP de R-OBR-01..04 e itens 3 e 7 da lista de RLS passam.

### Passo 5 — Migration `0003_planejamento.sql`
- [x] `etapas`, `servicos` (inclui `data_fim_real_automatica boolean not null default false`), `documentos`, `v_documentos_atuais`.
- [x] `orcamento_versoes`, `orcamento_itens`, `cronograma_versoes`, `cronograma_atividades`, `cronograma_dependencias`.
- [x] Triggers: mesma obra, `bloquear_versao_fechada()`, numeração de versão, ciclo e consistência de dependência, versão de documento.
- [x] RPCs de versão.
- [x] RLS e auditoria.

**Pronto quando:** testes de todas as regras R-VER, R-ORC-01, R-PRZ-03, R-DOC-01 e item 9 de RLS passam.

### Passo 6 — Migration `0004_execucao.sql`
- [x] `diarios`, `diario_equipe`, `diario_materiais`, `diario_equipamentos`, `diario_ocorrencias`, `medicoes`.
- [x] Triggers R-DIA-01/03/06, `bloquear_diario_fechado()`, R-MED-03..09.
- [x] RPCs de diário e medição.
- [x] RLS e auditoria.

**Pronto quando:** testes de todas as regras R-DIA e R-MED (incluindo o **exemplo de referência** de `04-regras-negocio.md`) e itens 4 e 5 de RLS passam.

### Passo 7 — Migration `0005_financeiro.sql`
- [x] `lancamentos`, `parcelas`, `baixas`. Triggers R-FIN-03/04/07/08.
- [x] RPCs financeiras.
- [x] RLS e auditoria.

**Pronto quando:** testes de R-FIN-01..08 e itens 1 e 6 de RLS passam.

### Passo 8 — Migration `0006_views_progresso.sql`
- [x] Views `v_orcamento_totais_servico`, `v_orcamento_totais_etapa`, `v_custo_obra`, `v_custo_previsto_realizado`, `v_parcelas_situacao`, `v_fluxo_caixa`, `v_alertas` (todas `security_invoker`).
- [x] Funções `progresso_servicos`, `progresso_etapas`, `progresso_obras`.

**Pronto quando:** teste do exemplo de referência confere 7,5% → 75% → 81,25%; testes de R-PROG-03/04, R-PRZ (uma situação por caso, controlando "hoje" por datas relativas a `hoje()`), R-FIN-02/05/06, R-ALE; item 2 de RLS.

### Passo 9 — Migration `0007_storage.sql`
- [x] Buckets `documentos` e `comprovantes` (privados, limites e tipos de `02-arquitetura.md`).
- [x] Políticas de `storage.objects`.

**Pronto quando:** teste pgTAP confirma que `campo` não insere em `comprovantes` e que membro de outra obra não lê `documentos`.

### Passo 10 — Seed e tipos
- [x] `supabase/seed.sql` (só local): usuários de teste em `auth.users` + `auth.identities` com senha de teste definida no topo do arquivo:
  `admin@teste.local`, `gestor@teste.local` (obras A e B), `gestor2@teste.local` (só obra C), `campo@teste.local` (obra A), `financeiro@teste.local` (A e B), `inativo@teste.local`.
- [x] 3 obras (A em andamento com orçamento e cronograma aprovados e algumas medições; B em planejamento com rascunho; C de outro gestor), pessoas, materiais, profissionais, equipamentos, diários em todos os status, lançamentos em todas as situações (inclusive vencidos e a vencer).
- [x] Datas do seed **relativas a `hoje()`** para que atrasos e vencimentos apareçam sempre.
- [x] `npm run db:types`.

**Pronto quando:** `npx supabase db reset && npx supabase test db` passa por completo.

---

## Aplicação

### Passo 11 — Base da aplicação
- [x] `src/lib/supabase/*` (server, client, admin, middleware), `src/middleware.ts`.
- [x] `src/lib/auth.ts`, `format.ts`, `erros.ts`, `csv.ts`, `storage.ts` + testes Vitest de `format`, `erros`, `csv` e do divisor de parcelas.
- [x] Telas `/login`, `/recuperar-senha`, `/redefinir-senha`, `/auth/callback`.
- [x] Layout `(app)`: menu lateral por perfil, gaveta no celular, barra inferior, contador de alertas, menu do usuário (perfil, sair).
- [x] `/perfil`.

**Pronto quando:** cada usuário do seed entra, vê o menu do seu perfil e sai; o inativo não entra; recuperação de senha chega no Mailpit e funciona.

### Passo 12 — Usuários
- [x] `/admin/usuarios` (convidar, editar, desativar/reativar, obras, reenviar convite).
- [x] `scripts/criar-admin.ts`.

**Pronto quando:** admin convida um usuário novo, o convite chega no Mailpit, o usuário define a senha e entra com o perfil e as obras corretos.

### Passo 13 — Cadastros
- [x] Telas de pessoas (validação CPF/CNPJ), profissionais, materiais, equipamentos, categorias.

### Passo 14 — Obras
- [x] Lista com filtros, formulário (criar/editar), membros, painel da obra (sem os blocos que dependem dos passos seguintes, que ficam com estado vazio), documentos com versões e upload, histórico (auditoria).

### Passo 15 — Planejamento e orçamento
- [x] Etapas/serviços com pesos e situação; orçamento com versões, edição inline, aprovação, comparação, CSV, impressão.

### Passo 16 — Cronograma
- [x] Gantt próprio, lista, versões, dependências, "Empurrar sucessores" (função pura em `src/lib/cronograma.ts` com teste Vitest).

### Passo 17 — Diário e medições
- [x] Lista/calendário, tela do diário completa, envio/aprovação/correção, impressão; tela de medições com aprovação em lote, CSV.
- [x] Testar no navegador em largura de celular (375px) com `campo@teste.local`.

### Passo 18 — Financeiro
- [x] Contas a pagar/receber por parcela, novo lançamento com parcelamento, detalhe, baixas com comprovante, estorno, cancelamento, fluxo de caixa com gráfico, aba financeiro da obra (previsto × realizado), CSV.

### Passo 19 — Painéis e alertas
- [x] Painel geral por perfil, painel da obra completo, `/alertas`.

### Passo 20 — Verificação final (roteiro de aceitação)

Executar no navegador, do começo ao fim, com `db reset` antes:

1. **admin** cria a obra "Residencial Teste", com `gestor` como responsável, e convida um novo usuário de campo para ela.
2. **gestor** cria 2 etapas e 3 serviços, monta o orçamento v1, aprova, monta o cronograma v1 com uma dependência e aprova. Confere os pesos.
3. **gestor** cria a revisão v2 do orçamento, altera um item, compara com a v1 e aprova. A v1 fica "substituída" e não editável.
4. **campo** (no celular, 375px) abre "Diário de hoje", preenche equipe, 2 serviços executados (um com excesso e justificativa), ocorrência e envia.
5. **gestor** solicita correção; **campo** corrige e reenvia; **gestor** aprova. O avanço da obra e o Gantt atualizam.
6. **campo** tenta lançar de novo o mesmo serviço, no mesmo dia e local, em medição avulsa → bloqueado (R-MED-04).
7. **financeiro** lança uma despesa de material em 3 parcelas na etapa 1, paga a 1ª parcialmente com comprovante e confere previsto × realizado e fluxo de caixa.
8. **campo** confirma que não vê nenhum valor em R$ em nenhuma tela.
9. **gestor2** confirma que não vê a obra.
10. Conferir `/alertas` de cada perfil e o histórico de auditoria do diário editado.

Ao final: `npm run lint && npm run typecheck && npm test && npm run build && npx supabase test db` passam.

### Passo 21 — Documentação de entrega
- [x] `README.md` em português: o que é o sistema, como rodar localmente, usuários de teste, como fazer o deploy (seção "Deploy" de `02-arquitetura.md` detalhada passo a passo, com prints de onde clicar descritos em texto), backup, como criar o primeiro admin.
- [x] Atualizar `08-decisoes.md` com tudo que foi assumido durante a execução.

O deploy em si (Supabase Cloud + Vercel) é feito com o usuário, porque exige as contas dele.
