-- =============================================================================
-- 0003 · Planejamento: etapas, serviços, documentos, orçamento e cronograma
-- Referências: docs/03-modelo-dados.md §3 e §4, R-VER-*, R-ORC-01, R-PRZ-03, R-DOC-*
-- =============================================================================

-- Permissão padrão de gestão de uma obra
create or replace function public.exigir_gestor_obra(p_obra uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_obra is null or not (public.tem_papel('admin', 'gestor') and public.acessa_obra(p_obra)) then
    perform public.erro('Você não tem permissão para esta ação nesta obra.');
  end if;
  perform public.exigir_obra_editavel(p_obra);
end;
$$;

-- -----------------------------------------------------------------------------
-- Etapas e serviços
-- -----------------------------------------------------------------------------

create table public.etapas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  codigo text not null check (length(trim(codigo)) > 0),
  nome text not null check (length(trim(nome)) > 0),
  ordem int not null default 0,
  responsavel_id uuid references public.perfis (id),
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (obra_id, codigo)
);
create index etapas_obra_idx on public.etapas (obra_id, ordem);

create table public.servicos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  etapa_id uuid not null references public.etapas (id),
  codigo text not null check (length(trim(codigo)) > 0),
  descricao text not null check (length(trim(descricao)) > 0),
  unidade text not null check (length(trim(unidade)) > 0),
  quantidade_prevista numeric(14, 4) not null check (quantidade_prevista > 0),
  responsavel_id uuid references public.perfis (id),
  ordem int not null default 0,
  data_inicio_real date,
  data_fim_real date,
  data_fim_real_automatica boolean not null default false,
  ativo boolean not null default true,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (obra_id, codigo),
  constraint servicos_datas_reais check (data_fim_real is null or data_inicio_real is null or data_fim_real >= data_inicio_real)
);
create index servicos_obra_idx on public.servicos (obra_id, ordem);
create index servicos_etapa_idx on public.servicos (etapa_id);

create or replace function public.etapas_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_obra_editavel(coalesce(new.obra_id, old.obra_id));
  if tg_op = 'UPDATE' and new.obra_id <> old.obra_id then
    perform public.erro('Não é possível mover uma etapa para outra obra.');
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  new.codigo := trim(new.codigo);
  return new;
end;
$$;

create trigger etapas_antes_gravar before insert or update or delete on public.etapas
  for each row execute function public.etapas_antes_gravar();

-- Desativação com medição aprovada é verificada em 0004 (servicos_pode_desativar)
create or replace function public.servicos_pode_desativar(p_servico uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select true
$$;

create or replace function public.servicos_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_obra_etapa uuid;
begin
  if tg_op = 'DELETE' then
    perform public.exigir_obra_editavel(old.obra_id);
    return old;
  end if;

  select e.obra_id into v_obra_etapa from public.etapas e where e.id = new.etapa_id;
  if new.obra_id is null then
    new.obra_id := v_obra_etapa;
  elsif new.obra_id <> v_obra_etapa then
    perform public.erro('A etapa escolhida pertence a outra obra.');
  end if;
  perform public.exigir_obra_editavel(new.obra_id);
  new.codigo := trim(new.codigo);

  if tg_op = 'UPDATE' then
    if new.obra_id <> old.obra_id then
      perform public.erro('Não é possível mover um serviço para outra obra.');
    end if;
    if old.ativo and not new.ativo and not public.servicos_pode_desativar(new.id) then
      perform public.erro('Este serviço já tem medição aprovada e não pode ser desativado.');
    end if;
    -- R-MED-09: edição manual da data de término zera a marca de preenchimento automático
    if new.data_fim_real is distinct from old.data_fim_real
       and new.data_fim_real_automatica = old.data_fim_real_automatica then
      new.data_fim_real_automatica := false;
    end if;
  end if;
  return new;
end;
$$;

create trigger servicos_antes_gravar before insert or update or delete on public.servicos
  for each row execute function public.servicos_antes_gravar();

-- -----------------------------------------------------------------------------
-- Documentos (cada linha é uma versão)
-- -----------------------------------------------------------------------------

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  etapa_id uuid references public.etapas (id),
  grupo_id uuid not null default gen_random_uuid(),
  versao int not null default 1,
  titulo text not null check (length(trim(titulo)) > 0),
  categoria text not null check (categoria in ('projeto', 'planta', 'memorial', 'contrato', 'licenca', 'outro')),
  caminho_arquivo text not null,
  nome_arquivo text not null,
  tipo_mime text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  observacao text,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (grupo_id, versao)
);
create index documentos_obra_idx on public.documentos (obra_id);
create index documentos_etapa_idx on public.documentos (etapa_id);

