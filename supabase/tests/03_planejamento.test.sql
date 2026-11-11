-- Passo 5: R-VER-*, R-ORC-01, R-PRZ-03, R-DOC-01, RLS item 9
begin;
\ir _helpers.psql
select plan(24);

select tests.criar_usuario('admin@t.local', 'admin') as admin \gset
select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset
select tests.criar_usuario('fin@t.local', 'financeiro') as fin \gset

insert into obras (id, nome, responsavel_id) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor');
insert into obra_membros (obra_id, perfil_id) values
  ('00000000-0000-0000-0000-00000000000a', :'campo'),
  ('00000000-0000-0000-0000-00000000000a', :'fin');

select tests.autenticar(:'gestor');
insert into etapas (id, obra_id, codigo, nome, ordem) values ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000a', '1', 'Estrutura', 1);
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000e1', '1.1', 'Alvenaria', 'm²', 200, 1),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000e1', '1.2', 'Reboco', 'm²', 400, 2);
select is((select obra_id from servicos where id = '00000000-0000-0000-0000-0000000000a1'), '00000000-0000-0000-0000-00000000000a'::uuid, 'obra do serviço vem da etapa');

-- Orçamento v1 ---------------------------------------------------------------
select criar_revisao_orcamento('00000000-0000-0000-0000-00000000000a', 'Inicial') as v1 \gset
select is((select numero from orcamento_versoes where id = :'v1'), 1, 'R-VER-04 primeira versão é a nº 1');
select is((select status from orcamento_versoes where id = :'v1'), 'rascunho', 'nasce rascunho');
select throws_ok($$ select criar_revisao_orcamento('00000000-0000-0000-0000-00000000000a') $$, 'P0001', null, 'R-VER-02 só um rascunho por obra');
select throws_ok(format($$ select aprovar_orcamento(%L) $$, :'v1'), 'P0001', null, 'não aprova orçamento vazio');

insert into orcamento_itens (versao_id, servico_id, natureza, descricao, unidade, quantidade, valor_unitario) values
  (:'v1', '00000000-0000-0000-0000-0000000000a1', 'material', 'Bloco cerâmico', 'un', 2500, 1.333),
  (:'v1', '00000000-0000-0000-0000-0000000000a1', 'mao_de_obra', 'Pedreiro', 'm²', 200, 133.34),
  (:'v1', '00000000-0000-0000-0000-0000000000a2', 'mao_de_obra', 'Reboco', 'm²', 400, 25);
select is((select valor_total from orcamento_itens where descricao = 'Bloco cerâmico'), 3325.00::numeric, 'R-ORC-01 valor unitário 1,333 grava 1,33; total = 2500 × 1,33');

select throws_ok(format($$ update orcamento_versoes set status = 'aprovada' where id = %L $$, :'v1'), 'P0001', null, 'status não muda por update direto');

select lives_ok(format($$ select aprovar_orcamento(%L) $$, :'v1'), 'gestor aprova v1');
select is((select status from orcamento_versoes where id = :'v1'), 'aprovada', 'v1 aprovada');
select is((select aprovada_por from orcamento_versoes where id = :'v1'), :'gestor'::uuid, 'registra quem aprovou');

-- RLS 9 / R-VER-03: nem admin altera item aprovado
select tests.autenticar(:'admin');
select throws_ok(format($$ update orcamento_itens set quantidade = 1 where versao_id = %L $$, :'v1'), 'P0001',
  'Esta versão está aprovada e não pode ser alterada. Crie uma revisão.', 'R-VER-03 item de versão aprovada é imutável (admin)');
select throws_ok(format($$ delete from orcamento_itens where versao_id = %L $$, :'v1'), 'P0001', null, 'R-VER-03 nem apagar');

