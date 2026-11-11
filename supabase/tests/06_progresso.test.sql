-- Passo 8: exemplo de referência (R-PROG), R-PRZ, R-FIN-02/05/06, R-ALE, RLS item 2
begin;
\ir _helpers.psql
select plan(29);

select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset
select tests.criar_usuario('fin@t.local', 'financeiro') as fin \gset

-- Obra A: exemplo de referência de docs/04-regras-negocio.md
insert into obras (id, nome, responsavel_id, situacao) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor', 'em_andamento');
insert into obras (id, nome, responsavel_id, situacao) values ('00000000-0000-0000-0000-00000000000b', 'Obra B', :'gestor', 'em_andamento');
insert into obra_membros (obra_id, perfil_id) values
  ('00000000-0000-0000-0000-00000000000a', :'campo'), ('00000000-0000-0000-0000-00000000000a', :'fin'),
  ('00000000-0000-0000-0000-00000000000b', :'fin');
insert into etapas (id, obra_id, codigo, nome) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '1', 'Estrutura'),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000b', '1', 'Geral');
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', '1.1', 'Alvenaria', 'm²', 200, 1),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', '1.2', 'Reboco', 'm²', 400, 2);

select tests.autenticar(:'gestor');
select criar_revisao_orcamento('00000000-0000-0000-0000-00000000000a') as v1 \gset
insert into orcamento_itens (versao_id, servico_id, natureza, descricao, unidade, quantidade, valor_unitario) values
  (:'v1', '00000000-0000-0000-0000-0000000000a1', 'material', 'Alvenaria', 'm²', 200, 150),
  (:'v1', '00000000-0000-0000-0000-0000000000a2', 'mao_de_obra', 'Reboco', 'm²', 400, 25);
select aprovar_orcamento(:'v1');

select is((select peso from progresso_servicos('00000000-0000-0000-0000-00000000000a') where codigo = '1.1'), 0.75, 'R-PROG-02 peso da alvenaria = 0,75');

-- 1) 20 m² de alvenaria
insert into medicoes (id, servico_id, periodo_inicio, periodo_fim, quantidade) values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', hoje() - 3, hoje() - 3, 20);
select enviar_medicao('00000000-0000-0000-0000-0000000000b1');
select is((select avanco_fisico from progresso_obras() where obra_id = '00000000-0000-0000-0000-00000000000a'), 0.00, 'medição enviada ainda não conta (R-MED-02)');
select is((select quantidade_pendente from progresso_servicos('00000000-0000-0000-0000-00000000000a') where codigo = '1.1'), 20.0000, 'aparece como pendente');
select aprovar_medicao('00000000-0000-0000-0000-0000000000b1');
select is((select percentual from progresso_servicos('00000000-0000-0000-0000-00000000000a') where codigo = '1.1'), 10.0000, 'alvenaria 10%');
select is((select avanco_fisico from progresso_obras() where obra_id = '00000000-0000-0000-0000-00000000000a'), 7.50, 'exemplo passo 1: avanço 7,5%');

-- 2) 190 m² sem justificativa → erro; com justificativa → 75%
insert into medicoes (id, servico_id, periodo_inicio, periodo_fim, quantidade) values ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', hoje() - 2, hoje() - 2, 190);
select throws_ok($$ select enviar_medicao('00000000-0000-0000-0000-0000000000b2') $$, 'P0001', null, 'exemplo passo 2: excesso exige justificativa');
update medicoes set justificativa_excesso = 'Aditivo' where id = '00000000-0000-0000-0000-0000000000b2';
select enviar_medicao('00000000-0000-0000-0000-0000000000b2');
select aprovar_medicao('00000000-0000-0000-0000-0000000000b2');
select is((select percentual from progresso_servicos('00000000-0000-0000-0000-00000000000a') where codigo = '1.1'), 105.0000, 'alvenaria 105%');
select is((select percentual_limitado from progresso_servicos('00000000-0000-0000-0000-00000000000a') where codigo = '1.1'), 100.0000, 'limitado a 100');
select is((select avanco_fisico from progresso_obras() where obra_id = '00000000-0000-0000-0000-00000000000a'), 75.00, 'exemplo passo 2: avanço 75%');

