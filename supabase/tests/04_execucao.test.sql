-- Passo 6: R-DIA-*, R-MED-*, RLS itens 4 e 5, revalidação de dependência
begin;
\ir _helpers.psql
select plan(32);

select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset
select tests.criar_usuario('fin@t.local', 'financeiro') as fin \gset

insert into obras (id, nome, responsavel_id) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor');
insert into obra_membros (obra_id, perfil_id) values
  ('00000000-0000-0000-0000-00000000000a', :'campo'), ('00000000-0000-0000-0000-00000000000a', :'fin');
insert into etapas (id, obra_id, codigo, nome) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '1', 'Estrutura');
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', '1.1', 'Alvenaria', 'm²', 200),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', '1.2', 'Reboco', 'm²', 400);

-- Diário pelo campo ----------------------------------------------------------
select tests.autenticar(:'campo');
select throws_ok($$ insert into diarios (obra_id, data) values ('00000000-0000-0000-0000-00000000000a', hoje() + 1) $$, 'P0001', null, 'R-DIA-01 data futura proibida');
insert into diarios (id, obra_id, data) values ('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-00000000000a', hoje() - 1);
select throws_ok($$ insert into diarios (obra_id, data) values ('00000000-0000-0000-0000-00000000000a', hoje() - 1) $$, '23505', null, 'R-DIA-01 um diário por obra e data');
select throws_ok($$ insert into diarios (obra_id, data, status) values ('00000000-0000-0000-0000-00000000000a', hoje() - 5, 'aprovado') $$, 'P0001', null, 'não cria diário já aprovado');

select throws_ok($$ select enviar_diario('00000000-0000-0000-0000-0000000000d1') $$, 'P0001', null, 'R-DIA-07 diário vazio não é enviado');

