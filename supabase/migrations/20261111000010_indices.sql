-- =============================================================================
-- Índices que faltavam em filtros usados pelas telas
-- (as demais chaves estrangeiras sem índice são só de autoria — criado_por etc. — e não são filtradas)
-- =============================================================================

-- Contas a pagar e receber: filtro por categoria
create index if not exists lancamentos_categoria_idx on public.lancamentos (categoria_id);

-- Custo previsto × realizado por etapa (v_custo_previsto_realizado)
create index if not exists lancamentos_etapa_idx on public.lancamentos (etapa_id) where etapa_id is not null;