-- R-DOC-01
create or replace function public.documentos_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_anterior record;
begin
  perform public.exigir_obra_editavel(new.obra_id);
  if new.etapa_id is not null and not exists (
       select 1 from public.etapas e where e.id = new.etapa_id and e.obra_id = new.obra_id) then
    perform public.erro('A etapa escolhida pertence a outra obra.');
  end if;

  perform pg_advisory_xact_lock(hashtext('documentos_' || new.grupo_id::text));
  select d.obra_id, max(d.versao) as versao into v_anterior
    from public.documentos d where d.grupo_id = new.grupo_id group by d.obra_id;
  if found then
    if v_anterior.obra_id <> new.obra_id then
      perform public.erro('Nova versão precisa ser da mesma obra do documento original.');
    end if;
    new.versao := v_anterior.versao + 1;
  else
    new.versao := 1;
  end if;
  return new;
end;
$$;

create trigger documentos_antes_inserir before insert on public.documentos
  for each row execute function public.documentos_antes_inserir();

create view public.v_documentos_atuais with (security_invoker = true) as
  select distinct on (d.grupo_id)
         d.*,
         count(*) over (partition by d.grupo_id) as total_versoes,
         first_value(d.criado_em) over (partition by d.grupo_id order by d.versao) as primeira_versao_em
    from public.documentos d
   order by d.grupo_id, d.versao desc;

-- -----------------------------------------------------------------------------
-- Versões (orçamento e cronograma)
-- -----------------------------------------------------------------------------

create table public.orcamento_versoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  numero int not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovada', 'substituida')),
  descricao text,
  aprovada_por uuid references public.perfis (id),
  aprovada_em timestamptz,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (obra_id, numero)
);
create unique index orcamento_versoes_uma_aprovada on public.orcamento_versoes (obra_id) where status = 'aprovada';
create unique index orcamento_versoes_um_rascunho on public.orcamento_versoes (obra_id) where status = 'rascunho';

create table public.orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  versao_id uuid not null references public.orcamento_versoes (id) on delete cascade,
  servico_id uuid not null references public.servicos (id),
  natureza text not null check (natureza in ('material', 'mao_de_obra', 'equipamento', 'outro')),
  descricao text not null check (length(trim(descricao)) > 0),
  material_id uuid references public.materiais (id),
  unidade text not null check (length(trim(unidade)) > 0),
  quantidade numeric(14, 4) not null check (quantidade >= 0),
  valor_unitario numeric(14, 2) not null check (valor_unitario >= 0),
  valor_total numeric(16, 2) generated always as (round(quantidade * valor_unitario, 2)) stored,
  ordem int not null default 0,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index orcamento_itens_versao_idx on public.orcamento_itens (versao_id);
create index orcamento_itens_servico_idx on public.orcamento_itens (servico_id);

create table public.cronograma_versoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  numero int not null,
  status text not null default 'rascunho' check (status in ('rascunho', 'aprovada', 'substituida')),
  descricao text,
  aprovada_por uuid references public.perfis (id),
  aprovada_em timestamptz,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (obra_id, numero)
);
create unique index cronograma_versoes_uma_aprovada on public.cronograma_versoes (obra_id) where status = 'aprovada';
create unique index cronograma_versoes_um_rascunho on public.cronograma_versoes (obra_id) where status = 'rascunho';