insert into diario_equipe (diario_id, funcao, quantidade, horas) values ('00000000-0000-0000-0000-0000000000d1', 'Pedreiro', 3, 8);
insert into medicoes (id, servico_id, diario_id, quantidade, local) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 20, 'Térreo');
select is((select periodo_inicio from medicoes where id = '00000000-0000-0000-0000-0000000000b1'), hoje() - 1, 'R-MED-06 período = data do diário');
select is((select origem from medicoes where id = '00000000-0000-0000-0000-0000000000b1'), 'diario', 'origem diario');
select throws_ok($$ insert into medicoes (servico_id, diario_id, quantidade) values ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1', 5) $$, null, null, 'R-MED-05 serviço uma vez por diário');

-- R-MED-04: avulsa no mesmo período e local
select throws_ok($$ insert into medicoes (servico_id, periodo_inicio, periodo_fim, quantidade, local) values ('00000000-0000-0000-0000-0000000000a1', hoje() - 1, hoje() - 1, 20, 'térreo') $$,
  'P0001', null, 'R-MED-04 duplicidade bloqueada (local igual, sem diferenciar maiúsculas)');
select lives_ok($$ insert into medicoes (id, servico_id, periodo_inicio, periodo_fim, quantidade, local) values ('00000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000a1', hoje() - 1, hoje() - 1, 10, 'Bloco B') $$,
  'R-MED-04 local diferente é permitido');
delete from medicoes where id = '00000000-0000-0000-0000-0000000000b9';

select throws_ok($$ update medicoes set status = 'aprovada' where id = '00000000-0000-0000-0000-0000000000b1' $$, 'P0001', null, 'RLS 5 status da medição só por RPC');
select throws_ok($$ update diarios set status = 'enviado' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', null, 'RLS 5 status do diário só por RPC');
select throws_ok($$ select enviar_medicao('00000000-0000-0000-0000-0000000000b1') $$, 'P0001', null, 'R-MED-06 medição de diário não é enviada sozinha');

select lives_ok($$ select enviar_diario('00000000-0000-0000-0000-0000000000d1') $$, 'campo envia o diário');
select is((select status from medicoes where id = '00000000-0000-0000-0000-0000000000b1'), 'enviada', 'medições vão junto');

-- RLS 4: campo não edita diário enviado
select throws_ok($$ update diarios set observacoes = 'x' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', null, 'RLS 4 campo não edita diário enviado');
select throws_ok($$ insert into diario_ocorrencias (diario_id, tipo, descricao) values ('00000000-0000-0000-0000-0000000000d1', 'outro', 'x') $$, 'P0001', null, 'RLS 4 nem os filhos');
select throws_ok($$ delete from diarios where id = '00000000-0000-0000-0000-0000000000d1' $$, 'P0001', null, 'R-DIA-06 só rascunho é excluído');
select throws_ok($$ select aprovar_diario('00000000-0000-0000-0000-0000000000d1') $$, 'P0001', null, 'campo não aprova');

-- Gestor: correção e aprovação -----------------------------------------------
select tests.autenticar(:'gestor');
select throws_ok($$ select solicitar_correcao_diario('00000000-0000-0000-0000-0000000000d1', '  ') $$, 'P0001', null, 'R-DIA-05 correção exige comentário');
select solicitar_correcao_diario('00000000-0000-0000-0000-0000000000d1', 'Faltou a ocorrência da chuva');
select is((select status from medicoes where id = '00000000-0000-0000-0000-0000000000b1'), 'rascunho', 'medições voltam a rascunho');

select tests.autenticar(:'campo');
select lives_ok($$ insert into diario_ocorrencias (diario_id, tipo, descricao) values ('00000000-0000-0000-0000-0000000000d1', 'impedimento', 'Chuva às 15h') $$, 'RLS 4 campo edita diário em correção');
select enviar_diario('00000000-0000-0000-0000-0000000000d1');

select tests.autenticar(:'gestor');
select lives_ok($$ select aprovar_diario('00000000-0000-0000-0000-0000000000d1') $$, 'gestor aprova o diário');
select is((select status from medicoes where id = '00000000-0000-0000-0000-0000000000b1'), 'aprovada', 'medição aprovada junto');
select is((select data_inicio_real from servicos where id = '00000000-0000-0000-0000-0000000000a1'), hoje() - 1, 'R-MED-09 início real automático');
select lives_ok($$ update diarios set observacoes = 'Ajuste após aprovação' where id = '00000000-0000-0000-0000-0000000000d1' $$, 'R-DIA-04 gestor edita aprovado');
select throws_ok($$ update medicoes set quantidade = 1 where id = '00000000-0000-0000-0000-0000000000b1' $$, 'P0001', null, 'R-MED-07 aprovada é imutável');

-- R-MED-03: excesso -----------------------------------------------------------
insert into medicoes (id, servico_id, periodo_inicio, periodo_fim, quantidade) values
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a1', hoje(), hoje(), 190);
select throws_ok($$ select enviar_medicao('00000000-0000-0000-0000-0000000000b2') $$, 'P0001', null, 'R-MED-03 excesso sem justificativa');
update medicoes set justificativa_excesso = 'Aditivo de 10 m² no muro' where id = '00000000-0000-0000-0000-0000000000b2';
select enviar_medicao('00000000-0000-0000-0000-0000000000b2');
select aprovar_medicao('00000000-0000-0000-0000-0000000000b2');
select is((select data_fim_real from servicos where id = '00000000-0000-0000-0000-0000000000a1'), hoje(), 'R-MED-09 término real automático ao atingir 100%');
select throws_ok($$ update servicos set ativo = false where id = '00000000-0000-0000-0000-0000000000a1' $$, 'P0001', null, 'serviço com medição aprovada não é desativado');

select reabrir_medicao('00000000-0000-0000-0000-0000000000b2', 'Conferir quantidade');
select is((select data_fim_real from servicos where id = '00000000-0000-0000-0000-0000000000a1'), null, 'R-MED-09 reabrir desfaz término automático');

-- Financeiro não vê diário
select tests.autenticar(:'fin');
select is((select count(*)::int from diarios), 0, 'financeiro não lê diários');

-- Revalidação de dependência ao mudar datas (trigger adiado) -------------------
select tests.autenticar(:'gestor');
select criar_revisao_cronograma('00000000-0000-0000-0000-00000000000a') as c1 \gset
insert into cronograma_atividades (versao_id, servico_id, inicio_previsto, fim_previsto) values
  (:'c1', '00000000-0000-0000-0000-0000000000a1', '2026-01-05', '2026-01-30'),
  (:'c1', '00000000-0000-0000-0000-0000000000a2', '2026-02-02', '2026-02-20');
insert into cronograma_dependencias (versao_id, servico_id, predecessor_id) values (:'c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
set constraints all immediate;
select throws_ok(format($$ update cronograma_atividades set fim_previsto = '2026-02-10' where versao_id = %L and servico_id = '00000000-0000-0000-0000-0000000000a1' $$, :'c1'),
  'P0001', null, 'mudar datas que quebram dependência é bloqueado');

select * from finish();
rollback;
