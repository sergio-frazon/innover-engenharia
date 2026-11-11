-- =============================================================================
-- 0006 · Views de totais, custo, parcelas, fluxo de caixa, progresso e alertas
-- Referências: docs/03-modelo-dados.md §8, R-ORC-02/03, R-PROG-*, R-PRZ-*, R-FIN-02/05/06, R-ALE
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Orçamento (R-ORC-02) — RLS das tabelas base se aplica (campo não vê)
-- -----------------------------------------------------------------------------

create view public.v_orcamento_totais_servico with (security_invoker = true) as
  select i.versao_id,
         v.obra_id,
         i.servico_id,
         s.etapa_id,
         sum(i.valor_total) as total,
         sum(i.valor_total) filter (where i.natureza = 'material') as total_material,
         sum(i.valor_total) filter (where i.natureza = 'mao_de_obra') as total_mao_de_obra,
         sum(i.valor_total) filter (where i.natureza = 'equipamento') as total_equipamento,
         sum(i.valor_total) filter (where i.natureza = 'outro') as total_outro
    from public.orcamento_itens i
    join public.orcamento_versoes v on v.id = i.versao_id
    join public.servicos s on s.id = i.servico_id
   group by i.versao_id, v.obra_id, i.servico_id, s.etapa_id;

create view public.v_orcamento_totais_etapa with (security_invoker = true) as
  select i.versao_id, v.obra_id, s.etapa_id, sum(i.valor_total) as total
    from public.orcamento_itens i
    join public.orcamento_versoes v on v.id = i.versao_id
    join public.servicos s on s.id = i.servico_id
   group by i.versao_id, v.obra_id, s.etapa_id;

-- -----------------------------------------------------------------------------
-- Custo previsto × realizado (R-ORC-03, R-FIN-05)
-- -----------------------------------------------------------------------------

create view public.v_custo_previsto_realizado with (security_invoker = true) as
  with previsto as (
    select v.obra_id, s.etapa_id, i.natureza, sum(i.valor_total) as valor
      from public.orcamento_itens i
      join public.orcamento_versoes v on v.id = i.versao_id and v.status = 'aprovada'
      join public.servicos s on s.id = i.servico_id
     group by v.obra_id, s.etapa_id, i.natureza
  ),
  realizado as (
    select l.obra_id, l.etapa_id, coalesce(l.natureza, 'outro') as natureza, sum(l.valor_total) as valor
      from public.lancamentos l
     where l.tipo = 'pagar' and not l.cancelado and l.obra_id is not null
     group by l.obra_id, l.etapa_id, coalesce(l.natureza, 'outro')
  )
  select coalesce(p.obra_id, r.obra_id) as obra_id,
         coalesce(p.etapa_id, r.etapa_id) as etapa_id,
         coalesce(p.natureza, r.natureza) as natureza,
         coalesce(p.valor, 0) as previsto,
         coalesce(r.valor, 0) as realizado,
         coalesce(r.valor, 0) - coalesce(p.valor, 0) as diferenca,
         case when coalesce(p.valor, 0) = 0 then null
              else round((coalesce(r.valor, 0) - p.valor) / p.valor * 100, 2) end as diferenca_pct
    from previsto p
    full join realizado r
      on r.obra_id = p.obra_id and r.etapa_id is not distinct from p.etapa_id and r.natureza = p.natureza;

create view public.v_custo_obra with (security_invoker = true) as
  select o.id as obra_id,
         coalesce(c.previsto, 0) as valor_orcado,
         coalesce(c.realizado, 0) as custo_realizado,
         coalesce(c.realizado, 0) - coalesce(c.previsto, 0) as diferenca,
         case when coalesce(c.previsto, 0) = 0 then null
              else round((coalesce(c.realizado, 0) - c.previsto) / c.previsto * 100, 2) end as diferenca_pct
    from public.obras o
    left join (
      select obra_id, sum(previsto) as previsto, sum(realizado) as realizado
        from public.v_custo_previsto_realizado group by obra_id
    ) c on c.obra_id = o.id;

-- -----------------------------------------------------------------------------
-- Parcelas e fluxo de caixa (R-FIN-02, R-FIN-06)
-- -----------------------------------------------------------------------------

