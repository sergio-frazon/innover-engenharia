-- R-PRZ-04: salvar atividade empurrando sucessores numa única transação
begin;
\ir _helpers.psql
select plan(4);

select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset
insert into obras (id, nome, responsavel_id) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor');
insert into obra_membros values ('00000000-0000-0000-0000-00000000000a', :'campo');
insert into etapas (id, obra_id, codigo, nome) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '1', 'E');
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', '1.1', 'A', 'un', 1),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', '1.2', 'B', 'un', 1);

select tests.autenticar(:'gestor');
select criar_revisao_cronograma('00000000-0000-0000-0000-00000000000a') as c \gset
select salvar_atividade_cronograma(:'c', '00000000-0000-0000-0000-0000000000a1', '2026-01-01', '2026-01-10');
select salvar_atividade_cronograma(:'c', '00000000-0000-0000-0000-0000000000a2', '2026-01-11', '2026-01-15', array['00000000-0000-0000-0000-0000000000a1']::uuid[]);
select is((select count(*)::int from cronograma_dependencias where versao_id = :'c'), 1, 'dependência gravada');

-- Esticar A até dia 20 empurrando B (16..20 → 21..25)
select lives_ok(format($$ select salvar_atividade_cronograma(%L, '00000000-0000-0000-0000-0000000000a1', '2026-01-01', '2026-01-20', '{}',
  '[{"servico_id":"00000000-0000-0000-0000-0000000000a2","inicio":"2026-01-21","fim":"2026-01-25"}]') $$, :'c'), 'salva em lote');
set constraints all immediate;
select is((select inicio_previsto from cronograma_atividades where versao_id = :'c' and servico_id = '00000000-0000-0000-0000-0000000000a2'), '2026-01-21'::date, 'sucessor empurrado');

select tests.autenticar(:'campo');
select throws_ok(format($$ select salvar_atividade_cronograma(%L, '00000000-0000-0000-0000-0000000000a1', '2026-01-01', '2026-01-05') $$, :'c'),
  null, null, 'campo não edita cronograma');

select * from finish();
rollback;
