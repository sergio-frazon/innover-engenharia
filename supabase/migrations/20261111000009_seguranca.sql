-- =============================================================================
-- Endurecimento de permissões (revisão de segurança antes do deploy)
--
-- O Supabase concede por padrão todos os privilégios de tabela e EXECUTE de função
-- aos papéis anon e authenticated. O RLS já filtra as linhas, mas:
--   * o visitante sem login (anon) não deve alcançar nada do schema public;
--   * TRUNCATE, TRIGGER e REFERENCES não são usados pela aplicação;
--   * funções internas (chamadas só de dentro de outras funções) não devem
--     ser chamáveis pela API.
-- =============================================================================

-- Visitante sem login: nada em public
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon, public;

alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- Usuário logado: só o que a API usa (o RLS decide as linhas)
revoke truncate, trigger, references on all tables in schema public from authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from authenticated;

-- Funções internas: só rodam dentro das funções que já checam permissão
revoke execute on function public.atualizar_datas_reais_servico(uuid) from authenticated;
revoke execute on function public.validar_excesso_medicao(uuid) from authenticated;
revoke execute on function public.validar_dependencia(uuid, uuid, uuid) from authenticated;
revoke execute on function public.servicos_pode_desativar(uuid) from authenticated;

-- Custo unitário de materiais é valor em R$: o perfil campo não lê a tabela.
-- Para o diário, o campo usa v_materiais_basico (sem custo), no mesmo padrão de v_pessoas_basico.
drop policy "leem materiais" on public.materiais;
create policy "leem materiais" on public.materiais for select to authenticated
  using (public.tem_papel('admin', 'gestor', 'financeiro'));

-- Sem security_invoker de propósito (o filtro por papel está no where)
create view public.v_materiais_basico as
  select id, descricao, unidade, ativo from public.materiais where public.papel_atual() is not null;
revoke all on public.v_materiais_basico from anon;
grant select on public.v_materiais_basico to authenticated;

-- Resumo de custo por obra: só para quem vê valores (antes devolvia zeros para o campo)
create or replace view public.v_custo_obra with (security_invoker = true) as
select o.id as obra_id,
       coalesce(c.previsto, 0) as valor_orcado,
       coalesce(c.realizado, 0) as custo_realizado,
       coalesce(c.realizado, 0) - coalesce(c.previsto, 0) as diferenca,
       case when coalesce(c.previsto, 0) = 0 then null
            else round((coalesce(c.realizado, 0) - c.previsto) / c.previsto * 100, 2) end as diferenca_pct
  from public.obras o
  left join (select obra_id, sum(previsto) as previsto, sum(realizado) as realizado
               from public.v_custo_previsto_realizado group by obra_id) c on c.obra_id = o.id
 where public.tem_papel('admin', 'gestor', 'financeiro');
