-- =============================================================================
-- 0001 · Base: utilitários, perfis, permissões, auditoria
-- Referências: docs/03-modelo-dados.md §1 e §7, docs/05-permissoes.md
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Utilitários
-- -----------------------------------------------------------------------------

create or replace function public.hoje()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date
$$;

create or replace function public.tocar_atualizado_em()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

-- Erro de regra de negócio (mensagem vai direto para o usuário)
create or replace function public.erro(p_mensagem text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using errcode = 'P0001', message = p_mensagem;
end;
$$;

-- -----------------------------------------------------------------------------
-- Mudança de status somente via RPC (docs/05-permissoes.md)
-- -----------------------------------------------------------------------------

-- Chamada sem usuário que NÃO veio da API pública: migrations, seed, Auth (gatilho de novo usuário)
-- e a chave service_role do servidor. Visitante anônimo (role anon) nunca é sessão interna.
create or replace function public.sessao_interna()
returns boolean
language sql
stable
set search_path = ''
as $$
  select auth.uid() is null and coalesce(auth.role(), '') not in ('anon', 'authenticated')
$$;

create or replace function public.via_rpc()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('app.via_rpc', true), '') = 'on'
$$;

create or replace function public.ligar_via_rpc()
returns void
language sql
set search_path = ''
as $$
  select set_config('app.via_rpc', 'on', true);
$$;

-- TG_ARGV[0] = status inicial permitido em insert direto
create or replace function public.bloquear_mudanca_status()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.via_rpc() or public.sessao_interna() then
    return new;
  end if;
  if tg_op = 'INSERT' and new.status is distinct from tg_argv[0] then
    perform public.erro('Registro deve ser criado com status "' || tg_argv[0] || '".');
  end if;
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    perform public.erro('A situação não pode ser alterada diretamente. Use a ação correspondente.');
  end if;
  return new;
end;
$$;

create or replace function public.desligar_via_rpc()
returns void
language sql
set search_path = ''
as $$
  select set_config('app.via_rpc', '', true);
$$;

revoke execute on function public.ligar_via_rpc() from public, anon, authenticated;
revoke execute on function public.desligar_via_rpc() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Perfis
-- -----------------------------------------------------------------------------

create table public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  email text not null unique,
  telefone text,
  papel text not null default 'campo' check (papel in ('admin', 'gestor', 'campo', 'financeiro')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger perfis_atualizado_em before update on public.perfis
  for each row execute function public.tocar_atualizado_em();

-- Funções de permissão --------------------------------------------------------

create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.papel from public.perfis p where p.id = auth.uid() and p.ativo
$$;

create or replace function public.eh_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.papel_atual() = 'admin', false)
$$;

create or replace function public.tem_papel(variadic p_papeis text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.papel_atual() = any (p_papeis), false)
$$;

-- Criação automática do perfil -------------------------------------------------
-- Papel vem de raw_app_meta_data (só a service_role altera); padrão 'campo'.

create or replace function public.criar_perfil_novo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_papel text := coalesce(new.raw_app_meta_data ->> 'papel', 'campo');
begin
  if v_papel not in ('admin', 'gestor', 'campo', 'financeiro') then
    v_papel := 'campo';
  end if;
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    lower(new.email),
    v_papel
  );
  return new;
end;
$$;

create trigger criar_perfil_novo_usuario after insert on auth.users
  for each row execute function public.criar_perfil_novo_usuario();

-- Proteção de colunas e do último admin ---------------------------------------

create or replace function public.proteger_perfil()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- auth.uid() nulo = service_role / migrations: liberado
  if not public.sessao_interna() and not public.eh_admin() then
    if new.papel is distinct from old.papel
       or new.ativo is distinct from old.ativo
       or new.email is distinct from old.email then
      perform public.erro('Somente o administrador pode alterar perfil, e-mail ou situação do usuário.');
    end if;
  end if;

  if old.papel = 'admin' and old.ativo and (new.papel <> 'admin' or not new.ativo) then
    if not exists (
      select 1 from public.perfis p
      where p.papel = 'admin' and p.ativo and p.id <> old.id
    ) then
      perform public.erro('Não é possível remover o último administrador ativo.');
    end if;
  end if;

  return new;
end;
$$;

create trigger proteger_perfil before update on public.perfis
  for each row execute function public.proteger_perfil();

alter table public.perfis enable row level security;

create policy "usuario le o proprio perfil" on public.perfis
  for select to authenticated
  using (id = auth.uid() or public.eh_admin());

create policy "usuario edita o proprio perfil" on public.perfis
  for update to authenticated
  using (id = auth.uid() or public.eh_admin())
  with check (id = auth.uid() or public.eh_admin());

-- -----------------------------------------------------------------------------
-- Auditoria
-- -----------------------------------------------------------------------------

create table public.auditoria (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text not null,
  obra_id uuid,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  antes jsonb,
  depois jsonb,
  usuario_id uuid,
  em timestamptz not null default now()
);

create index auditoria_registro_idx on public.auditoria (tabela, registro_id);
create index auditoria_obra_idx on public.auditoria (obra_id, em desc);

-- Trigger genérico.
--   TG_ARGV[0] (opcional): SQL que recebe a linha em $1 (jsonb) e devolve o obra_id.
--                          Vazio/ausente = usa a coluna obra_id da própria linha (se existir).
--   TG_ARGV[1] (opcional): colunas da chave separadas por vírgula (padrão 'id').
create or replace function public.auditar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_linha jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_antes jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  v_depois jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  v_chave text := coalesce(nullif(tg_argv[1], ''), 'id');
  v_registro text;
  v_obra uuid;
  v_mudou jsonb;
begin
  select string_agg(v_linha ->> trim(c), ':') into v_registro
  from unnest(string_to_array(v_chave, ',')) as c;

  if coalesce(tg_argv[0], '') <> '' then
    execute tg_argv[0] into v_obra using v_linha;
  elsif v_linha ? 'obra_id' then
    v_obra := (v_linha ->> 'obra_id')::uuid;
  end if;

  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, n.value), '{}'::jsonb) into v_mudou
    from jsonb_each(v_depois) n
    where n.value is distinct from (v_antes -> n.key)
      and n.key not in ('atualizado_em');
    if v_mudou = '{}'::jsonb then
      return null;
    end if;
    v_depois := v_mudou || jsonb_build_object('id', v_registro);
  end if;

  insert into public.auditoria (tabela, registro_id, obra_id, acao, antes, depois, usuario_id)
  values (tg_table_name, v_registro, v_obra, tg_op, v_antes, v_depois, auth.uid());

  return null;
end;
$$;

alter table public.auditoria enable row level security;

create policy "admin le auditoria" on public.auditoria
  for select to authenticated
  using (public.eh_admin());

revoke insert, update, delete, truncate on public.auditoria from anon, authenticated;

create trigger auditar_perfis after insert or update or delete on public.perfis
  for each row execute function public.auditar();
