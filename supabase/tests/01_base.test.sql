-- Passo 3: perfis, proteção de colunas, auditoria
begin;
\ir _helpers.psql
select plan(9);

select tests.criar_usuario('admin@t.local', 'admin') as admin \gset
select tests.criar_usuario('campo@t.local', 'campo', 'Zé do Campo') as campo \gset
select tests.criar_usuario('hacker@t.local', 'superusuario') as hacker \gset

select is((select papel from perfis where id = :'campo'), 'campo', 'perfil criado pelo trigger com papel do app_metadata');
select is((select nome from perfis where id = :'campo'), 'Zé do Campo', 'nome vem do user_metadata');
select is((select papel from perfis where id = :'hacker'), 'campo', 'papel inválido vira campo');

-- Usuário comum
select tests.autenticar(:'campo');
select lives_ok($$ update perfis set telefone = '11999990000' where id = auth.uid() $$, 'usuário edita o próprio telefone');
select throws_ok($$ update perfis set papel = 'admin' where id = auth.uid() $$, 'P0001', null, 'usuário não muda o próprio papel');
select is((select count(*)::int from perfis), 1, 'usuário comum só enxerga o próprio perfil');
select throws_ok($$ insert into auditoria (tabela, registro_id, acao) values ('x', '1', 'INSERT') $$, '42501', null, 'auditoria não aceita insert direto');

-- Último admin
select tests.autenticar(:'admin');
select throws_ok(format($$ update perfis set ativo = false where id = %L $$, :'admin'), 'P0001',
  'Não é possível remover o último administrador ativo.', 'último admin não pode ser desativado');

select tests.sair();
select ok(exists (select 1 from auditoria where tabela = 'perfis' and registro_id = :'campo' and acao = 'UPDATE'),
  'alteração do perfil ficou na auditoria');

select * from finish();
rollback;