-- 3) 100 m² de reboco → 81,25%
insert into medicoes (id, servico_id, periodo_inicio, periodo_fim, quantidade) values ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2', hoje() - 1, hoje() - 1, 100);
select enviar_medicao('00000000-0000-0000-0000-0000000000b3');
select aprovar_medicao('00000000-0000-0000-0000-0000000000b3');
select is((select avanco_fisico from progresso_obras() where obra_id = '00000000-0000-0000-0000-00000000000a'), 81.25, 'exemplo passo 3: avanço 81,25%');

-- 4) mesma alvenaria, mesmo dia e local → bloqueado
select throws_ok($$ insert into medicoes (servico_id, periodo_inicio, periodo_fim, quantidade) values ('00000000-0000-0000-0000-0000000000a1', hoje() - 2, hoje() - 2, 5) $$, 'P0001', null, 'exemplo passo 4: duplicidade');

-- R-PROG-04: serviço sem item no orçamento aprovado
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', '1.3', 'Pintura', 'm²', 400, 3);
select ok((select sem_item_orcamento and peso = 0 from progresso_servicos('00000000-0000-0000-0000-00000000000a') where codigo = '1.3'), 'R-PROG-04 serviço sem item tem peso 0');
select is((select avanco from progresso_etapas('00000000-0000-0000-0000-00000000000a')), 81.25, 'R-PROG-05 avanço da etapa');

-- RLS 2: campo vê progresso sem valores
select tests.autenticar(:'campo');
select is((select avanco_fisico from progresso_obras() where obra_id = '00000000-0000-0000-0000-00000000000a'), 81.25, 'RLS 2 campo vê o avanço da sua obra');
select throws_ok($$ select * from progresso_servicos('00000000-0000-0000-0000-00000000000b') $$, 'P0001', 'Sem acesso a esta obra.', 'RLS 2 campo não vê progresso de outra obra');
select is((select count(*)::int from v_custo_previsto_realizado), 0, 'campo não vê custos');

-- Obra B: R-PROG-03 e situações de prazo --------------------------------------
select tests.autenticar(:'gestor');
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000e2', 'A', 'Atrasado', 'un', 10, 1),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-0000000000e2', 'B', 'Início atrasado', 'un', 10, 2),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000e2', 'C', 'A iniciar', 'un', 10, 3),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-0000000000e2', 'D', 'Em risco', 'un', 10, 4),
  ('00000000-0000-0000-0000-0000000000c5', '00000000-0000-0000-0000-0000000000e2', 'E', 'No prazo', 'un', 10, 5);
select criar_revisao_cronograma('00000000-0000-0000-0000-00000000000b') as cb \gset
insert into cronograma_atividades (versao_id, servico_id, inicio_previsto, fim_previsto) values
  (:'cb', '00000000-0000-0000-0000-0000000000c1', hoje() - 10, hoje() - 1),
  (:'cb', '00000000-0000-0000-0000-0000000000c2', hoje() - 2, hoje() + 10),
  (:'cb', '00000000-0000-0000-0000-0000000000c3', hoje() + 5, hoje() + 10),
  (:'cb', '00000000-0000-0000-0000-0000000000c4', hoje() - 9, hoje()),
  (:'cb', '00000000-0000-0000-0000-0000000000c5', hoje() - 1, hoje() + 8);
select aprovar_cronograma(:'cb');
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('00000000-0000-0000-0000-0000000000c6', '00000000-0000-0000-0000-0000000000e2', 'F', 'Sem cronograma', 'un', 10, 6);

select tests.sair();
insert into medicoes (servico_id, periodo_inicio, periodo_fim, quantidade, status) values
  ('00000000-0000-0000-0000-0000000000c4', hoje() - 1, hoje() - 1, 5, 'aprovada'),
  ('00000000-0000-0000-0000-0000000000c5', hoje() - 1, hoje() - 1, 1, 'aprovada');

