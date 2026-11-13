-- =============================================================================
-- Funções de gatilho fora da API (Security Advisor do Supabase, lint 0029)
--
-- Funções que só existem para triggers (auditar, *_antes_gravar, bloquear_*, ...)
-- recebiam EXECUTE do papel authenticated pelo padrão do Supabase e apareciam em
-- /rest/v1/rpc. Chamadas por lá o Postgres já recusa ("trigger functions can only
-- be called as triggers"), mas não há motivo para ficarem expostas.
--
-- O privilégio EXECUTE só é conferido quando o trigger é criado, não quando ele
-- dispara: os triggers continuam funcionando normalmente.
--
-- Ficam de fora, de propósito:
--   * as ações chamadas pelo sistema (aprovar_*, criar_lancamento, estornar_baixa...),
--     que conferem a permissão de quem chama dentro da própria função;
--   * as funções usadas pelas políticas RLS (papel_atual, tem_papel, acessa_obra,
--     pode_*), que precisam ser executáveis pelo usuário logado.
-- =============================================================================

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as assinatura
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prorettype in ('trigger'::regtype, 'event_trigger'::regtype)
       and pg_get_userbyid(p.proowner) = current_user
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.assinatura);
  end loop;
end
$$;
