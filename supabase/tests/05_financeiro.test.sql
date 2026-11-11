-- Passo 7: R-FIN-01..08, RLS itens 1 e 6
begin;
\ir _helpers.psql
select plan(20);

select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset
select tests.criar_usuario('fin@t.local', 'financeiro') as fin \gset

insert into obras (id, nome, responsavel_id) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor');
insert into obra_membros (obra_id, perfil_id) values
  ('00000000-0000-0000-0000-00000000000a', :'campo'), ('00000000-0000-0000-0000-00000000000a', :'fin');
insert into etapas (id, obra_id, codigo, nome) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '1', 'Estrutura');
insert into pessoas (id, nome, tipo_pessoa, eh_fornecedor) values ('00000000-0000-0000-0000-0000000000f1', 'Casa do Construtor', 'juridica', true);
insert into pessoas (id, nome, tipo_pessoa, eh_cliente) values ('00000000-0000-0000-0000-0000000000c1', 'Cliente X', 'juridica', true);

select id as cat_mat from categorias_financeiras where nome = 'Materiais' \gset
select id as cat_rec from categorias_financeiras where nome = 'Medição de contrato' \gset

select tests.autenticar(:'fin');

select throws_ok(format($$ select criar_lancamento('{"tipo":"pagar","descricao":"Cimento","categoria_id":"%s","obra_id":"00000000-0000-0000-0000-00000000000a","natureza":"material","data_competencia":"2026-11-01","valor_total":1000}', '[{"vencimento":"2026-12-01","valor":400},{"vencimento":"2027-01-01","valor":500}]') $$, :'cat_mat'),
  'P0001', 'A soma das parcelas (R$ 900,00) é diferente do valor total (R$ 1.000,00).', 'R-FIN-01 soma das parcelas = total');

select throws_ok(format($$ select criar_lancamento('{"tipo":"pagar","descricao":"Cimento","categoria_id":"%s","obra_id":"00000000-0000-0000-0000-00000000000a","natureza":"material","data_competencia":"2026-11-01","valor_total":100}', '[{"vencimento":"2026-12-01","valor":100}]') $$, :'cat_rec'),
  'P0001', null, 'R-FIN-07 categoria incompatível');

select throws_ok(format($$ select criar_lancamento('{"tipo":"pagar","descricao":"Cimento","categoria_id":"%s","obra_id":"00000000-0000-0000-0000-00000000000a","data_competencia":"2026-11-01","valor_total":100}', '[{"vencimento":"2026-12-01","valor":100}]') $$, :'cat_mat'),
  'P0001', null, 'R-FIN-08 natureza obrigatória em despesa de obra');

select throws_ok(format($$ select criar_lancamento('{"tipo":"pagar","descricao":"Cimento","categoria_id":"%s","pessoa_id":"00000000-0000-0000-0000-0000000000c1","data_competencia":"2026-11-01","valor_total":100}', '[{"vencimento":"2026-12-01","valor":100}]') $$, :'cat_mat'),
  'P0001', null, 'conta a pagar exige fornecedor/prestador');

select criar_lancamento(format('{"tipo":"pagar","descricao":"Cimento","categoria_id":"%s","obra_id":"00000000-0000-0000-0000-00000000000a","etapa_id":"00000000-0000-0000-0000-0000000000e1","natureza":"material","pessoa_id":"00000000-0000-0000-0000-0000000000f1","data_competencia":"2026-11-01","valor_total":1000}', :'cat_mat')::jsonb,
  '[{"vencimento":"2027-01-01","valor":333.34},{"vencimento":"2026-12-01","valor":333.33},{"vencimento":"2027-02-01","valor":333.33}]') as lanc \gset

select is((select count(*)::int from parcelas where lancamento_id = :'lanc'), 3, '3 parcelas criadas');
select is((select vencimento from parcelas where lancamento_id = :'lanc' and numero = 1), '2026-12-01'::date, 'parcelas numeradas por vencimento');

select id as p1 from parcelas where lancamento_id = :'lanc' and numero = 1 \gset
select id as p2 from parcelas where lancamento_id = :'lanc' and numero = 2 \gset

update parcelas set valor = 1 where id = :'p1';
select is((select valor from parcelas where id = :'p1'), 333.33, 'parcelas não mudam por update direto (RLS)');
select throws_ok(format($$ update lancamentos set valor_total = 1 where id = %L $$, :'lanc'), 'P0001', null, 'valor total só muda por RPC');

-- Baixas
insert into baixas (id, parcela_id, data_pagamento, valor, forma) values ('00000000-0000-0000-0000-0000000000b1', :'p1', hoje(), 200, 'pix');
select throws_ok(format($$ insert into baixas (parcela_id, data_pagamento, valor, desconto, forma) values (%L, hoje(), 130, 10, 'pix') $$, :'p1'),
  'P0001', 'O valor ultrapassa o saldo da parcela (saldo de R$ 133,33).', 'R-FIN-03 não paga além do saldo (desconto conta)');
select lives_ok(format($$ insert into baixas (parcela_id, data_pagamento, valor, desconto, juros_multa, forma) values (%L, hoje(), 130, 3.33, 5, 'pix') $$, :'p1'),
  'R-FIN-03 quita com desconto; juros não contam');
select throws_ok(format($$ insert into baixas (parcela_id, data_pagamento, valor, forma) values (%L, hoje() + 1, 10, 'pix') $$, :'p2'), 'P0001', null, 'pagamento futuro proibido');
delete from baixas where id = '00000000-0000-0000-0000-0000000000b1';
select ok(exists (select 1 from baixas where id = '00000000-0000-0000-0000-0000000000b1'), 'R-FIN-04 baixa não é excluída');
select throws_ok($$ update baixas set valor = 1 where id = '00000000-0000-0000-0000-0000000000b1' $$, 'P0001', null, 'baixa não é alterada');

select throws_ok(format($$ select cancelar_lancamento(%L, 'erro') $$, :'lanc'), 'P0001', null, 'R-FIN-04 não cancela com baixa ativa');
select atualizar_parcelas(:'lanc', '[{"vencimento":"2026-12-15","valor":500}]');
select is((select valor_total from lancamentos where id = :'lanc'), 833.33, 'parcela paga é mantida ao trocar as demais');

select lives_ok(format($$ select atualizar_parcelas(%L, '[{"vencimento":"2026-12-15","valor":500},{"vencimento":"2027-01-15","valor":500}]') $$, :'lanc'), 'troca parcelas sem baixa');
select is((select valor_total from lancamentos where id = :'lanc'), 1333.33, 'valor total = soma das parcelas (1 paga + 2 novas)');

-- Lançamento sem obra
select criar_lancamento(format('{"tipo":"pagar","descricao":"Aluguel escritório","categoria_id":"%s","data_competencia":"2026-11-01","valor_total":2000}',
  (select id from categorias_financeiras where nome = 'Administrativo'))::jsonb, '[{"vencimento":"2026-11-10","valor":2000}]') as adm \gset

-- RLS
select tests.autenticar(:'gestor');
select is((select count(*)::int from lancamentos), 1, 'RLS 6 gestor vê só lançamentos da obra, não os sem obra');
select throws_ok(format($$ select cancelar_lancamento(%L, 'x') $$, :'adm'), 'P0001', null, 'gestor não edita financeiro');

select tests.autenticar(:'campo');
select is((select count(*)::int from lancamentos) + (select count(*)::int from parcelas) + (select count(*)::int from baixas), 0, 'RLS 1 campo não vê financeiro');

select * from finish();
rollback;