select tests.autenticar(:'gestor');
select results_eq(
  $$ select codigo, situacao_prazo from progresso_servicos('00000000-0000-0000-0000-00000000000b') order by codigo $$,
  $$ values ('A', 'atrasado'), ('B', 'inicio_atrasado'), ('C', 'a_iniciar'), ('D', 'em_risco'), ('E', 'no_prazo'), ('F', 'sem_cronograma') $$,
  'R-PRZ uma situação para cada caso');
select is((select peso from progresso_servicos('00000000-0000-0000-0000-00000000000b') where codigo = 'A'), round(1.0 / 6, 8), 'R-PROG-03 sem orçamento: pesos iguais');
select ok(not (select bool_or(peso_pelo_orcamento) from progresso_servicos('00000000-0000-0000-0000-00000000000b')), 'R-PROG-03 sinaliza pesos iguais');
select is((select servicos_atrasados from progresso_etapas('00000000-0000-0000-0000-00000000000b')), 2, 'R-PRZ-01 etapa com 2 serviços atrasados');
select ok(exists (select 1 from v_alertas where tipo = 'servico_atrasado' and referencia_id = '00000000-0000-0000-0000-0000000000c1'), 'R-ALE gestor recebe alerta de atraso');
select ok(exists (select 1 from v_alertas where tipo = 'servico_em_risco' and referencia_id = '00000000-0000-0000-0000-0000000000c4'), 'R-ALE gestor recebe alerta de risco');

-- Financeiro: R-FIN-02, 05, 06 --------------------------------------------------
select tests.autenticar(:'fin');
insert into pessoas (id, nome, tipo_pessoa, eh_fornecedor) values ('00000000-0000-0000-0000-0000000000f1', 'Fornecedor', 'juridica', true);
select criar_lancamento(format('{"tipo":"pagar","descricao":"Blocos","categoria_id":"%s","obra_id":"00000000-0000-0000-0000-00000000000a","etapa_id":"00000000-0000-0000-0000-0000000000e1","natureza":"material","data_competencia":"%s","valor_total":400}',
  (select id from categorias_financeiras where nome = 'Materiais'), hoje())::jsonb,
  format('[{"vencimento":"%s","valor":100},{"vencimento":"%s","valor":100},{"vencimento":"%s","valor":100},{"vencimento":"%s","valor":100}]', hoje() - 5, hoje() - 4, hoje() + 3, hoje() + 30)::jsonb) as lanc \gset
insert into baixas (parcela_id, data_pagamento, valor, juros_multa, forma)
  select id, hoje(), 100, 2, 'pix' from parcelas where lancamento_id = :'lanc' and numero = 1;
insert into baixas (parcela_id, data_pagamento, valor, forma)
  select id, hoje(), 40, 'pix' from parcelas where lancamento_id = :'lanc' and numero = 3;

select results_eq(
  format($$ select numero, situacao from v_parcelas_situacao where lancamento_id = %L order by numero $$, :'lanc'),
  $$ values (1, 'paga'), (2, 'vencida'), (3, 'parcial'), (4, 'aberta') $$,
  'R-FIN-02 situações das parcelas');
select is((select custo_realizado from v_custo_obra where obra_id = '00000000-0000-0000-0000-00000000000a'), 400.00, 'R-FIN-05 custo realizado por competência');
select is((select previsto from v_custo_previsto_realizado where obra_id = '00000000-0000-0000-0000-00000000000a' and natureza = 'material'), 30000.00, 'previsto de material');
select is((select diferenca_pct from v_custo_obra where obra_id = '00000000-0000-0000-0000-00000000000a'), -99.00, 'diferença % do custo');
select is((select saidas from v_fluxo_caixa where obra_id = '00000000-0000-0000-0000-00000000000a' and data = hoje()), 142.00, 'R-FIN-06 saídas = valor + juros');
select ok(exists (select 1 from v_alertas where tipo = 'conta_vencida'), 'R-ALE financeiro recebe conta vencida');
select ok(exists (select 1 from v_alertas where tipo = 'conta_a_vencer'), 'R-ALE financeiro recebe conta a vencer');

select * from finish();
rollback;
