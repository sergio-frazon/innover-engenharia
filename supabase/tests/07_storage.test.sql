-- Passo 9: políticas de Storage
begin;
\ir _helpers.psql
select plan(5);

select tests.criar_usuario('gestor@t.local', 'gestor') as gestor \gset
select tests.criar_usuario('gestor2@t.local', 'gestor') as gestor2 \gset
select tests.criar_usuario('campo@t.local', 'campo') as campo \gset

insert into obras (id, nome, responsavel_id) values ('00000000-0000-0000-0000-00000000000a', 'Obra A', :'gestor');
insert into obra_membros (obra_id, perfil_id) values ('00000000-0000-0000-0000-00000000000a', :'campo');

select is((select public from storage.buckets where id = 'documentos'), false, 'bucket documentos é privado');

select tests.autenticar(:'campo');
select lives_ok($$ insert into storage.objects (bucket_id, name, owner) values ('documentos', '00000000-0000-0000-0000-00000000000a/1/planta.pdf', auth.uid()) $$,
  'campo envia documento da sua obra');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('comprovantes', '00000000-0000-0000-0000-00000000000a/1/recibo.pdf', auth.uid()) $$,
  '42501', null, 'campo não envia comprovante');

select tests.autenticar(:'gestor2');
select is((select count(*)::int from storage.objects where bucket_id = 'documentos'), 0, 'membro de outra obra não lê documentos');
select throws_ok($$ insert into storage.objects (bucket_id, name, owner) values ('documentos', 'nao-e-uuid/1/x.pdf', auth.uid()) $$,
  '42501', null, 'caminho fora do padrão é recusado');

select * from finish();
rollback;
