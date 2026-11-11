-- =============================================================================
-- 0005 · Financeiro: lançamentos, parcelas e baixas
-- Referências: docs/03-modelo-dados.md §6, R-FIN-*
-- =============================================================================

-- R$ no formato brasileiro para mensagens de erro (independe do locale do servidor)
create or replace function public.formatar_reais(p_valor numeric)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(to_char(round(p_valor, 2), 'FM999,999,999,990.00'), ',', '#'), '.', ','), '#', '.')
$$;

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('pagar', 'receber')),
  descricao text not null check (length(trim(descricao)) > 0),
  categoria_id uuid not null references public.categorias_financeiras (id),
  obra_id uuid references public.obras (id),
  etapa_id uuid references public.etapas (id),
  natureza text check (natureza in ('material', 'mao_de_obra', 'equipamento', 'outro')),
  pessoa_id uuid references public.pessoas (id),
  documento_numero text,
  data_competencia date not null,
  valor_total numeric(14, 2) not null check (valor_total > 0),
  cancelado boolean not null default false,
  motivo_cancelamento text,
  observacao text,
  origem_tipo text,
  origem_id uuid,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint lancamentos_cancelamento check (not cancelado or length(trim(coalesce(motivo_cancelamento, ''))) > 0),
  constraint lancamentos_etapa_exige_obra check (etapa_id is null or obra_id is not null),
  -- R-FIN-08
  constraint lancamentos_natureza check (tipo <> 'pagar' or obra_id is null or natureza is not null)
);
-- R-FIN-09 (Fase 2)
create unique index lancamentos_origem_unica on public.lancamentos (origem_tipo, origem_id)
  where origem_tipo is not null and origem_id is not null;
create index lancamentos_obra_idx on public.lancamentos (obra_id, tipo);
create index lancamentos_pessoa_idx on public.lancamentos (pessoa_id);
create index lancamentos_competencia_idx on public.lancamentos (data_competencia);

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  lancamento_id uuid not null references public.lancamentos (id) on delete cascade,
  numero int not null check (numero > 0),
  vencimento date not null,
  valor numeric(14, 2) not null check (valor > 0),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (lancamento_id, numero)
);
create index parcelas_vencimento_idx on public.parcelas (vencimento);

create table public.baixas (
  id uuid primary key default gen_random_uuid(),
  parcela_id uuid not null references public.parcelas (id),
  data_pagamento date not null,
  valor numeric(14, 2) not null check (valor > 0),
  juros_multa numeric(14, 2) not null default 0 check (juros_multa >= 0),
  desconto numeric(14, 2) not null default 0 check (desconto >= 0),
  forma text not null check (forma in ('pix', 'boleto', 'transferencia', 'dinheiro', 'cartao', 'cheque', 'outro')),
  comprovante_caminho text,
  observacao text,
  estornada boolean not null default false,
  motivo_estorno text,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint baixas_estorno check (not estornada or length(trim(coalesce(motivo_estorno, ''))) > 0)
);
create index baixas_parcela_idx on public.baixas (parcela_id);
create index baixas_data_idx on public.baixas (data_pagamento);

-- -----------------------------------------------------------------------------
-- Permissões
-- -----------------------------------------------------------------------------