create view public.v_parcelas_situacao with (security_invoker = true) as
  select p.id,
         p.lancamento_id,
         p.numero,
         (select count(*) from public.parcelas x where x.lancamento_id = p.lancamento_id) as total_parcelas,
         p.vencimento,
         p.valor,
         l.tipo,
         l.descricao,
         l.categoria_id,
         l.obra_id,
         l.etapa_id,
         l.natureza,
         l.pessoa_id,
         l.documento_numero,
         l.cancelado,
         coalesce(b.pago, 0) as valor_pago,
         coalesce(b.juros, 0) as juros_multa_pagos,
         greatest(p.valor - coalesce(b.pago, 0), 0) as saldo,
         b.ultimo_pagamento,
         case
           when l.cancelado then 'cancelada'
           when coalesce(b.pago, 0) >= p.valor then 'paga'
           when coalesce(b.pago, 0) > 0 then 'parcial'
           when p.vencimento < public.hoje() then 'vencida'
           else 'aberta'
         end as situacao,
         p.vencimento - public.hoje() as dias_para_vencer
    from public.parcelas p
    join public.lancamentos l on l.id = p.lancamento_id
    left join (
      select parcela_id,
             sum(valor + desconto) as pago,
             sum(juros_multa) as juros,
             max(data_pagamento) as ultimo_pagamento
        from public.baixas where not estornada group by parcela_id
    ) b on b.parcela_id = p.id;

-- Realizado: baixas não estornadas por data de pagamento
create view public.v_fluxo_caixa with (security_invoker = true) as
  select b.data_pagamento as data,
         l.obra_id,
         l.tipo,
         sum(b.valor + b.juros_multa) filter (where l.tipo = 'receber') as entradas,
         sum(b.valor + b.juros_multa) filter (where l.tipo = 'pagar') as saidas
    from public.baixas b
    join public.parcelas p on p.id = b.parcela_id
    join public.lancamentos l on l.id = p.lancamento_id
   where not b.estornada
   group by b.data_pagamento, l.obra_id, l.tipo;

-- -----------------------------------------------------------------------------
-- Progresso (security definer, sem valores em R$) — R-PROG-*, R-PRZ
-- -----------------------------------------------------------------------------