create table public.cronograma_atividades (
  id uuid primary key default gen_random_uuid(),
  versao_id uuid not null references public.cronograma_versoes (id) on delete cascade,
  servico_id uuid not null references public.servicos (id),
  inicio_previsto date not null,
  fim_previsto date not null,
  duracao_dias int generated always as (fim_previsto - inicio_previsto + 1) stored,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (versao_id, servico_id),
  constraint cronograma_atividades_datas check (fim_previsto >= inicio_previsto)
);
create index cronograma_atividades_servico_idx on public.cronograma_atividades (servico_id);

create table public.cronograma_dependencias (
  versao_id uuid not null references public.cronograma_versoes (id) on delete cascade,
  servico_id uuid not null references public.servicos (id),
  predecessor_id uuid not null references public.servicos (id),
  criado_em timestamptz not null default now(),
  primary key (versao_id, servico_id, predecessor_id),
  constraint cronograma_dependencias_distintos check (servico_id <> predecessor_id)
);
create index cronograma_dependencias_pred_idx on public.cronograma_dependencias (versao_id, predecessor_id);

-- Numeração e status das versões ----------------------------------------------

create or replace function public.versao_antes_inserir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtext(tg_table_name || new.obra_id::text));
  execute format('select coalesce(max(numero), 0) + 1 from public.%I where obra_id = $1', tg_table_name)
    into new.numero using new.obra_id;
  return new;
end;
$$;

create trigger orcamento_versoes_numero before insert on public.orcamento_versoes
  for each row execute function public.versao_antes_inserir();
create trigger cronograma_versoes_numero before insert on public.cronograma_versoes
  for each row execute function public.versao_antes_inserir();

create trigger orcamento_versoes_status before insert or update on public.orcamento_versoes
  for each row execute function public.bloquear_mudanca_status('rascunho');
create trigger cronograma_versoes_status before insert or update on public.cronograma_versoes
  for each row execute function public.bloquear_mudanca_status('rascunho');

-- R-VER-03: conteúdo só muda em rascunho -------------------------------------
-- TG_ARGV[0] = tabela de versões ('orcamento_versoes' | 'cronograma_versoes')
create or replace function public.bloquear_versao_fechada()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_versao uuid := case when tg_op = 'DELETE' then old.versao_id else new.versao_id end;
  v_status text;
  v_obra uuid;
begin
  execute format('select status, obra_id from public.%I where id = $1', tg_argv[0])
    into v_status, v_obra using v_versao;

  -- Versão sendo apagada em cascata (descartar rascunho) já não existe
  if v_status is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if v_status <> 'rascunho' then
    perform public.erro('Esta versão está aprovada e não pode ser alterada. Crie uma revisão.');
  end if;
  if tg_op = 'UPDATE' and new.versao_id <> old.versao_id then
    perform public.erro('Não é possível mover um item para outra versão.');
  end if;
  perform public.exigir_obra_editavel(v_obra);

  if tg_op <> 'DELETE' and not exists (
       select 1 from public.servicos s where s.id = new.servico_id and s.obra_id = v_obra) then
    perform public.erro('O serviço escolhido pertence a outra obra.');
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger orcamento_itens_versao_fechada before insert or update or delete on public.orcamento_itens
  for each row execute function public.bloquear_versao_fechada('orcamento_versoes');
create trigger cronograma_atividades_versao_fechada before insert or update or delete on public.cronograma_atividades
  for each row execute function public.bloquear_versao_fechada('cronograma_versoes');
create trigger cronograma_dependencias_versao_fechada before insert or update or delete on public.cronograma_dependencias
  for each row execute function public.bloquear_versao_fechada('cronograma_versoes');

-- R-PRZ-03: dependências término → início, sem ciclos --------------------------

