-- =============================================================================
-- 0008 · Gravação de atividade do cronograma em uma transação
-- Necessário para "Empurrar sucessores" (R-PRZ-04): várias atividades mudam juntas e a
-- revalidação das dependências (trigger adiado) só pode rodar no fim.
-- security invoker: o RLS e os triggers de 0003 continuam valendo.
-- =============================================================================

create or replace function public.salvar_atividade_cronograma(
  p_versao uuid,
  p_servico uuid,
  p_inicio date,
  p_fim date,
  p_predecessores uuid[] default '{}',
  p_ajustes jsonb default '[]'
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  a jsonb;
begin
  if p_fim < p_inicio then
    perform public.erro('O término não pode ser antes do início.');
  end if;

  insert into public.cronograma_atividades (versao_id, servico_id, inicio_previsto, fim_previsto)
  values (p_versao, p_servico, p_inicio, p_fim)
  on conflict (versao_id, servico_id) do update
    set inicio_previsto = excluded.inicio_previsto, fim_previsto = excluded.fim_previsto;

  for a in select * from jsonb_array_elements(coalesce(p_ajustes, '[]'::jsonb)) loop
    update public.cronograma_atividades
       set inicio_previsto = (a ->> 'inicio')::date, fim_previsto = (a ->> 'fim')::date
     where versao_id = p_versao and servico_id = (a ->> 'servico_id')::uuid;
  end loop;

  delete from public.cronograma_dependencias
   where versao_id = p_versao and servico_id = p_servico
     and not (predecessor_id = any (coalesce(p_predecessores, '{}')));

  insert into public.cronograma_dependencias (versao_id, servico_id, predecessor_id)
  select p_versao, p_servico, x
    from unnest(coalesce(p_predecessores, '{}')) as x
  on conflict do nothing;
end;
$$;
