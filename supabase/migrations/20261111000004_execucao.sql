-- =============================================================================
-- 0004 · Execução: diário de obra e medições
-- Referências: docs/03-modelo-dados.md §5, R-DIA-*, R-MED-*
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Diários
-- -----------------------------------------------------------------------------

create table public.diarios (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  data date not null,
  hora_inicio time,
  hora_fim time,
  clima_manha text check (clima_manha in ('bom', 'nublado', 'chuva_fraca', 'chuva_forte', 'impraticavel')),
  clima_tarde text check (clima_tarde in ('bom', 'nublado', 'chuva_fraca', 'chuva_forte', 'impraticavel')),
  atividades_resumo text,
  observacoes text,
  impedimentos text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviado', 'correcao_solicitada', 'aprovado')),
  enviado_por uuid references public.perfis (id),
  enviado_em timestamptz,
  revisado_por uuid references public.perfis (id),
  revisado_em timestamptz,
  comentario_revisao text,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (obra_id, data),
  constraint diarios_horario check (hora_fim is null or hora_inicio is null or hora_fim > hora_inicio)
);
create index diarios_obra_data_idx on public.diarios (obra_id, data desc);
create index diarios_status_idx on public.diarios (status);

create table public.diario_equipe (
  id uuid primary key default gen_random_uuid(),
  diario_id uuid not null references public.diarios (id) on delete cascade,
  profissional_id uuid references public.profissionais (id),
  nome text,
  funcao text not null check (length(trim(funcao)) > 0),
  quantidade int not null default 1 check (quantidade > 0),
  horas numeric(5, 2) check (horas > 0 and horas <= 24),
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index diario_equipe_diario_idx on public.diario_equipe (diario_id);

create table public.diario_materiais (
  id uuid primary key default gen_random_uuid(),
  diario_id uuid not null references public.diarios (id) on delete cascade,
  material_id uuid references public.materiais (id),
  servico_id uuid references public.servicos (id),
  descricao text not null check (length(trim(descricao)) > 0),
  unidade text not null check (length(trim(unidade)) > 0),
  quantidade numeric(14, 4) not null check (quantidade > 0),
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index diario_materiais_diario_idx on public.diario_materiais (diario_id);

create table public.diario_equipamentos (
  id uuid primary key default gen_random_uuid(),
  diario_id uuid not null references public.diarios (id) on delete cascade,
  equipamento_id uuid references public.equipamentos (id),
  descricao text not null check (length(trim(descricao)) > 0),
  horas numeric(5, 2) check (horas > 0 and horas <= 24),
  observacao text,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index diario_equipamentos_diario_idx on public.diario_equipamentos (diario_id);

create table public.diario_ocorrencias (
  id uuid primary key default gen_random_uuid(),
  diario_id uuid not null references public.diarios (id) on delete cascade,
  tipo text not null check (tipo in ('ocorrencia', 'impedimento', 'visita', 'acidente', 'entrega', 'outro')),
  hora time,
  descricao text not null check (length(trim(descricao)) > 0),
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index diario_ocorrencias_diario_idx on public.diario_ocorrencias (diario_id);

-- Quem pode editar o conteúdo de um diário (R-DIA-03/04)
create or replace function public.pode_editar_diario(p_diario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.diarios d
     where d.id = p_diario
       and public.acessa_obra(d.obra_id)
       and public.obra_editavel(d.obra_id)
       and (public.tem_papel('admin', 'gestor')
            or (public.tem_papel('campo') and d.status in ('rascunho', 'correcao_solicitada'))))
$$;

create or replace function public.pode_ler_diario(p_diario uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.diarios d
     where d.id = p_diario and public.acessa_obra(d.obra_id) and public.tem_papel('admin', 'gestor', 'campo'))
$$;

create or replace function public.diarios_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- R-DIA-06
    if auth.uid() is not null then
      if old.status <> 'rascunho' then
        perform public.erro('Somente diários em rascunho podem ser excluídos.');
      end if;
      if old.criado_por is distinct from auth.uid() and not public.tem_papel('admin', 'gestor') then
        perform public.erro('Somente quem criou o diário ou o gestor pode excluí-lo.');
      end if;
    end if;
    return old;
  end if;

  perform public.exigir_obra_editavel(new.obra_id);

  -- R-DIA-01
  if new.data > public.hoje() then
    perform public.erro('A data do diário não pode ser futura.');
  end if;

  if tg_op = 'UPDATE' then
    if new.obra_id <> old.obra_id or new.data <> old.data then
      perform public.erro('Não é possível mudar a obra ou a data de um diário. Crie um novo.');
    end if;
    -- R-DIA-03
    if auth.uid() is not null and not public.via_rpc() and not public.tem_papel('admin', 'gestor')
       and old.status not in ('rascunho', 'correcao_solicitada') then
      perform public.erro('Este diário já foi enviado para conferência e só o gestor pode alterá-lo.');
    end if;
  end if;
  return new;
end;
$$;

create trigger diarios_antes_gravar before insert or update or delete on public.diarios
  for each row execute function public.diarios_antes_gravar();
create trigger diarios_status before insert or update on public.diarios
  for each row execute function public.bloquear_mudanca_status('rascunho');

-- Filhos do diário seguem a regra de edição do pai
create or replace function public.bloquear_diario_fechado()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_diario uuid := case when tg_op = 'DELETE' then old.diario_id else new.diario_id end;
begin
  if auth.uid() is null or public.via_rpc() then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  -- Diário apagado em cascata (rascunho) já não existe
  if not exists (select 1 from public.diarios where id = v_diario) then
    return old;
  end if;
  if tg_op = 'UPDATE' and new.diario_id <> old.diario_id then
    perform public.erro('Não é possível mover um registro para outro diário.');
  end if;
  if not public.pode_editar_diario(v_diario) then
    perform public.erro('Este diário já foi enviado para conferência e só o gestor pode alterá-lo.');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger diario_equipe_fechado before insert or update or delete on public.diario_equipe
  for each row execute function public.bloquear_diario_fechado();
create trigger diario_materiais_fechado before insert or update or delete on public.diario_materiais
  for each row execute function public.bloquear_diario_fechado();
create trigger diario_equipamentos_fechado before insert or update or delete on public.diario_equipamentos
  for each row execute function public.bloquear_diario_fechado();
create trigger diario_ocorrencias_fechado before insert or update or delete on public.diario_ocorrencias
  for each row execute function public.bloquear_diario_fechado();

-- Material aplicado vinculado a serviço precisa ser da mesma obra
create or replace function public.diario_materiais_validar_servico()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.servico_id is not null and not exists (
    select 1 from public.servicos s join public.diarios d on d.obra_id = s.obra_id
     where s.id = new.servico_id and d.id = new.diario_id) then
    perform public.erro('O serviço escolhido pertence a outra obra.');
  end if;
  return new;
end;
$$;

create trigger diario_materiais_validar_servico before insert or update on public.diario_materiais
  for each row execute function public.diario_materiais_validar_servico();

-- -----------------------------------------------------------------------------
-- Medições
-- -----------------------------------------------------------------------------

create table public.medicoes (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references public.obras (id),
  servico_id uuid not null references public.servicos (id),
  diario_id uuid references public.diarios (id) on delete cascade,
  periodo_inicio date not null,
  periodo_fim date not null,
  quantidade numeric(14, 4) not null check (quantidade > 0),
  local text,
  observacao text,
  justificativa_excesso text,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'aprovada', 'rejeitada')),
  origem text not null default 'manual' check (origem in ('manual', 'diario')),
  enviado_em timestamptz,
  revisado_por uuid references public.perfis (id),
  revisado_em timestamptz,
  comentario_revisao text,
  criado_por uuid references public.perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint medicoes_periodo check (periodo_fim >= periodo_inicio)
);
-- R-MED-05
create unique index medicoes_diario_servico on public.medicoes (diario_id, servico_id) where diario_id is not null;
create index medicoes_servico_idx on public.medicoes (servico_id, status);
create index medicoes_obra_idx on public.medicoes (obra_id, status, periodo_fim desc);

create or replace function public.medicoes_antes_gravar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_servico record;
  v_diario record;
  v_dup record;
begin
  if tg_op = 'DELETE' then
    if auth.uid() is not null and not public.via_rpc() then
      -- Medição de diário apagado em cascata
      if old.diario_id is not null and not exists (select 1 from public.diarios where id = old.diario_id) then
        return old;
      end if;
      -- R-MED-07
      if old.status <> 'rascunho' then
        perform public.erro('Somente medições em rascunho podem ser excluídas.');
      end if;
      if old.criado_por is distinct from auth.uid() and not public.tem_papel('admin', 'gestor') then
        perform public.erro('Somente quem criou a medição ou o gestor pode excluí-la.');
      end if;
      if old.diario_id is not null and not public.pode_editar_diario(old.diario_id) then
        perform public.erro('Este diário já foi enviado para conferência e só o gestor pode alterá-lo.');
      end if;
    end if;
    return old;
  end if;

  select s.* into v_servico from public.servicos s where s.id = new.servico_id;
  new.obra_id := v_servico.obra_id;
  perform public.exigir_obra_editavel(new.obra_id);

  if tg_op = 'UPDATE' and not public.via_rpc() and auth.uid() is not null then
    if new.servico_id <> old.servico_id or new.diario_id is distinct from old.diario_id then
      perform public.erro('Não é possível trocar o serviço ou o diário de uma medição. Exclua e registre novamente.');
    end if;
    -- R-MED-07
    if old.status in ('aprovada', 'rejeitada') then
      perform public.erro('Medição aprovada ou rejeitada não pode ser alterada.');
    end if;
    if old.status = 'enviada' and not public.tem_papel('admin', 'gestor') then
      perform public.erro('Esta medição já foi enviada e só o gestor pode alterá-la.');
    end if;
  end if;

  -- R-MED-08
  if not v_servico.ativo then
    perform public.erro('Não é possível medir um serviço inativo.');
  end if;

  -- R-MED-06
  if new.diario_id is not null then
    select d.* into v_diario from public.diarios d where d.id = new.diario_id;
    if v_diario.obra_id <> new.obra_id then
      perform public.erro('O serviço escolhido pertence a outra obra.');
    end if;
    if auth.uid() is not null and not public.via_rpc() and not public.pode_editar_diario(new.diario_id) then
      perform public.erro('Este diário já foi enviado para conferência e só o gestor pode alterá-lo.');
    end if;
    new.periodo_inicio := v_diario.data;
    new.periodo_fim := v_diario.data;
    new.origem := 'diario';
  end if;

  if new.periodo_fim > public.hoje() then
    perform public.erro('O período da medição não pode terminar no futuro.');
  end if;

  new.local := nullif(trim(new.local), '');
  new.justificativa_excesso := nullif(trim(new.justificativa_excesso), '');

  -- R-MED-04
  if new.status <> 'rejeitada' then
    select m.periodo_inicio into v_dup
      from public.medicoes m
     where m.servico_id = new.servico_id
       and m.id <> new.id
       and m.status <> 'rejeitada'
       and m.periodo_inicio <= new.periodo_fim
       and m.periodo_fim >= new.periodo_inicio
       and lower(coalesce(m.local, '')) = lower(coalesce(new.local, ''))
     limit 1;
    if found then
      perform public.erro(format(
        'Já existe uma medição deste serviço neste período e local (medição de %s). Verifique se não é o mesmo registro.',
        to_char(v_dup.periodo_inicio, 'DD/MM/YYYY')));
    end if;
  end if;

  return new;
end;
$$;

create trigger medicoes_antes_gravar before insert or update or delete on public.medicoes
  for each row execute function public.medicoes_antes_gravar();
create trigger medicoes_status before insert or update on public.medicoes
  for each row execute function public.bloquear_mudanca_status('rascunho');

-- R-MED-03: excesso exige justificativa (chamado ao enviar e ao aprovar)
create or replace function public.validar_excesso_medicao(p_medicao uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_med record;
  v_prevista numeric;
  v_unidade text;
  v_codigo text;
  v_outras numeric;
begin
  select * into v_med from public.medicoes where id = p_medicao;
  select quantidade_prevista, unidade, codigo into v_prevista, v_unidade, v_codigo
    from public.servicos where id = v_med.servico_id;
  select coalesce(sum(quantidade), 0) into v_outras
    from public.medicoes
   where servico_id = v_med.servico_id and id <> p_medicao and status in ('aprovada', 'enviada');

  if v_outras + v_med.quantidade > v_prevista and v_med.justificativa_excesso is null then
    perform public.erro(format(
      'A quantidade ultrapassa o previsto para o serviço %s (previsto %s %s, acumulado %s %s). Informe uma justificativa.',
      v_codigo,
      trim(trailing ',' from trim(trailing '0' from replace(v_prevista::text, '.', ','))), v_unidade,
      trim(trailing ',' from trim(trailing '0' from replace((v_outras + v_med.quantidade)::text, '.', ','))), v_unidade));
  end if;
end;
$$;

-- R-MED-09: datas reais do serviço a partir das medições aprovadas
create or replace function public.atualizar_datas_reais_servico(p_servico uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s record;
  v_total numeric;
  v_inicio date;
  v_fim date;
begin
  select * into s from public.servicos where id = p_servico for update;
  select coalesce(sum(quantidade), 0), min(periodo_inicio), max(periodo_fim)
    into v_total, v_inicio, v_fim
    from public.medicoes where servico_id = p_servico and status = 'aprovada';

  if v_total > 0 and s.data_inicio_real is null then
    update public.servicos set data_inicio_real = v_inicio where id = p_servico;
  end if;
  if v_total >= s.quantidade_prevista and s.data_fim_real is null then
    update public.servicos set data_fim_real = greatest(v_fim, coalesce(data_inicio_real, v_fim)), data_fim_real_automatica = true
     where id = p_servico;
  elsif v_total < s.quantidade_prevista and s.data_fim_real_automatica then
    update public.servicos set data_fim_real = null, data_fim_real_automatica = false where id = p_servico;
  end if;
end;
$$;

-- Serviço com medição aprovada não pode ser desativado
create or replace function public.servicos_pode_desativar(p_servico uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.medicoes where servico_id = p_servico and status = 'aprovada')
$$;

-- -----------------------------------------------------------------------------
-- RPCs de diário
-- -----------------------------------------------------------------------------

create or replace function public.enviar_diario(p_diario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  m record;
begin
  select * into d from public.diarios where id = p_diario for update;
  if d is null or not public.pode_ler_diario(p_diario) then
    perform public.erro('Diário não encontrado.');
  end if;
  perform public.exigir_obra_editavel(d.obra_id);
  if d.status not in ('rascunho', 'correcao_solicitada') then
    perform public.erro('Este diário já foi enviado.');
  end if;
  -- R-DIA-07
  if coalesce(trim(d.atividades_resumo), '') = ''
     and not exists (select 1 from public.medicoes where diario_id = p_diario) then
    perform public.erro('Descreva as atividades do dia ou informe pelo menos um serviço executado antes de enviar.');
  end if;

  for m in select id from public.medicoes where diario_id = p_diario and status = 'rascunho' loop
    perform public.validar_excesso_medicao(m.id);
  end loop;

  perform public.ligar_via_rpc();
  update public.medicoes set status = 'enviada', enviado_em = now()
   where diario_id = p_diario and status = 'rascunho';
  update public.diarios
     set status = 'enviado', enviado_por = auth.uid(), enviado_em = now()
   where id = p_diario;
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.aprovar_diario(p_diario uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
  m record;
begin
  select * into d from public.diarios where id = p_diario for update;
  if d is null then
    perform public.erro('Diário não encontrado.');
  end if;
  perform public.exigir_gestor_obra(d.obra_id);
  if d.status <> 'enviado' then
    perform public.erro('Somente diários enviados podem ser aprovados.');
  end if;

  for m in select id from public.medicoes where diario_id = p_diario and status = 'enviada' loop
    perform public.validar_excesso_medicao(m.id);
  end loop;

  perform public.ligar_via_rpc();
  update public.medicoes
     set status = 'aprovada', revisado_por = auth.uid(), revisado_em = now(), comentario_revisao = null
   where diario_id = p_diario and status = 'enviada';
  update public.diarios
     set status = 'aprovado', revisado_por = auth.uid(), revisado_em = now(), comentario_revisao = null
   where id = p_diario;

  for m in select distinct servico_id from public.medicoes where diario_id = p_diario loop
    perform public.atualizar_datas_reais_servico(m.servico_id);
  end loop;
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.solicitar_correcao_diario(p_diario uuid, p_comentario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d record;
begin
  select * into d from public.diarios where id = p_diario for update;
  if d is null then
    perform public.erro('Diário não encontrado.');
  end if;
  perform public.exigir_gestor_obra(d.obra_id);
  if d.status <> 'enviado' then
    perform public.erro('Somente diários enviados podem voltar para correção.');
  end if;
  -- R-DIA-05
  if coalesce(trim(p_comentario), '') = '' then
    perform public.erro('Explique o que precisa ser corrigido.');
  end if;

  perform public.ligar_via_rpc();
  update public.medicoes set status = 'rascunho', enviado_em = null
   where diario_id = p_diario and status = 'enviada';
  update public.diarios
     set status = 'correcao_solicitada', revisado_por = auth.uid(), revisado_em = now(),
         comentario_revisao = trim(p_comentario)
   where id = p_diario;
  perform public.desligar_via_rpc();
end;
$$;

-- -----------------------------------------------------------------------------
-- RPCs de medição
-- -----------------------------------------------------------------------------

create or replace function public.enviar_medicao(p_medicao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select * into m from public.medicoes where id = p_medicao for update;
  if m is null or not (public.acessa_obra(m.obra_id) and public.tem_papel('admin', 'gestor', 'campo')) then
    perform public.erro('Medição não encontrada.');
  end if;
  perform public.exigir_obra_editavel(m.obra_id);
  if m.diario_id is not null then
    perform public.erro('Esta medição faz parte de um diário e é enviada junto com ele.');
  end if;
  if m.status <> 'rascunho' then
    perform public.erro('Esta medição já foi enviada.');
  end if;
  perform public.validar_excesso_medicao(p_medicao);

  perform public.ligar_via_rpc();
  update public.medicoes set status = 'enviada', enviado_em = now() where id = p_medicao;
  perform public.desligar_via_rpc();
end;
$$;

-- Medição avulsa, ou de diário já aprovado (após reabrir)
create or replace function public.aprovar_medicao(p_medicao uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select * into m from public.medicoes where id = p_medicao for update;
  if m is null then
    perform public.erro('Medição não encontrada.');
  end if;
  perform public.exigir_gestor_obra(m.obra_id);
  if m.diario_id is not null and exists (select 1 from public.diarios where id = m.diario_id and status <> 'aprovado') then
    perform public.erro('Esta medição faz parte de um diário e é aprovada junto com ele.');
  end if;
  if m.status <> 'enviada' then
    perform public.erro('Somente medições enviadas podem ser aprovadas.');
  end if;
  perform public.validar_excesso_medicao(p_medicao);

  perform public.ligar_via_rpc();
  update public.medicoes
     set status = 'aprovada', revisado_por = auth.uid(), revisado_em = now()
   where id = p_medicao;
  perform public.atualizar_datas_reais_servico(m.servico_id);
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.rejeitar_medicao(p_medicao uuid, p_comentario text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select * into m from public.medicoes where id = p_medicao for update;
  if m is null then
    perform public.erro('Medição não encontrada.');
  end if;
  perform public.exigir_gestor_obra(m.obra_id);
  if m.diario_id is not null and exists (select 1 from public.diarios where id = m.diario_id and status <> 'aprovado') then
    perform public.erro('Esta medição faz parte de um diário. Solicite a correção do diário.');
  end if;
  if m.status <> 'enviada' then
    perform public.erro('Somente medições enviadas podem ser rejeitadas.');
  end if;
  if coalesce(trim(p_comentario), '') = '' then
    perform public.erro('Informe o motivo da rejeição.');
  end if;

  perform public.ligar_via_rpc();
  update public.medicoes
     set status = 'rejeitada', revisado_por = auth.uid(), revisado_em = now(), comentario_revisao = trim(p_comentario)
   where id = p_medicao;
  perform public.desligar_via_rpc();
end;
$$;

create or replace function public.reabrir_medicao(p_medicao uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  m record;
begin
  select * into m from public.medicoes where id = p_medicao for update;
  if m is null then
    perform public.erro('Medição não encontrada.');
  end if;
  perform public.exigir_gestor_obra(m.obra_id);
  if m.status <> 'aprovada' then
    perform public.erro('Somente medições aprovadas podem ser reabertas.');
  end if;
  if coalesce(trim(p_motivo), '') = '' then
    perform public.erro('Informe o motivo para reabrir a medição.');
  end if;

  perform public.ligar_via_rpc();
  update public.medicoes
     set status = 'enviada', comentario_revisao = trim(p_motivo), revisado_por = auth.uid(), revisado_em = now()
   where id = p_medicao;
  perform public.atualizar_datas_reais_servico(m.servico_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Atualizado_em e auditoria
-- -----------------------------------------------------------------------------

create trigger diarios_atualizado_em before update on public.diarios for each row execute function public.tocar_atualizado_em();
create trigger diario_equipe_atualizado_em before update on public.diario_equipe for each row execute function public.tocar_atualizado_em();
create trigger diario_materiais_atualizado_em before update on public.diario_materiais for each row execute function public.tocar_atualizado_em();
create trigger diario_equipamentos_atualizado_em before update on public.diario_equipamentos for each row execute function public.tocar_atualizado_em();
create trigger diario_ocorrencias_atualizado_em before update on public.diario_ocorrencias for each row execute function public.tocar_atualizado_em();
create trigger medicoes_atualizado_em before update on public.medicoes for each row execute function public.tocar_atualizado_em();

create trigger auditar_diarios after insert or update or delete on public.diarios for each row execute function public.auditar();
create trigger auditar_diario_equipe after insert or update or delete on public.diario_equipe
  for each row execute function public.auditar('select obra_id from public.diarios where id = ($1->>''diario_id'')::uuid');
create trigger auditar_diario_materiais after insert or update or delete on public.diario_materiais
  for each row execute function public.auditar('select obra_id from public.diarios where id = ($1->>''diario_id'')::uuid');
create trigger auditar_diario_equipamentos after insert or update or delete on public.diario_equipamentos
  for each row execute function public.auditar('select obra_id from public.diarios where id = ($1->>''diario_id'')::uuid');
create trigger auditar_diario_ocorrencias after insert or update or delete on public.diario_ocorrencias
  for each row execute function public.auditar('select obra_id from public.diarios where id = ($1->>''diario_id'')::uuid');
create trigger auditar_medicoes after insert or update or delete on public.medicoes for each row execute function public.auditar();

-- -----------------------------------------------------------------------------
-- RLS (financeiro não acessa diário nem medições)
-- -----------------------------------------------------------------------------

alter table public.diarios enable row level security;
alter table public.diario_equipe enable row level security;
alter table public.diario_materiais enable row level security;
alter table public.diario_equipamentos enable row level security;
alter table public.diario_ocorrencias enable row level security;
alter table public.medicoes enable row level security;

create policy "leem diarios" on public.diarios for select to authenticated
  using (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));
create policy "criam diarios" on public.diarios for insert to authenticated
  with check (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));
create policy "editam diarios" on public.diarios for update to authenticated
  using (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id))
  with check (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));
create policy "apagam diarios" on public.diarios for delete to authenticated
  using (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));

do $$
declare
  t text;
begin
  foreach t in array array['diario_equipe', 'diario_materiais', 'diario_equipamentos', 'diario_ocorrencias'] loop
    execute format('create policy "leem %1$s" on public.%1$I for select to authenticated using (public.pode_ler_diario(diario_id))', t);
    execute format('create policy "criam %1$s" on public.%1$I for insert to authenticated with check (public.pode_ler_diario(diario_id))', t);
    execute format('create policy "editam %1$s" on public.%1$I for update to authenticated using (public.pode_ler_diario(diario_id)) with check (public.pode_ler_diario(diario_id))', t);
    execute format('create policy "apagam %1$s" on public.%1$I for delete to authenticated using (public.pode_ler_diario(diario_id))', t);
  end loop;
  perform public.desligar_via_rpc();
end;
$$;

create policy "leem medicoes" on public.medicoes for select to authenticated
  using (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));
create policy "criam medicoes" on public.medicoes for insert to authenticated
  with check (public.tem_papel('admin', 'gestor', 'campo')
              and exists (select 1 from public.servicos s where s.id = servico_id and public.acessa_obra(s.obra_id)));
create policy "editam medicoes" on public.medicoes for update to authenticated
  using (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id))
  with check (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));
create policy "apagam medicoes" on public.medicoes for delete to authenticated
  using (public.tem_papel('admin', 'gestor', 'campo') and public.acessa_obra(obra_id));