create or replace function public.pode_ler_financeiro_obra(p_obra uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (public.tem_papel('admin', 'financeiro') and (p_obra is null or public.acessa_obra(p_obra)))
      or (public.tem_papel('gestor') and p_obra is not null and public.acessa_obra(p_obra))
$$;

create or replace function public.pode_editar_financeiro_obra(p_obra uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.tem_papel('admin', 'financeiro')
     and (p_obra is null or (public.acessa_obra(p_obra) and public.obra_editavel(p_obra)))
$$;

create or replace function public.exigir_financeiro_obra(p_obra uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.sessao_interna() and not public.pode_editar_financeiro_obra(p_obra) then
    perform public.erro('Você não tem permissão para lançamentos financeiros desta obra.');
  end if;
end;
$$;

create or replace function public.pode_ler_lancamento(p_lancamento uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.lancamentos l
                  where l.id = p_lancamento and public.pode_ler_financeiro_obra(l.obra_id))
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

create or replace function public.lancamentos_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tipo_categoria text;
  v_pessoa record;
begin
  if tg_op = 'UPDATE' and not public.sessao_interna() and not public.via_rpc() then
    if new.cancelado is distinct from old.cancelado or new.valor_total is distinct from old.valor_total
       or new.tipo is distinct from old.tipo then
      perform public.erro('Use as ações de cancelar ou alterar parcelas para mudar valor, tipo ou situação.');
    end if;
    if old.cancelado then
      perform public.erro('Lançamento cancelado não pode ser alterado.');
    end if;
  end if;

  -- R-FIN-07
  select tipo into v_tipo_categoria from public.categorias_financeiras where id = new.categoria_id;
  if (new.tipo = 'pagar' and v_tipo_categoria <> 'despesa') or (new.tipo = 'receber' and v_tipo_categoria <> 'receita') then
    perform public.erro(case when new.tipo = 'pagar'
      then 'Conta a pagar precisa de uma categoria de despesa.'
      else 'Conta a receber precisa de uma categoria de receita.' end);
  end if;

  if new.etapa_id is not null and not exists (
       select 1 from public.etapas e where e.id = new.etapa_id and e.obra_id = new.obra_id) then
    perform public.erro('A etapa escolhida pertence a outra obra.');
  end if;
  if new.tipo = 'pagar' and new.obra_id is not null and new.natureza is null then
    perform public.erro('Informe a natureza do custo (material, mão de obra, equipamento ou outro).');
  end if;
  if new.obra_id is null then
    new.etapa_id := null;
  end if;

  if new.pessoa_id is not null and (tg_op = 'INSERT' or new.pessoa_id is distinct from old.pessoa_id) then
    select * into v_pessoa from public.pessoas where id = new.pessoa_id;
    if new.tipo = 'pagar' and not (v_pessoa.eh_fornecedor or v_pessoa.eh_prestador) then
      perform public.erro('Para contas a pagar, escolha um fornecedor ou prestador.');
    end if;
    if new.tipo = 'receber' and not v_pessoa.eh_cliente then
      perform public.erro('Para contas a receber, escolha um cliente.');
    end if;
  end if;

  if tg_op = 'UPDATE' and new.obra_id is distinct from old.obra_id then
    perform public.exigir_obra_editavel(old.obra_id);
  end if;
  perform public.exigir_obra_editavel(new.obra_id);
  return new;
end;
$$;

create trigger lancamentos_antes_gravar before insert or update on public.lancamentos
  for each row execute function public.lancamentos_antes_gravar();

-- Parcelas e baixas só mudam por RPC (exceto inserção de baixa)
create or replace function public.parcelas_somente_rpc()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not public.sessao_interna() and not public.via_rpc() then
    perform public.erro('Use a ação de alterar parcelas do lançamento.');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger parcelas_somente_rpc before insert or update or delete on public.parcelas
  for each row execute function public.parcelas_somente_rpc();

create or replace function public.baixas_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parcela record;
  v_pago numeric;
begin
  if tg_op = 'DELETE' then
    if not public.sessao_interna() then
      perform public.erro('Pagamentos não são excluídos. Use a opção de estornar.');
    end if;
    return old;
  end if;

  if tg_op = 'UPDATE' and not public.sessao_interna() and not public.via_rpc() then
    if row(new.parcela_id, new.data_pagamento, new.valor, new.juros_multa, new.desconto, new.forma, new.estornada)
       is distinct from row(old.parcela_id, old.data_pagamento, old.valor, old.juros_multa, old.desconto, old.forma, old.estornada) then
      perform public.erro('Pagamentos registrados não podem ser alterados. Estorne e registre novamente.');
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    select p.*, l.cancelado, l.obra_id into v_parcela
      from public.parcelas p join public.lancamentos l on l.id = p.lancamento_id
     where p.id = new.parcela_id for update of p;
    if v_parcela.cancelado then
      perform public.erro('Lançamento cancelado não aceita pagamentos.');
    end if;
    perform public.exigir_financeiro_obra(v_parcela.obra_id);
    if new.data_pagamento > public.hoje() then
      perform public.erro('A data do pagamento não pode ser futura.');
    end if;
    if new.estornada then
      perform public.erro('Não é possível registrar um pagamento já estornado.');
    end if;
    -- R-FIN-03
    select coalesce(sum(b.valor + b.desconto), 0) into v_pago
      from public.baixas b where b.parcela_id = new.parcela_id and not b.estornada;
    if v_pago + new.valor + new.desconto > v_parcela.valor then
      perform public.erro(format('O valor ultrapassa o saldo da parcela (saldo de R$ %s).',
        public.formatar_reais(v_parcela.valor - v_pago)));
    end if;
  end if;
  return new;
end;
$$;

create trigger baixas_antes_gravar before insert or update or delete on public.baixas
  for each row execute function public.baixas_antes_gravar();

-- -----------------------------------------------------------------------------
-- RPCs
-- -----------------------------------------------------------------------------

-- Valida e grava as parcelas de um lançamento (R-FIN-01)
create or replace function public.gravar_parcelas(p_lancamento uuid, p_parcelas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total numeric;
  v_qtd int;
begin
  if jsonb_typeof(p_parcelas) <> 'array' or jsonb_array_length(p_parcelas) = 0 then
    perform public.erro('Informe pelo menos uma parcela.');
  end if;

  select count(*), sum((x ->> 'valor')::numeric(14, 2)) into v_qtd, v_total
    from jsonb_array_elements(p_parcelas) x;
  if exists (select 1 from jsonb_array_elements(p_parcelas) x
              where (x ->> 'valor') is null or (x ->> 'valor')::numeric <= 0 or (x ->> 'vencimento') is null) then
    perform public.erro('Toda parcela precisa de vencimento e valor maior que zero.');
  end if;

  delete from public.parcelas p
   where p.lancamento_id = p_lancamento
     and not exists (select 1 from public.baixas b where b.parcela_id = p.id);

  insert into public.parcelas (lancamento_id, numero, vencimento, valor)
  select p_lancamento,
         coalesce((select max(numero) from public.parcelas where lancamento_id = p_lancamento), 0)
           + row_number() over (order by (x ->> 'vencimento')::date, ord),
         (x ->> 'vencimento')::date,
         (x ->> 'valor')::numeric(14, 2)
    from jsonb_array_elements(p_parcelas) with ordinality as t (x, ord);

  -- renumera em ordem de vencimento
  with ordem as (
    select id, row_number() over (order by vencimento, numero) as n from public.parcelas where lancamento_id = p_lancamento
  )
  update public.parcelas p set numero = o.n + 100000 from ordem o where o.id = p.id;
  update public.parcelas set numero = numero - 100000 where lancamento_id = p_lancamento and numero > 100000;

  update public.lancamentos
     set valor_total = (select sum(valor) from public.parcelas where lancamento_id = p_lancamento)
   where id = p_lancamento;
end;
$$;

revoke execute on function public.gravar_parcelas(uuid, jsonb) from public, anon, authenticated;

create or replace function public.criar_lancamento(p_dados jsonb, p_parcelas jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.lancamentos;
  v_id uuid;
  v_soma numeric;
begin
  d := jsonb_populate_record(null::public.lancamentos, p_dados);
  perform public.exigir_financeiro_obra(d.obra_id);

  select sum((x ->> 'valor')::numeric(14, 2)) into v_soma from jsonb_array_elements(p_parcelas) x;
  if v_soma is distinct from d.valor_total then
    perform public.erro(format('A soma das parcelas (R$ %s) é diferente do valor total (R$ %s).',
      public.formatar_reais(coalesce(v_soma, 0)),
      public.formatar_reais(coalesce(d.valor_total, 0))));
  end if;

  perform public.ligar_via_rpc();
  insert into public.lancamentos (tipo, descricao, categoria_id, obra_id, etapa_id, natureza, pessoa_id,
                                  documento_numero, data_competencia, valor_total, observacao)
  values (d.tipo, d.descricao, d.categoria_id, d.obra_id, d.etapa_id, d.natureza, d.pessoa_id,
          nullif(trim(d.documento_numero), ''), d.data_competencia, d.valor_total, d.observacao)
  returning id into v_id;
  perform public.gravar_parcelas(v_id, p_parcelas);
  perform public.desligar_via_rpc();
  return v_id;
end;
$$;

-- Substitui as parcelas sem pagamento; o valor total passa a ser a soma de todas
create or replace function public.atualizar_parcelas(p_lancamento uuid, p_parcelas jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
begin
  select * into l from public.lancamentos where id = p_lancamento for update;
  if l is null or not public.pode_ler_lancamento(p_lancamento) then
    perform public.erro('Lançamento não encontrado.');
  end if;
  perform public.exigir_financeiro_obra(l.obra_id);
  if l.cancelado then
    perform public.erro('Lançamento cancelado não pode ser alterado.');
  end if;
  perform public.ligar_via_rpc();
  perform public.gravar_parcelas(p_lancamento, p_parcelas);
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.cancelar_lancamento(p_lancamento uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  l record;
begin
  select * into l from public.lancamentos where id = p_lancamento for update;
  if l is null or not public.pode_ler_lancamento(p_lancamento) then
    perform public.erro('Lançamento não encontrado.');
  end if;
  perform public.exigir_financeiro_obra(l.obra_id);
  if l.cancelado then
    perform public.erro('Este lançamento já está cancelado.');
  end if;
  -- R-FIN-04
  if exists (select 1 from public.baixas b join public.parcelas p on p.id = b.parcela_id
              where p.lancamento_id = p_lancamento and not b.estornada) then
    perform public.erro('Este lançamento tem pagamentos registrados. Estorne os pagamentos antes de cancelar.');
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    perform public.erro('Informe o motivo do cancelamento.');
  end if;
  perform public.ligar_via_rpc();
  update public.lancamentos set cancelado = true, motivo_cancelamento = trim(p_motivo) where id = p_lancamento;
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.estornar_baixa(p_baixa uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  b record;
begin
  select bx.*, l.obra_id into b
    from public.baixas bx
    join public.parcelas p on p.id = bx.parcela_id
    join public.lancamentos l on l.id = p.lancamento_id
   where bx.id = p_baixa for update of bx;
  if b is null then
    perform public.erro('Pagamento não encontrado.');
  end if;
  perform public.exigir_financeiro_obra(b.obra_id);
  if b.estornada then
    perform public.erro('Este pagamento já foi estornado.');
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    perform public.erro('Informe o motivo do estorno.');
  end if;
  perform public.ligar_via_rpc();
  update public.baixas set estornada = true, motivo_estorno = trim(p_motivo) where id = p_baixa;
  perform public.desligar_via_rpc();
end;
$$;

-- -----------------------------------------------------------------------------
-- Atualizado_em e auditoria
-- -----------------------------------------------------------------------------

create trigger lancamentos_atualizado_em before update on public.lancamentos for each row execute function public.tocar_atualizado_em();
create trigger parcelas_atualizado_em before update on public.parcelas for each row execute function public.tocar_atualizado_em();
create trigger baixas_atualizado_em before update on public.baixas for each row execute function public.tocar_atualizado_em();

create trigger auditar_lancamentos after insert or update or delete on public.lancamentos for each row execute function public.auditar();
create trigger auditar_parcelas after insert or update or delete on public.parcelas
  for each row execute function public.auditar('select obra_id from public.lancamentos where id = ($1->>''lancamento_id'')::uuid');
create trigger auditar_baixas after insert or update or delete on public.baixas
  for each row execute function public.auditar(
    'select l.obra_id from public.parcelas p join public.lancamentos l on l.id = p.lancamento_id where p.id = ($1->>''parcela_id'')::uuid');

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.lancamentos enable row level security;
alter table public.parcelas enable row level security;
alter table public.baixas enable row level security;

create policy "leem lancamentos" on public.lancamentos for select to authenticated
  using (public.pode_ler_financeiro_obra(obra_id));
create policy "financeiro edita lancamentos" on public.lancamentos for update to authenticated
  using (public.pode_editar_financeiro_obra(obra_id))
  with check (public.pode_editar_financeiro_obra(obra_id));

create policy "leem parcelas" on public.parcelas for select to authenticated
  using (public.pode_ler_lancamento(lancamento_id));

create policy "leem baixas" on public.baixas for select to authenticated
  using (exists (select 1 from public.parcelas p where p.id = parcela_id and public.pode_ler_lancamento(p.lancamento_id)));
create policy "financeiro registra baixas" on public.baixas for insert to authenticated
  with check (public.tem_papel('admin', 'financeiro')
              and exists (select 1 from public.parcelas p where p.id = parcela_id and public.pode_ler_lancamento(p.lancamento_id)));
create policy "financeiro edita observacao da baixa" on public.baixas for update to authenticated
  using (public.tem_papel('admin', 'financeiro')
         and exists (select 1 from public.parcelas p where p.id = parcela_id and public.pode_ler_lancamento(p.lancamento_id)))
  with check (public.tem_papel('admin', 'financeiro'));

-- Auditoria: financeiro vê o histórico dos registros financeiros
create policy "financeiro le auditoria financeira" on public.auditoria for select to authenticated
  using (public.tem_papel('financeiro')
         and tabela in ('lancamentos', 'parcelas', 'baixas')
         and (obra_id is null or public.acessa_obra(obra_id)));
