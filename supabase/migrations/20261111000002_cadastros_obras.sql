-- =============================================================================
-- 0002 · Cadastros de apoio, obras e membros
-- Referências: docs/03-modelo-dados.md §2 e §3, R-OBR-*, R-CAD-*
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pessoas (clientes, fornecedores, prestadores)
-- -----------------------------------------------------------------------------

create table public.pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  tipo_pessoa text not null check (tipo_pessoa in ('fisica', 'juridica')),
  documento text check (documento ~ '^([0-9]{11}|[0-9]{14})$'),
  eh_cliente boolean not null default false,
  eh_fornecedor boolean not null default false,
  eh_prestador boolean not null default false,
  email text,
  telefone text,
  endereco text,
  observacao text,
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint pessoas_algum_tipo check (eh_cliente or eh_fornecedor or eh_prestador),
  constraint pessoas_documento_tipo check (
    documento is null
    or (tipo_pessoa = 'fisica' and length(documento) = 11)
    or (tipo_pessoa = 'juridica' and length(documento) = 14)
  )
);

create unique index pessoas_documento_unico on public.pessoas (documento) where documento is not null;
create index pessoas_nome_idx on public.pessoas (lower(nome));

-- Nome básico para quem não lê a tabela (perfil campo). Sem security_invoker de propósito.
create view public.v_pessoas_basico as
  select id, nome, ativo from public.pessoas where public.papel_atual() is not null;

-- -----------------------------------------------------------------------------
-- Profissionais, materiais, equipamentos, categorias financeiras
-- -----------------------------------------------------------------------------

create table public.profissionais (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  funcao text not null check (length(trim(funcao)) > 0),
  vinculo text not null check (vinculo in ('proprio', 'terceirizado')),
  empresa_id uuid references public.pessoas (id),
  telefone text,
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint profissionais_empresa check (vinculo = 'proprio' or empresa_id is not null)
);
create index profissionais_empresa_idx on public.profissionais (empresa_id);

create table public.materiais (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (length(trim(descricao)) > 0),
  unidade text not null check (length(trim(unidade)) > 0),
  custo_unitario numeric(14, 2) check (custo_unitario >= 0),
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index materiais_unico on public.materiais (lower(descricao), unidade);

create table public.equipamentos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (length(trim(descricao)) > 0),
  propriedade text not null check (propriedade in ('proprio', 'alugado')),
  identificacao text,
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table public.categorias_financeiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) > 0),
  tipo text not null check (tipo in ('despesa', 'receita')),
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create unique index categorias_financeiras_unico on public.categorias_financeiras (lower(nome), tipo);

insert into public.categorias_financeiras (nome, tipo) values
  ('Materiais', 'despesa'),
  ('Mão de obra', 'despesa'),
  ('Equipamentos', 'despesa'),
  ('Serviços de terceiros', 'despesa'),
  ('Impostos e taxas', 'despesa'),
  ('Administrativo', 'despesa'),
  ('Outros', 'despesa'),
  ('Medição de contrato', 'receita'),
  ('Adiantamento do cliente', 'receita'),
  ('Outros', 'receita');

-- -----------------------------------------------------------------------------
-- Obras
-- -----------------------------------------------------------------------------

create table public.obras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null check (length(trim(nome)) > 0),
  cliente_id uuid references public.pessoas (id),
  endereco text,
  cidade text,
  uf text check (uf ~ '^[A-Z]{2}$'),
  responsavel_id uuid not null references public.perfis (id),
  data_inicio_prevista date,
  data_fim_prevista date,
  data_inicio_real date,
  data_fim_real date,
  situacao text not null default 'planejamento'
    check (situacao in ('planejamento', 'em_andamento', 'paralisada', 'concluida', 'cancelada')),
  descricao text,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint obras_datas_previstas check (data_fim_prevista is null or data_inicio_prevista is null or data_fim_prevista >= data_inicio_prevista),
  constraint obras_datas_reais check (data_fim_real is null or data_inicio_real is null or data_fim_real >= data_inicio_real)
);

create index obras_cliente_idx on public.obras (cliente_id);
create index obras_responsavel_idx on public.obras (responsavel_id);
create index obras_situacao_idx on public.obras (situacao);

create table public.obra_membros (
  obra_id uuid not null references public.obras (id) on delete cascade,
  perfil_id uuid not null references public.perfis (id),
  criado_em timestamptz not null default now(),
  primary key (obra_id, perfil_id)
);
create index obra_membros_perfil_idx on public.obra_membros (perfil_id);

-- Funções de acesso -----------------------------------------------------------