create or replace function public.validar_dependencia(p_versao uuid, p_servico uuid, p_predecessor uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_suc record;
  v_pred record;
begin
  select a.inicio_previsto, s.codigo || ' ' || s.descricao as nome into v_suc
    from public.cronograma_atividades a join public.servicos s on s.id = a.servico_id
   where a.versao_id = p_versao and a.servico_id = p_servico;
  select a.fim_previsto, s.codigo || ' ' || s.descricao as nome into v_pred
    from public.cronograma_atividades a join public.servicos s on s.id = a.servico_id
   where a.versao_id = p_versao and a.servico_id = p_predecessor;

  if v_suc is null or v_pred is null then
    perform public.erro('Defina as datas dos dois serviços antes de criar a dependência.');
  end if;
  if v_suc.inicio_previsto <= v_pred.fim_previsto then
    perform public.erro(format('O serviço %s precisa começar depois do término de %s (%s).',
      v_suc.nome, v_pred.nome, to_char(v_pred.fim_previsto, 'DD/MM/YYYY')));
  end if;
end;
$$;

create or replace function public.cronograma_dependencias_validar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    with recursive cadeia (servico) as (
      select d.predecessor_id from public.cronograma_dependencias d
       where d.versao_id = new.versao_id and d.servico_id = new.predecessor_id
      union
      select d.predecessor_id from public.cronograma_dependencias d
        join cadeia c on d.servico_id = c.servico
       where d.versao_id = new.versao_id
    )
    select 1 from cadeia where servico = new.servico_id
  ) or new.predecessor_id = new.servico_id then
    perform public.erro('Esta dependência criaria um ciclo no cronograma.');
  end if;
  perform public.validar_dependencia(new.versao_id, new.servico_id, new.predecessor_id);
  return new;
end;
$$;

create trigger cronograma_dependencias_validar before insert or update on public.cronograma_dependencias
  for each row execute function public.cronograma_dependencias_validar();

-- Ao mudar datas de uma atividade, revalida dependências em que ela participa
create or replace function public.cronograma_atividades_revalidar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  for d in
    select * from public.cronograma_dependencias
     where versao_id = new.versao_id and (servico_id = new.servico_id or predecessor_id = new.servico_id)
  loop
    perform public.validar_dependencia(d.versao_id, d.servico_id, d.predecessor_id);
  end loop;
  return null;
end;
$$;

-- deferrable: permite "Empurrar sucessores" em lote na mesma transação
create constraint trigger cronograma_atividades_revalidar
  after update of inicio_previsto, fim_previsto on public.cronograma_atividades
  deferrable initially deferred
  for each row execute function public.cronograma_atividades_revalidar();

-- Ao remover uma atividade, remove as dependências dela
create or replace function public.cronograma_atividades_remover_dependencias()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.cronograma_dependencias
   where versao_id = old.versao_id and (servico_id = old.servico_id or predecessor_id = old.servico_id);
  return old;
end;
$$;

create trigger cronograma_atividades_remover_dependencias before delete on public.cronograma_atividades
  for each row execute function public.cronograma_atividades_remover_dependencias();

-- -----------------------------------------------------------------------------
-- RPCs de versão (R-VER-04..08)
-- -----------------------------------------------------------------------------

