-- Passo 4: obras, membros, R-OBR-01..04, RLS itens 3 e 7
begin;
\ir _helpers.psql
select plan(14);

select tests.criar_usuario('admin@t.local', 'admin') as admin \gset
select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('gestor2@t.local', 'gestor') as gestor2 \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset
select tests.criar_usuario('inativo@t.local', 'gestor') as inativo \gset
update perfis set ativo = false where id = :'inativo';

insert into pessoas (id, nome, tipo_pessoa, eh_cliente) values ('00000000-0000-0000-0000-0000000000c1', 'Cliente X', 'juridica', true);
insert into pessoas (id, nome, tipo_pessoa, eh_fornecedor) values ('00000000-0000-0000-0000-0000000000f1', 'Fornecedor Y', 'juridica', true);

-- Gestor cria obra
select tests.autenticar(:'gestor');
insert into obras (id, nome, responsavel_id, cliente_id) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor', '00000000-0000-0000-0000-0000000000c1');
select matches((select codigo from obras where id = '00000000-0000-0000-0000-00000000000a'), '^OB-[0-9]{4}-001$', 'código automático OB-ano-001');
select ok(exists (select 1 from obra_membros where obra_id = '00000000-0000-0000-0000-00000000000a' and perfil_id = :'gestor'), 'R-OBR-01 criador vira membro');

select throws_ok(format($$ insert into obras (nome, responsavel_id) values ('Obra Z', %L) $$, :'campo'), 'P0001', null, 'R-OBR-02 responsável precisa ser gestor/admin');
select throws_ok($$ insert into obras (nome, responsavel_id, cliente_id) values ('Obra Z', auth.uid(), '00000000-0000-0000-0000-0000000000f1') $$, 'P0001', null, 'cliente precisa ser eh_cliente');

insert into obra_membros (obra_id, perfil_id) values ('00000000-0000-0000-0000-00000000000a', :'campo');
update obras set situacao = 'em_andamento' where id = '00000000-0000-0000-0000-00000000000a';
select is((select data_inicio_real from obras where id = '00000000-0000-0000-0000-00000000000a'), hoje(), 'R-OBR-04 início real preenchido');

select throws_ok(format($$ delete from obra_membros where obra_id = '00000000-0000-0000-0000-00000000000a' and perfil_id = %L $$, :'gestor'), 'P0001', null, 'responsável não pode ser removido');

-- Gestor 2 cria obra C
select tests.autenticar(:'gestor2');
insert into obras (id, nome, responsavel_id) values ('00000000-0000-0000-0000-00000000000c', 'Obra C', :'gestor2');
select is((select count(*)::int from obras), 1, 'RLS 3: gestor2 só vê a própria obra');

select tests.autenticar(:'gestor');
select is((select count(*)::int from obras where id = '00000000-0000-0000-0000-00000000000c'), 0, 'RLS 3: gestor não vê obra C');

-- Campo
select tests.autenticar(:'campo');
select is((select count(*)::int from obras), 1, 'campo vê só a obra de que é membro');
select is((select count(*)::int from pessoas), 0, 'campo não lê pessoas');
select is((select count(*)::int from v_pessoas_basico), 2, 'campo lê nomes via v_pessoas_basico');
select is((select count(*)::int from perfis), 2, 'campo vê colegas da obra (ele e o gestor)');

-- Inativo
select tests.autenticar(:'inativo');
select is((select count(*)::int from obras), 0, 'RLS 7: inativo não lê nada');

-- R-OBR-03
select tests.autenticar(:'gestor');
update obras set situacao = 'concluida' where id = '00000000-0000-0000-0000-00000000000a';
select throws_ok($$ update obras set nome = 'X' where id = '00000000-0000-0000-0000-00000000000a' $$, 'P0001', null, 'R-OBR-03 obra concluída é somente leitura');

select * from finish();
rollback;