-- Revisão v2 -----------------------------------------------------------------
select tests.autenticar(:'gestor');
select criar_revisao_orcamento('00000000-0000-0000-0000-00000000000a', 'Revisão') as v2 \gset
select is((select count(*)::int from orcamento_itens where versao_id = :'v2'), 3, 'R-VER-04 revisão copia os itens');
update orcamento_itens set valor_unitario = 30 where versao_id = :'v2' and descricao = 'Reboco';
select aprovar_orcamento(:'v2');
select is((select status from orcamento_versoes where id = :'v1'), 'substituida', 'R-VER-05 anterior vira substituída');
select is((select sum(valor_total) from orcamento_itens where versao_id = :'v1'), 3325.00 + 26668.00 + 10000.00, 'v1 continua intacta');

select criar_revisao_orcamento('00000000-0000-0000-0000-00000000000a') as v3 \gset
select lives_ok(format($$ select descartar_rascunho_orcamento(%L) $$, :'v3'), 'R-VER-08 rascunho pode ser descartado');
select throws_ok(format($$ select descartar_rascunho_orcamento(%L) $$, :'v2'), 'P0001', null, 'R-VER-08 aprovada não pode ser descartada');

-- Permissões de orçamento
select tests.autenticar(:'campo');
select is((select count(*)::int from orcamento_itens), 0, 'campo não lê itens de orçamento');
select throws_ok($$ select criar_revisao_orcamento('00000000-0000-0000-0000-00000000000a') $$, 'P0001', null, 'campo não cria versão');
select tests.autenticar(:'fin');
select ok((select count(*) from orcamento_itens) > 0, 'financeiro lê itens de orçamento');

-- Cronograma -----------------------------------------------------------------
select tests.autenticar(:'gestor');
select criar_revisao_cronograma('00000000-0000-0000-0000-00000000000a') as c1 \gset
insert into cronograma_atividades (versao_id, servico_id, inicio_previsto, fim_previsto) values
  (:'c1', '00000000-0000-0000-0000-0000000000a1', '2026-01-05', '2026-01-30'),
  (:'c1', '00000000-0000-0000-0000-0000000000a2', '2026-01-20', '2026-02-20');
select throws_ok(format($$ insert into cronograma_dependencias (versao_id, servico_id, predecessor_id) values (%L, '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1') $$, :'c1'),
  'P0001', null, 'R-PRZ-03 sucessor precisa começar depois do término');
update cronograma_atividades set inicio_previsto = '2026-01-31' where versao_id = :'c1' and servico_id = '00000000-0000-0000-0000-0000000000a2';
insert into cronograma_dependencias (versao_id, servico_id, predecessor_id) values (:'c1', '00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000a1');
select throws_ok(format($$ insert into cronograma_dependencias (versao_id, servico_id, predecessor_id) values (%L, '00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000a2') $$, :'c1'),
  'P0001', 'Esta dependência criaria um ciclo no cronograma.', 'R-PRZ-03 ciclo proibido');

-- R-VER-07
insert into servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista) values
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-0000000000e1', '1.3', 'Pintura', 'm²', 400);
select throws_ok(format($$ select aprovar_cronograma(%L) $$, :'c1'), 'P0001', null, 'R-VER-07 todos os serviços precisam de datas');

-- Documentos -----------------------------------------------------------------
select tests.autenticar(:'campo');
insert into documentos (obra_id, grupo_id, titulo, categoria, caminho_arquivo, nome_arquivo, tipo_mime, tamanho_bytes)
values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'Planta baixa', 'planta', 'x/1.pdf', '1.pdf', 'application/pdf', 100);
insert into documentos (obra_id, grupo_id, titulo, categoria, caminho_arquivo, nome_arquivo, tipo_mime, tamanho_bytes)
values ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-0000000000d1', 'Planta baixa', 'planta', 'x/2.pdf', '2.pdf', 'application/pdf', 100);
select is((select versao from v_documentos_atuais where grupo_id = '00000000-0000-0000-0000-0000000000d1'), 2, 'R-DOC-01 nova versão = max + 1');

select * from finish();
rollback;