create or replace function public.criar_revisao_orcamento(p_obra uuid, p_descricao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nova uuid;
  v_aprovada uuid;
begin
  perform public.exigir_gestor_obra(p_obra);
  perform pg_advisory_xact_lock(hashtext('orcamento_versoes' || p_obra::text));
  if exists (select 1 from public.orcamento_versoes where obra_id = p_obra and status = 'rascunho') then
    perform public.erro('Já existe um rascunho de orçamento para esta obra.');
  end if;

  insert into public.orcamento_versoes (obra_id, descricao)
  values (p_obra, nullif(trim(p_descricao), ''))
  returning id into v_nova;

  select id into v_aprovada from public.orcamento_versoes where obra_id = p_obra and status = 'aprovada';
  if v_aprovada is not null then
    insert into public.orcamento_itens (versao_id, servico_id, natureza, descricao, material_id, unidade, quantidade, valor_unitario, ordem)
    select v_nova, i.servico_id, i.natureza, i.descricao, i.material_id, i.unidade, i.quantidade, i.valor_unitario, i.ordem
      from public.orcamento_itens i
      join public.servicos s on s.id = i.servico_id and s.ativo
     where i.versao_id = v_aprovada;
  end if;
  return v_nova;
end;
$$;

create or replace function public.aprovar_orcamento(p_versao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from public.orcamento_versoes where id = p_versao for update;
  if v is null then
    perform public.erro('Versão de orçamento não encontrada.');
  end if;
  perform public.exigir_gestor_obra(v.obra_id);
  if v.status <> 'rascunho' then
    perform public.erro('Somente um rascunho pode ser aprovado.');
  end if;
  if not exists (select 1 from public.orcamento_itens where versao_id = p_versao) then
    perform public.erro('O orçamento precisa ter pelo menos um item para ser aprovado.');
  end if;

  perform public.ligar_via_rpc();
  update public.orcamento_versoes set status = 'substituida'
   where obra_id = v.obra_id and status = 'aprovada';
  update public.orcamento_versoes
     set status = 'aprovada', aprovada_por = auth.uid(), aprovada_em = now()
   where id = p_versao;
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.descartar_rascunho_orcamento(p_versao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from public.orcamento_versoes where id = p_versao for update;
  if v is null then
    perform public.erro('Versão de orçamento não encontrada.');
  end if;
  perform public.exigir_gestor_obra(v.obra_id);
  if v.status <> 'rascunho' then
    perform public.erro('Somente rascunhos podem ser descartados.');
  end if;
  delete from public.orcamento_versoes where id = p_versao;
end;
$$;

create or replace function public.criar_revisao_cronograma(p_obra uuid, p_descricao text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nova uuid;
  v_aprovada uuid;
begin
  perform public.exigir_gestor_obra(p_obra);
  perform pg_advisory_xact_lock(hashtext('cronograma_versoes' || p_obra::text));
  if exists (select 1 from public.cronograma_versoes where obra_id = p_obra and status = 'rascunho') then
    perform public.erro('Já existe um rascunho de cronograma para esta obra.');
  end if;

  insert into public.cronograma_versoes (obra_id, descricao)
  values (p_obra, nullif(trim(p_descricao), ''))
  returning id into v_nova;

  select id into v_aprovada from public.cronograma_versoes where obra_id = p_obra and status = 'aprovada';
  if v_aprovada is not null then
    insert into public.cronograma_atividades (versao_id, servico_id, inicio_previsto, fim_previsto)
    select v_nova, a.servico_id, a.inicio_previsto, a.fim_previsto
      from public.cronograma_atividades a
      join public.servicos s on s.id = a.servico_id and s.ativo
     where a.versao_id = v_aprovada;
    insert into public.cronograma_dependencias (versao_id, servico_id, predecessor_id)
    select v_nova, d.servico_id, d.predecessor_id
      from public.cronograma_dependencias d
     where d.versao_id = v_aprovada
       and exists (select 1 from public.cronograma_atividades a where a.versao_id = v_nova and a.servico_id = d.servico_id)
       and exists (select 1 from public.cronograma_atividades a where a.versao_id = v_nova and a.servico_id = d.predecessor_id);
  end if;
  return v_nova;
end;
$$;

create or replace function public.aprovar_cronograma(p_versao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
  v_faltando text;
begin
  select * into v from public.cronograma_versoes where id = p_versao for update;
  if v is null then
    perform public.erro('Versão de cronograma não encontrada.');
  end if;
  perform public.exigir_gestor_obra(v.obra_id);
  if v.status <> 'rascunho' then
    perform public.erro('Somente um rascunho pode ser aprovado.');
  end if;

  -- R-VER-07
  select string_agg(s.codigo, ', ' order by s.ordem, s.codigo) into v_faltando
    from public.servicos s
   where s.obra_id = v.obra_id and s.ativo
     and not exists (select 1 from public.cronograma_atividades a where a.versao_id = p_versao and a.servico_id = s.id);
  if v_faltando is not null then
    perform public.erro('Defina datas para todos os serviços antes de aprovar. Faltam: ' || v_faltando || '.');
  end if;
  if not exists (select 1 from public.cronograma_atividades where versao_id = p_versao) then
    perform public.erro('O cronograma precisa ter pelo menos uma atividade para ser aprovado.');
  end if;

  perform public.ligar_via_rpc();
  update public.cronograma_versoes set status = 'substituida'
   where obra_id = v.obra_id and status = 'aprovada';
  update public.cronograma_versoes
     set status = 'aprovada', aprovada_por = auth.uid(), aprovada_em = now()
   where id = p_versao;
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.descartar_rascunho_cronograma(p_versao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v record;
begin
  select * into v from public.cronograma_versoes where id = p_versao for update;
  if v is null then
    perform public.erro('Versão de cronograma não encontrada.');
  end if;
  perform public.exigir_gestor_obra(v.obra_id);
  if v.status <> 'rascunho' then
    perform public.erro('Somente rascunhos podem ser descartados.');
  end if;
  delete from public.cronograma_versoes where id = p_versao;
end;
$$;

-- -----------------------------------------------------------------------------
-- Atualizado_em e auditoria
-- -----------------------------------------------------------------------------

create trigger etapas_atualizado_em before update on public.etapas for each row execute function public.tocar_atualizado_em();
create trigger servicos_atualizado_em before update on public.servicos for each row execute function public.tocar_atualizado_em();
create trigger documentos_atualizado_em before update on public.documentos for each row execute function public.tocar_atualizado_em();
create trigger orcamento_versoes_atualizado_em before update on public.orcamento_versoes for each row execute function public.tocar_atualizado_em();
create trigger orcamento_itens_atualizado_em before update on public.orcamento_itens for each row execute function public.tocar_atualizado_em();
create trigger cronograma_versoes_atualizado_em before update on public.cronograma_versoes for each row execute function public.tocar_atualizado_em();
create trigger cronograma_atividades_atualizado_em before update on public.cronograma_atividades for each row execute function public.tocar_atualizado_em();

create trigger auditar_etapas after insert or update or delete on public.etapas for each row execute function public.auditar();
create trigger auditar_servicos after insert or update or delete on public.servicos for each row execute function public.auditar();
create trigger auditar_documentos after insert or update or delete on public.documentos for each row execute function public.auditar();
create trigger auditar_orcamento_versoes after insert or update or delete on public.orcamento_versoes for each row execute function public.auditar();
create trigger auditar_orcamento_itens after insert or update or delete on public.orcamento_itens
  for each row execute function public.auditar('select obra_id from public.orcamento_versoes where id = ($1->>''versao_id'')::uuid');
create trigger auditar_cronograma_versoes after insert or update or delete on public.cronograma_versoes for each row execute function public.auditar();
create trigger auditar_cronograma_atividades after insert or update or delete on public.cronograma_atividades
  for each row execute function public.auditar('select obra_id from public.cronograma_versoes where id = ($1->>''versao_id'')::uuid');
create trigger auditar_cronograma_dependencias after insert or update or delete on public.cronograma_dependencias
  for each row execute function public.auditar('select obra_id from public.cronograma_versoes where id = ($1->>''versao_id'')::uuid',
                                               'versao_id,servico_id,predecessor_id');

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------

alter table public.etapas enable row level security;
alter table public.servicos enable row level security;
alter table public.documentos enable row level security;
alter table public.orcamento_versoes enable row level security;
alter table public.orcamento_itens enable row level security;
alter table public.cronograma_versoes enable row level security;
alter table public.cronograma_atividades enable row level security;
alter table public.cronograma_dependencias enable row level security;

-- Etapas e serviços
create policy "membros leem etapas" on public.etapas for select to authenticated
  using (public.acessa_obra(obra_id));
create policy "gestores criam etapas" on public.etapas for insert to authenticated
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));
create policy "gestores editam etapas" on public.etapas for update to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id))
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));
create policy "gestores apagam etapas" on public.etapas for delete to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));

