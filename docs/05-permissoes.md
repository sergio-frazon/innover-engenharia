# Permissões

## Perfis

| Papel | Quem é | Escopo de obras |
|---|---|---|
| `admin` | Dono / administrador do sistema | Todas |
| `gestor` | Engenheiro responsável | Obras de que é membro |
| `campo` | Encarregado, mestre de obras, técnico | Obras de que é membro |
| `financeiro` | Contas a pagar e receber | Obras de que é membro, mais lançamentos sem obra |

Usuário inativo (`perfis.ativo = false`) não acessa nada: `papel_atual()` retorna `null` e todas as políticas falham.

## Matriz perfil × ação

L = lê · E = cria/edita · A = aprova · — = sem acesso. "Obra" = apenas nas obras que acessa (`acessa_obra`).

| Recurso | admin | gestor | campo | financeiro |
|---|---|---|---|---|
| Usuários (`perfis`, `obra_membros`) | L E | L (nomes dos membros das suas obras) | L (nomes dos membros das suas obras) | L (nomes dos membros das suas obras) |
| Próprio perfil (nome, telefone) | E | E | E | E |
| Obras — criar | E | E | — | — |
| Obras — dados | L E | L E (obra) | L (obra) | L (obra) |
| Membros da obra | E | E (obra; não pode remover a si mesmo nem o responsável) | — | — |
| Documentos | L E | L E (obra) | L E (obra) | L (obra) |
| Etapas e serviços | L E | L E (obra) | L (obra) | L (obra) |
| Orçamento (versões, itens, valores) | L E A | L E A (obra) | **—** | L (obra) |
| Cronograma (versões, atividades) | L E A | L E A (obra) | L (obra; só versão aprovada) | L (obra) |
| Progresso (funções `progresso_*`) | L | L (obra) | L (obra) | L (obra) |
| Diário (e filhos) | L E A | L E A (obra) | L (obra); E em rascunho/correção (R-DIA-03) | — |
| Medições | L E A | L E A (obra) | L (obra); E em rascunho | — |
| Pessoas | L E | L E | L (só `id`, `nome` via view `v_pessoas_basico`) | L E |
| Profissionais, materiais, equipamentos | L E | L E | L | L |
| Categorias financeiras | L E | L | — | L E |
| Lançamentos, parcelas, baixas | L E | L (obra) | **—** | L E (obra + sem obra) |
| Custo previsto × realizado (views) | L | L (obra) | — | L (obra) |
| Auditoria | L | L (obra) | — | L (registros financeiros) |
| Alertas | conforme `04-regras-negocio.md` (R-ALE) |

## Implementação no RLS

Padrões de política (nomes em português, ex.: `"membros leem servicos"`):

```sql
-- Leitura por obra
create policy "membros leem servicos" on servicos for select
  using (acessa_obra(obra_id));

-- Escrita por papel + obra
create policy "gestores editam servicos" on servicos for all
  using (tem_papel('admin','gestor') and acessa_obra(obra_id))
  with check (tem_papel('admin','gestor') and acessa_obra(obra_id) and obra_editavel(obra_id));

-- Tabelas filhas sem obra_id: subir pelo pai
create policy "leem itens de orcamento" on orcamento_itens for select
  using (exists (select 1 from orcamento_versoes v
                 where v.id = versao_id
                   and acessa_obra(v.obra_id)
                   and tem_papel('admin','gestor','financeiro')));
```

Regras específicas:

- **`campo` e orçamento:** nenhuma política de `orcamento_versoes`/`orcamento_itens` inclui `campo`. O progresso chega ao `campo` pelas funções `progresso_*` (security definer, sem colunas em R$).
- **`campo` e cronograma:** lê apenas `cronograma_versoes.status = 'aprovada'` e suas atividades/dependências.
- **`campo` e diário:** `update`/`delete` exigem `status in ('rascunho','correcao_solicitada')` no diário pai; delete só em `rascunho` e se `criado_por = auth.uid()`.
- **Mudança de status** de diário/medição/versão **só por RPC**. Um trigger rejeita `update` direto da coluna `status` (comparando `old.status <> new.status`), exceto quando a variável de sessão `app.via_rpc = 'on'` foi ligada pela própria RPC (`set_config('app.via_rpc','on', true)`).
- **Financeiro sem obra:** lançamentos com `obra_id is null` são visíveis apenas a `admin` e `financeiro`.
- **`perfis`:** cada um lê o próprio; lê também os perfis que compartilham alguma obra consigo (para mostrar nomes); admin lê todos. Só admin altera `papel`/`ativo`.
- **`auditoria`:** select para admin; gestor onde `acessa_obra(obra_id)`; financeiro onde `tabela in ('lancamentos','parcelas','baixas')` e (`obra_id is null` ou `acessa_obra(obra_id)`). Sem insert/update/delete para ninguém.
- **Storage:** `storage.objects` com políticas por bucket, usando `(storage.foldername(name))[1]::uuid` como obra:
  - `documentos`: select se `acessa_obra`; insert se `acessa_obra` e papel ≠ `financeiro`; sem update/delete.
  - `comprovantes`: select/insert para `admin`/`financeiro` com acesso à obra (ou pasta `sem-obra`); sem update/delete.

## Testes obrigatórios de RLS (pgTAP, `supabase/tests/rls.test.sql`)

Usar os usuários do seed e `set local role authenticated; set local request.jwt.claims = '{"sub":"<uuid>"}'`.

1. `campo` não lê nenhuma linha de `orcamento_itens` nem de `lancamentos`, mesmo da sua obra.
2. `campo` lê `progresso_servicos` da sua obra e recebe erro para obra de que não é membro.
3. `gestor` da obra A não lê nada da obra B.
4. `campo` não edita diário `enviado`, mas edita `rascunho`.
5. `campo` não muda `status` de diário por `update` direto.
6. `financeiro` lê lançamentos sem obra; `gestor` não.
7. Usuário inativo não lê nada.
8. Ninguém (nem admin) insere ou altera `auditoria` diretamente.
9. Item de orçamento aprovado não pode ser alterado nem por admin (R-VER-03).