create or replace function public.acessa_obra(p_obra uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.eh_admin()
      or (public.papel_atual() is not null and exists (
            select 1 from public.obra_membros m
            where m.obra_id = p_obra and m.perfil_id = auth.uid()))
$$;

-- R-OBR-03
create or replace function public.obra_editavel(p_obra uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.eh_admin()
      or public.sessao_interna()
      or exists (select 1 from public.obras o
                 where o.id = p_obra and o.situacao not in ('concluida', 'cancelada'))
$$;

create or replace function public.exigir_obra_editavel(p_obra uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_obra is not null and not public.obra_editavel(p_obra) then
    perform public.erro('Esta obra está concluída ou cancelada e não pode ser alterada.');
  end if;
end;
$$;

-- Triggers de obras -----------------------------------------------------------

create or replace function public.obras_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ano text := to_char(public.hoje(), 'YYYY');
  v_seq int;
begin
  if tg_op = 'INSERT' and coalesce(trim(new.codigo), '') = '' then
    perform pg_advisory_xact_lock(hashtext('obras_codigo_' || v_ano));
    select coalesce(max(substring(codigo from '^OB-' || v_ano || '-([0-9]+)$')::int), 0) + 1
      into v_seq
      from public.obras
     where codigo like 'OB-' || v_ano || '-%';
    new.codigo := 'OB-' || v_ano || '-' || lpad(v_seq::text, 3, '0');
  end if;
  new.codigo := upper(trim(new.codigo));

  -- R-OBR-02
  if not exists (select 1 from public.perfis p
                 where p.id = new.responsavel_id and p.papel in ('gestor', 'admin') and p.ativo) then
    perform public.erro('O responsável pela obra precisa ser um gestor ou administrador ativo.');
  end if;

  if new.cliente_id is not null and (tg_op = 'INSERT' or new.cliente_id is distinct from old.cliente_id) then
    if not exists (select 1 from public.pessoas p where p.id = new.cliente_id and p.eh_cliente) then
      perform public.erro('A pessoa selecionada não está cadastrada como cliente.');
    end if;
  end if;

  -- R-OBR-03: obra fechada só muda pelo admin
  if tg_op = 'UPDATE' and old.situacao in ('concluida', 'cancelada')
     and not public.sessao_interna() and not public.eh_admin() then
    perform public.erro('Esta obra está concluída ou cancelada e não pode ser alterada.');
  end if;

  -- R-OBR-04
  if new.situacao = 'em_andamento' and new.data_inicio_real is null then
    new.data_inicio_real := public.hoje();
  end if;
  if new.situacao = 'concluida' and new.data_fim_real is null then
    new.data_fim_real := public.hoje();
    if new.data_inicio_real is null then
      new.data_inicio_real := new.data_fim_real;
    end if;
  end if;

  return new;
end;
$$;

create trigger obras_antes_gravar before insert or update on public.obras
  for each row execute function public.obras_antes_gravar();
create trigger obras_atualizado_em before update on public.obras
  for each row execute function public.tocar_atualizado_em();

-- R-OBR-01
create or replace function public.obras_adicionar_membros()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.obra_membros (obra_id, perfil_id)
  select new.id, x.perfil
    from (values (new.criado_por), (new.responsavel_id)) as x (perfil)
   where x.perfil is not null
  on conflict do nothing;
  return null;
end;
$$;

create trigger obras_adicionar_membros after insert or update of responsavel_id on public.obras
  for each row execute function public.obras_adicionar_membros();

-- Membros: gestor não remove a si mesmo nem o responsável
create or replace function public.obra_membros_antes_remover()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.sessao_interna() then
    return old;
  end if;
  if exists (select 1 from public.obras o where o.id = old.obra_id and o.responsavel_id = old.perfil_id) then
    perform public.erro('O responsável pela obra não pode ser removido dos membros. Troque o responsável antes.');
  end if;
  if old.perfil_id = auth.uid() and not public.eh_admin() then
    perform public.erro('Você não pode remover a si mesmo da obra.');
  end if;
  return old;
end;
$$;

create trigger obra_membros_antes_remover before delete on public.obra_membros
  for each row execute function public.obra_membros_antes_remover();

-- -----------------------------------------------------------------------------
-- Atualizado_em e auditoria
-- -----------------------------------------------------------------------------

create trigger pessoas_atualizado_em before update on public.pessoas for each row execute function public.tocar_atualizado_em();
create trigger profissionais_atualizado_em before update on public.profissionais for each row execute function public.tocar_atualizado_em();
create trigger materiais_atualizado_em before update on public.materiais for each row execute function public.tocar_atualizado_em();
create trigger equipamentos_atualizado_em before update on public.equipamentos for each row execute function public.tocar_atualizado_em();
create trigger categorias_financeiras_atualizado_em before update on public.categorias_financeiras for each row execute function public.tocar_atualizado_em();

create trigger auditar_pessoas after insert or update or delete on public.pessoas for each row execute function public.auditar();
create trigger auditar_profissionais after insert or update or delete on public.profissionais for each row execute function public.auditar();
create trigger auditar_materiais after insert or update or delete on public.materiais for each row execute function public.auditar();
create trigger auditar_equipamentos after insert or update or delete on public.equipamentos for each row execute function public.auditar();
create trigger auditar_obras after insert or update or delete on public.obras
  for each row execute function public.auditar('select ($1->>''id'')::uuid');
create trigger auditar_obra_membros after insert or update or delete on public.obra_membros
  for each row execute function public.auditar('', 'obra_id,perfil_id');

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.pessoas enable row level security;
alter table public.profissionais enable row level security;
alter table public.materiais enable row level security;
alter table public.equipamentos enable row level security;
alter table public.categorias_financeiras enable row level security;
alter table public.obras enable row level security;
alter table public.obra_membros enable row level security;

-- Pessoas: admin, gestor, financeiro
create policy "leem pessoas" on public.pessoas for select to authenticated
  using (public.tem_papel('admin', 'gestor', 'financeiro'));
create policy "criam pessoas" on public.pessoas for insert to authenticated
  with check (public.tem_papel('admin', 'gestor', 'financeiro'));
create policy "editam pessoas" on public.pessoas for update to authenticated
  using (public.tem_papel('admin', 'gestor', 'financeiro'))
  with check (public.tem_papel('admin', 'gestor', 'financeiro'));

-- Profissionais, materiais, equipamentos: todos leem; admin e gestor editam
create policy "leem profissionais" on public.profissionais for select to authenticated
  using (public.papel_atual() is not null);
create policy "criam profissionais" on public.profissionais for insert to authenticated
  with check (public.tem_papel('admin', 'gestor'));
create policy "editam profissionais" on public.profissionais for update to authenticated
  using (public.tem_papel('admin', 'gestor')) with check (public.tem_papel('admin', 'gestor'));

create policy "leem materiais" on public.materiais for select to authenticated
  using (public.papel_atual() is not null);
create policy "criam materiais" on public.materiais for insert to authenticated
  with check (public.tem_papel('admin', 'gestor'));
create policy "editam materiais" on public.materiais for update to authenticated
  using (public.tem_papel('admin', 'gestor')) with check (public.tem_papel('admin', 'gestor'));

create policy "leem equipamentos" on public.equipamentos for select to authenticated
  using (public.papel_atual() is not null);
create policy "criam equipamentos" on public.equipamentos for insert to authenticated
  with check (public.tem_papel('admin', 'gestor'));
create policy "editam equipamentos" on public.equipamentos for update to authenticated
  using (public.tem_papel('admin', 'gestor')) with check (public.tem_papel('admin', 'gestor'));

-- Categorias: admin, gestor, financeiro leem; admin e financeiro editam
create policy "leem categorias" on public.categorias_financeiras for select to authenticated
  using (public.tem_papel('admin', 'gestor', 'financeiro'));
create policy "criam categorias" on public.categorias_financeiras for insert to authenticated
  with check (public.tem_papel('admin', 'financeiro'));
create policy "editam categorias" on public.categorias_financeiras for update to authenticated
  using (public.tem_papel('admin', 'financeiro')) with check (public.tem_papel('admin', 'financeiro'));

-- Obras
create policy "membros leem obras" on public.obras for select to authenticated
  using (public.acessa_obra(id));
create policy "gestores criam obras" on public.obras for insert to authenticated
  with check (public.tem_papel('admin', 'gestor') and criado_por = auth.uid());
create policy "gestores editam obras" on public.obras for update to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(id))
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(id));

-- Membros
create policy "membros leem membros" on public.obra_membros for select to authenticated
  using (public.acessa_obra(obra_id));
create policy "gestores adicionam membros" on public.obra_membros for insert to authenticated
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id) and public.obra_editavel(obra_id));
create policy "gestores removem membros" on public.obra_membros for delete to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id) and public.obra_editavel(obra_id));

-- Perfis: também visíveis para quem compartilha uma obra
create policy "membros veem colegas de obra" on public.perfis for select to authenticated
  using (
    public.papel_atual() is not null
    and exists (
      select 1 from public.obra_membros eu
      join public.obra_membros outro on outro.obra_id = eu.obra_id
      where eu.perfil_id = auth.uid() and outro.perfil_id = perfis.id
    )
  );

-- Gestores precisam escolher responsáveis/membros ao montar uma obra
create policy "gestores veem usuarios ativos" on public.perfis for select to authenticated
  using (public.tem_papel('gestor') and ativo);

-- Auditoria: gestor vê o histórico das suas obras
create policy "gestor le auditoria da obra" on public.auditoria for select to authenticated
  using (public.tem_papel('gestor') and obra_id is not null and public.acessa_obra(obra_id));