create policy "membros leem servicos" on public.servicos for select to authenticated
  using (public.acessa_obra(obra_id));
create policy "gestores criam servicos" on public.servicos for insert to authenticated
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));
create policy "gestores editam servicos" on public.servicos for update to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id))
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));
create policy "gestores apagam servicos" on public.servicos for delete to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));

-- Documentos: sem update/delete (R-DOC-02)
create policy "membros leem documentos" on public.documentos for select to authenticated
  using (public.acessa_obra(obra_id));
create policy "membros enviam documentos" on public.documentos for insert to authenticated
  with check (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));

-- Orçamento: campo não tem acesso. Versões só mudam por RPC.
create policy "leem versoes de orcamento" on public.orcamento_versoes for select to authenticated
  using (public.tem_papel('admin', 'gestor', 'financeiro') and public.acessa_obra(obra_id));
create policy "gestores editam descricao do orcamento" on public.orcamento_versoes for update to authenticated
  using (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id))
  with check (public.tem_papel('admin', 'gestor') and public.acessa_obra(obra_id));

create policy "leem itens de orcamento" on public.orcamento_itens for select to authenticated
  using (exists (select 1 from public.orcamento_versoes v
                  where v.id = versao_id and public.acessa_obra(v.obra_id)
                    and public.tem_papel('admin', 'gestor', 'financeiro')));