create or replace function public.progresso_servicos(p_obra uuid)
returns table (
  servico_id uuid,
  etapa_id uuid,
  codigo text,
  descricao text,
  unidade text,
  ordem int,
  responsavel_id uuid,
  quantidade_prevista numeric,
  quantidade_aprovada numeric,
  quantidade_pendente numeric,
  percentual numeric,
  percentual_limitado numeric,
  peso numeric,
  peso_pelo_orcamento boolean,
  sem_item_orcamento boolean,
  inicio_previsto date,
  fim_previsto date,
  duracao_dias int,
  percentual_esperado numeric,
  data_inicio_real date,
  data_fim_real date,
  situacao_prazo text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.acessa_obra(p_obra) then
    perform public.erro('Sem acesso a esta obra.');
  end if;

  return query
  with s as (
    select sv.*, e.ordem as etapa_ordem, e.codigo as etapa_codigo
      from public.servicos sv join public.etapas e on e.id = sv.etapa_id
     where sv.obra_id = p_obra and sv.ativo
  ),
  orc as (
    select i.servico_id, sum(i.valor_total) as valor
      from public.orcamento_itens i
      join public.orcamento_versoes v on v.id = i.versao_id and v.obra_id = p_obra and v.status = 'aprovada'
     group by i.servico_id
  ),
  totais as (
    select (select count(*) from s) as n,
           coalesce((select sum(o.valor) from orc o join s on s.id = o.servico_id), 0) as total,
           exists (select 1 from public.orcamento_versoes v where v.obra_id = p_obra and v.status = 'aprovada') as tem_aprovado
  ),
  med as (
    select m.servico_id,
           sum(m.quantidade) filter (where m.status = 'aprovada') as aprovada,
           sum(m.quantidade) filter (where m.status = 'enviada') as pendente
      from public.medicoes m where m.obra_id = p_obra
     group by m.servico_id
  ),
  cron as (
    select a.servico_id, a.inicio_previsto, a.fim_previsto, a.duracao_dias
      from public.cronograma_atividades a
      join public.cronograma_versoes v on v.id = a.versao_id and v.obra_id = p_obra and v.status = 'aprovada'
  ),
  base as (
    select s.*,
           coalesce(med.aprovada, 0) as q_aprovada,
           coalesce(med.pendente, 0) as q_pendente,
           round(coalesce(med.aprovada, 0) / s.quantidade_prevista * 100, 4) as pct,
           case when t.tem_aprovado and t.total > 0 then coalesce(orc.valor, 0) / t.total
                else 1.0 / t.n end as w,
           (t.tem_aprovado and t.total > 0) as pelo_orc,
           (t.tem_aprovado and orc.valor is null) as sem_item,
           cron.inicio_previsto as ini, cron.fim_previsto as fim, cron.duracao_dias as dur
      from s
      cross join totais t
      left join orc on orc.servico_id = s.id
      left join med on med.servico_id = s.id
      left join cron on cron.servico_id = s.id
  ),
  calc as (
    select b.*,
           least(b.pct, 100) as pct_lim,
           case when b.ini is null then null
                else least(100, greatest(0, (public.hoje() - b.ini + 1)::numeric / b.dur * 100)) end as esperado
      from base b
  )
  select c.id, c.etapa_id, c.codigo, c.descricao, c.unidade, c.ordem, c.responsavel_id,
         c.quantidade_prevista, c.q_aprovada, c.q_pendente,
         c.pct, c.pct_lim, round(c.w, 8), c.pelo_orc, c.sem_item,
         c.ini, c.fim, c.dur, round(c.esperado, 2),
         c.data_inicio_real, c.data_fim_real,
         case
           when c.pct >= 100 then 'concluido'
           when c.ini is null then 'sem_cronograma'
           when public.hoje() > c.fim then 'atrasado'
           when public.hoje() > c.ini and c.q_aprovada = 0 then 'inicio_atrasado'
           when public.hoje() < c.ini then 'a_iniciar'
           when c.esperado - c.pct > 20 then 'em_risco'
           else 'no_prazo'
         end
    from calc c
   order by c.etapa_ordem, c.etapa_codigo, c.ordem, c.codigo;
end;
$$;

create or replace function public.progresso_etapas(p_obra uuid)
returns table (
  etapa_id uuid,
  codigo text,
  nome text,
  ordem int,
  peso numeric,
  avanco numeric,
  servicos int,
  servicos_atrasados int
)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.codigo, e.nome, e.ordem,
         coalesce(sum(p.peso), 0),
         case when coalesce(sum(p.peso), 0) > 0
              then round(sum(p.peso * p.percentual_limitado) / sum(p.peso), 2)
              else round(coalesce(avg(p.percentual_limitado), 0), 2) end,
         count(p.servico_id)::int,
         (count(*) filter (where p.situacao_prazo in ('atrasado', 'inicio_atrasado')))::int
    from public.etapas e
    left join public.progresso_servicos(p_obra) p on p.etapa_id = e.id
   where e.obra_id = p_obra and e.ativo
   group by e.id, e.codigo, e.nome, e.ordem
   order by e.ordem, e.codigo
$$;

create or replace function public.progresso_obras()
returns table (
  obra_id uuid,
  avanco_fisico numeric,
  servicos int,
  servicos_atrasados int,
  servicos_em_risco int,
  diarios_pendentes int,
  medicoes_pendentes int,
  peso_pelo_orcamento boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id,
         round(coalesce(sum(p.peso * p.percentual_limitado), 0), 2),
         count(p.servico_id)::int,
         (count(*) filter (where p.situacao_prazo in ('atrasado', 'inicio_atrasado')))::int,
         (count(*) filter (where p.situacao_prazo = 'em_risco'))::int,
         (select count(*) from public.diarios d where d.obra_id = o.id and d.status = 'enviado')::int,
         (select count(*) from public.medicoes m
           where m.obra_id = o.id and m.status = 'enviada'
             and (m.diario_id is null or exists (select 1 from public.diarios d where d.id = m.diario_id and d.status = 'aprovado')))::int,
         coalesce(bool_or(p.peso_pelo_orcamento), false)
    from public.obras o
    left join lateral public.progresso_servicos(o.id) p on true
   where public.acessa_obra(o.id)
   group by o.id
$$;

-- -----------------------------------------------------------------------------
-- Alertas (R-ALE) — security_invoker: cada usuário vê só o que o RLS permite
-- -----------------------------------------------------------------------------

create view public.v_alertas with (security_invoker = true) as
  -- Serviços atrasados / em risco (gestor, admin)
  select case when p.situacao_prazo = 'em_risco' then 'servico_em_risco' else 'servico_atrasado' end as tipo,
         case when p.situacao_prazo = 'em_risco' then 'media' else 'alta' end as gravidade,
         o.id as obra_id,
         p.servico_id as referencia_id,
         format('%s %s — %s', p.codigo, p.descricao,
                case p.situacao_prazo when 'atrasado' then 'prazo de término vencido'
                                      when 'inicio_atrasado' then 'início atrasado'
                                      else 'avanço abaixo do esperado' end) as titulo,
         p.fim_previsto as data_referencia
    from public.obras o
    cross join lateral public.progresso_servicos(o.id) p
   where o.situacao = 'em_andamento'
     and public.tem_papel('admin', 'gestor')
     and p.situacao_prazo in ('atrasado', 'inicio_atrasado', 'em_risco')

  union all
  -- Diários aguardando conferência (gestor, admin)
  select 'diario_pendente', 'media', d.obra_id, d.id,
         format('Diário de %s aguardando conferência', to_char(d.data, 'DD/MM/YYYY')), d.data
    from public.diarios d
   where d.status = 'enviado' and public.tem_papel('admin', 'gestor')

  union all
  -- Medições avulsas aguardando aprovação (gestor, admin)
  select 'medicao_pendente', 'media', m.obra_id, m.id,
         format('Medição de %s %s aguardando aprovação', s.codigo, s.descricao), m.periodo_fim
    from public.medicoes m
    join public.servicos s on s.id = m.servico_id
   where m.status = 'enviada' and public.tem_papel('admin', 'gestor')
     and (m.diario_id is null or exists (select 1 from public.diarios d where d.id = m.diario_id and d.status = 'aprovado'))

  union all
  -- Diário devolvido para correção (quem criou)
  select 'diario_correcao', 'alta', d.obra_id, d.id,
         format('Diário de %s precisa de correção', to_char(d.data, 'DD/MM/YYYY')), d.data
    from public.diarios d
   where d.status = 'correcao_solicitada' and d.criado_por = auth.uid()

  union all
  -- Obra em andamento sem diário no último dia útil (gestor, campo)
  select 'diario_ausente', 'baixa', o.id, o.id,
         format('Sem diário em %s', to_char(u.dia, 'DD/MM/YYYY')), u.dia
    from public.obras o
    cross join (
      select public.hoje() - case extract(isodow from public.hoje())::int when 1 then 3 when 7 then 2 else 1 end as dia
    ) u
   where o.situacao = 'em_andamento'
     and public.tem_papel('gestor', 'campo')
     and coalesce(o.data_inicio_real, o.criado_em::date) <= u.dia
     and not exists (select 1 from public.diarios d where d.obra_id = o.id and d.data = u.dia)

  union all
  -- Contas vencidas e a vencer em até 7 dias (financeiro, admin)
  select case when ps.dias_para_vencer < 0 then 'conta_vencida' else 'conta_a_vencer' end,
         case when ps.dias_para_vencer < 0 then 'alta' else 'media' end,
         ps.obra_id, ps.id,
         format('%s %s/%s — %s', case when ps.tipo = 'pagar' then 'Pagar' else 'Receber' end,
                ps.numero, ps.total_parcelas, ps.descricao),
         ps.vencimento
    from public.v_parcelas_situacao ps
   where public.tem_papel('admin', 'financeiro')
     and ps.situacao in ('aberta', 'parcial', 'vencida') and ps.dias_para_vencer <= 7;