create policy "gestores criam itens de orcamento" on public.orcamento_itens for insert to authenticated
  with check (exists (select 1 from public.orcamento_versoes v
                       where v.id = versao_id and public.acessa_obra(v.obra_id) and public.tem_papel('admin', 'gestor')));
create policy "gestores editam itens de orcamento" on public.orcamento_itens for update to authenticated
  using (exists (select 1 from public.orcamento_versoes v
                  where v.id = versao_id and public.acessa_obra(v.obra_id) and public.tem_papel('admin', 'gestor')))
  with check (exists (select 1 from public.orcamento_versoes v
                       where v.id = versao_id and public.acessa_obra(v.obra_id) and public.tem_papel('admin', 'gestor')));
create policy "gestores apagam itens de orcamento" on public.orcamento_itens for delete to authenticated
  using (exists (select 1 from public.orcamento_versoes v
                  where v.id = versao_id and public.acessa_obra(v.obra_id) and public.tem_papel('admin', 'gestor')));

-- Cronograma: campo vê só a versão aprovada
create or replace function public.le_versao_cronograma(p_versao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cronograma_versoes v
     where v.id = p_versao and public.acessa_obra(v.obra_id)
       and (public.tem_papel('admin', 'gestor', 'financeiro') or v.status = 'aprovada'))
$$;

create or replace function public.edita_versao_cronograma(p_versao uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cronograma_versoes v
     where v.id = p_versao and public.acessa_obra(v.obra_id) and public.tem_papel('admin', 'gestor'))
$$;

create policy "leem versoes de cronograma" on public.cronograma_versoes for select to authenticated
  using (public.le_versao_cronograma(id));
create policy "gestores editam descricao do cronograma" on public.cronograma_versoes for update to authenticated
  using (public.edita_versao_cronograma(id)) with check (public.edita_versao_cronograma(id));

create policy "leem atividades" on public.cronograma_atividades for select to authenticated
  using (public.le_versao_cronograma(versao_id));
create policy "gestores criam atividades" on public.cronograma_atividades for insert to authenticated
  with check (public.edita_versao_cronograma(versao_id));
create policy "gestores editam atividades" on public.cronograma_atividades for update to authenticated
  using (public.edita_versao_cronograma(versao_id)) with check (public.edita_versao_cronograma(versao_id));
create policy "gestores apagam atividades" on public.cronograma_atividades for delete to authenticated
  using (public.edita_versao_cronograma(versao_id));

create policy "leem dependencias" on public.cronograma_dependencias for select to authenticated
  using (public.le_versao_cronograma(versao_id));
create policy "gestores criam dependencias" on public.cronograma_dependencias for insert to authenticated
  with check (public.edita_versao_cronograma(versao_id));
create policy "gestores apagam dependencias" on public.cronograma_dependencias for delete to authenticated
  using (public.edita_versao_cronograma(versao_id));
