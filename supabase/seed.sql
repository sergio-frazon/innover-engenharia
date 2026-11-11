-- =============================================================================
-- SEED DE DESENVOLVIMENTO — SOMENTE LOCAL. NUNCA RODAR EM PRODUÇÃO.
-- Aplicado por `npx supabase db reset`. Datas relativas a hoje() para que atrasos,
-- vencimentos e pendências sempre apareçam.
--
-- Usuários de teste (todos com a mesma senha de teste: Teste@2026)
--   admin@teste.local       admin       todas as obras
--   gestor@teste.local      gestor      obras A e B
--   gestor2@teste.local     gestor      obra C
--   campo@teste.local       campo       obra A
--   financeiro@teste.local  financeiro  obras A e B
--   inativo@teste.local     gestor      desativado (não entra)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Usuários
-- -----------------------------------------------------------------------------
do $$
declare
  u record;
begin
  for u in
    select * from (values
      ('10000000-0000-0000-0000-000000000001'::uuid, 'admin@teste.local',      'Ana Administradora', 'admin'),
      ('10000000-0000-0000-0000-000000000002'::uuid, 'gestor@teste.local',     'Gustavo Engenheiro', 'gestor'),
      ('10000000-0000-0000-0000-000000000003'::uuid, 'gestor2@teste.local',    'Gabriela Engenheira', 'gestor'),
      ('10000000-0000-0000-0000-000000000004'::uuid, 'campo@teste.local',      'Carlos Encarregado', 'campo'),
      ('10000000-0000-0000-0000-000000000005'::uuid, 'financeiro@teste.local', 'Fernanda Financeiro', 'financeiro'),
      ('10000000-0000-0000-0000-000000000006'::uuid, 'inativo@teste.local',    'Ivo Inativo', 'gestor')
    ) as t (id, email, nome, papel)
  loop
    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, email_change, email_change_token_new, recovery_token)
    values ('00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email,
            extensions.crypt('Teste@2026', extensions.gen_salt('bf')), now(),
            jsonb_build_object('provider', 'email', 'providers', array['email'], 'papel', u.papel),
            jsonb_build_object('nome', u.nome), now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), u.id, u.id::text,
            jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
            'email', now(), now(), now());
  end loop;
end;
$$;

update public.perfis set telefone = '(11) 98888-0002' where id = '10000000-0000-0000-0000-000000000002';
update public.perfis set ativo = false where id = '10000000-0000-0000-0000-000000000006';
update auth.users set banned_until = now() + interval '100 years' where id = '10000000-0000-0000-0000-000000000006';

-- -----------------------------------------------------------------------------
-- Cadastros
-- -----------------------------------------------------------------------------
insert into public.pessoas (id, nome, tipo_pessoa, documento, eh_cliente, eh_fornecedor, eh_prestador, email, telefone) values
  ('20000000-0000-0000-0000-000000000001', 'Construtora Horizonte Ltda', 'juridica', '11222333000181', true, false, false, 'contato@horizonte.test', '(11) 3333-1001'),
  ('20000000-0000-0000-0000-000000000002', 'Roberto Almeida', 'fisica', '12345678909', true, false, false, 'roberto@email.test', '(11) 97777-2002'),
  ('20000000-0000-0000-0000-000000000003', 'Concreteira Forte', 'juridica', '44555666000181', false, true, false, 'vendas@concreteira.test', '(11) 3333-1003'),
  ('20000000-0000-0000-0000-000000000004', 'Aço & Ferro Distribuidora', 'juridica', '77888999000181', false, true, false, 'pedidos@acoferro.test', '(11) 3333-1004'),
  ('20000000-0000-0000-0000-000000000005', 'Empreiteira Mãos à Obra', 'juridica', '12312312000110', false, false, true, 'contato@maosaobra.test', '(11) 3333-1005'),
  ('20000000-0000-0000-0000-000000000006', 'Loca Máquinas', 'juridica', '45645645000110', false, true, true, 'locacao@locamaq.test', '(11) 3333-1006'),
  ('20000000-0000-0000-0000-000000000007', 'Imobiliária Prisma', 'juridica', '78978978000110', false, true, false, 'aluguel@prisma.test', '(11) 3333-1007');

insert into public.materiais (id, descricao, unidade, custo_unitario) values
  ('30000000-0000-0000-0000-000000000001', 'Concreto usinado fck 25', 'm³', 520.00),
  ('30000000-0000-0000-0000-000000000002', 'Aço CA-50', 'kg', 9.80),
  ('30000000-0000-0000-0000-000000000003', 'Bloco cerâmico 14x19x29', 'un', 2.90),
  ('30000000-0000-0000-0000-000000000004', 'Argamassa de assentamento', 'm²', 12.00),
  ('30000000-0000-0000-0000-000000000005', 'Cimento CP-II 50 kg', 'un', 38.00),
  ('30000000-0000-0000-0000-000000000006', 'Tinta acrílica 18 L', 'un', 320.00);

insert into public.profissionais (id, nome, funcao, vinculo, empresa_id, telefone) values
  ('40000000-0000-0000-0000-000000000001', 'José Pereira', 'Pedreiro', 'proprio', null, '(11) 96666-0001'),
  ('40000000-0000-0000-0000-000000000002', 'Marcos Lima', 'Pedreiro', 'proprio', null, null),
  ('40000000-0000-0000-0000-000000000003', 'Antônio Souza', 'Servente', 'proprio', null, null),
  ('40000000-0000-0000-0000-000000000004', 'Paulo Santos', 'Armador', 'terceirizado', '20000000-0000-0000-0000-000000000005', null),
  ('40000000-0000-0000-0000-000000000005', 'Ricardo Melo', 'Carpinteiro', 'terceirizado', '20000000-0000-0000-0000-000000000005', null);

insert into public.equipamentos (id, descricao, propriedade, identificacao) values
  ('50000000-0000-0000-0000-000000000001', 'Betoneira 400 L', 'proprio', 'BT-01'),
  ('50000000-0000-0000-0000-000000000002', 'Retroescavadeira', 'alugado', 'ABC-1D23'),
  ('50000000-0000-0000-0000-000000000003', 'Andaime fachadeiro (lote)', 'alugado', null);

-- -----------------------------------------------------------------------------
-- Obras
-- -----------------------------------------------------------------------------
insert into public.obras (id, codigo, nome, cliente_id, endereco, cidade, uf, responsavel_id,
                          data_inicio_prevista, data_fim_prevista, situacao, descricao, criado_por) values
  ('60000000-0000-0000-0000-00000000000a', 'OB-2026-001', 'Residencial Jardim das Flores', '20000000-0000-0000-0000-000000000001',
   'Rua das Acácias, 120', 'São Paulo', 'SP', '10000000-0000-0000-0000-000000000002',
   hoje() - 45, hoje() + 50, 'em_andamento', 'Sobrado residencial de dois pavimentos, 180 m².', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000b', 'OB-2026-002', 'Reforma Comercial Centro', '20000000-0000-0000-0000-000000000002',
   'Av. Central, 900', 'Campinas', 'SP', '10000000-0000-0000-0000-000000000002',
   hoje() + 15, hoje() + 90, 'planejamento', 'Reforma de loja térrea com troca de piso e fachada.', '10000000-0000-0000-0000-000000000001'),
  ('60000000-0000-0000-0000-00000000000c', 'OB-2026-003', 'Galpão Industrial Norte', '20000000-0000-0000-0000-000000000001',
   'Rod. dos Bandeirantes, km 80', 'Jundiaí', 'SP', '10000000-0000-0000-0000-000000000003',
   hoje() - 20, hoje() + 120, 'em_andamento', 'Galpão pré-moldado de 1.200 m².', '10000000-0000-0000-0000-000000000003');

update public.obras set data_inicio_real = hoje() - 45 where id = '60000000-0000-0000-0000-00000000000a';
update public.obras set data_inicio_real = hoje() - 20 where id = '60000000-0000-0000-0000-00000000000c';

insert into public.obra_membros (obra_id, perfil_id) values
  ('60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000004'),
  ('60000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-000000000005'),
  ('60000000-0000-0000-0000-00000000000b', '10000000-0000-0000-0000-000000000005')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Obra A — planejamento completo
-- -----------------------------------------------------------------------------
insert into public.etapas (id, obra_id, codigo, nome, ordem, responsavel_id) values
  ('61000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-00000000000a', '1', 'Fundação', 1, '10000000-0000-0000-0000-000000000002'),
  ('61000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-00000000000a', '2', 'Estrutura', 2, '10000000-0000-0000-0000-000000000002'),
  ('61000000-0000-0000-0000-000000000003', '60000000-0000-0000-0000-00000000000a', '3', 'Alvenaria e revestimento', 3, '10000000-0000-0000-0000-000000000004'),
  ('61000000-0000-0000-0000-000000000004', '60000000-0000-0000-0000-00000000000a', '4', 'Acabamento', 4, '10000000-0000-0000-0000-000000000004');

insert into public.servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem, responsavel_id) values
  ('62000000-0000-0000-0000-000000000011', '61000000-0000-0000-0000-000000000001', '1.1', 'Escavação de sapatas', 'm³', 40, 1, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000012', '61000000-0000-0000-0000-000000000001', '1.2', 'Concreto das sapatas', 'm³', 25, 2, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000021', '61000000-0000-0000-0000-000000000002', '2.1', 'Pilares e vigas', 'm³', 30, 1, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000022', '61000000-0000-0000-0000-000000000002', '2.2', 'Laje', 'm²', 180, 2, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000031', '61000000-0000-0000-0000-000000000003', '3.1', 'Alvenaria de vedação', 'm²', 420, 1, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000032', '61000000-0000-0000-0000-000000000003', '3.2', 'Chapisco e reboco', 'm²', 840, 2, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000041', '61000000-0000-0000-0000-000000000004', '4.1', 'Contrapiso', 'm²', 180, 1, '10000000-0000-0000-0000-000000000004'),
  ('62000000-0000-0000-0000-000000000042', '61000000-0000-0000-0000-000000000004', '4.2', 'Pintura', 'm²', 840, 2, '10000000-0000-0000-0000-000000000004');

-- Orçamento v1 (substituída) e v2 (aprovada)
insert into public.orcamento_versoes (id, obra_id, numero, descricao, criado_por) values
  ('63000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-00000000000a', 1, 'Orçamento inicial', '10000000-0000-0000-0000-000000000002');

insert into public.orcamento_itens (versao_id, servico_id, natureza, descricao, material_id, unidade, quantidade, valor_unitario, ordem)
select '63000000-0000-0000-0000-000000000001', servico_id::uuid, natureza, descricao, material_id::uuid, unidade, quantidade, valor_unitario, ordem
from (values
  ('62000000-0000-0000-0000-000000000011', 'mao_de_obra', 'Escavação manual', null, 'm³', 40, 85.00, 1),
  ('62000000-0000-0000-0000-000000000011', 'equipamento', 'Retroescavadeira', null, 'h', 16, 220.00, 2),
  ('62000000-0000-0000-0000-000000000012', 'material', 'Concreto usinado fck 25', '30000000-0000-0000-0000-000000000001', 'm³', 25, 520.00, 1),
  ('62000000-0000-0000-0000-000000000012', 'mao_de_obra', 'Lançamento e adensamento', null, 'm³', 25, 180.00, 2),
  ('62000000-0000-0000-0000-000000000021', 'material', 'Concreto usinado fck 25', '30000000-0000-0000-0000-000000000001', 'm³', 30, 540.00, 1),
  ('62000000-0000-0000-0000-000000000021', 'material', 'Aço CA-50', '30000000-0000-0000-0000-000000000002', 'kg', 2400, 8.90, 2),
  ('62000000-0000-0000-0000-000000000021', 'mao_de_obra', 'Forma, armação e concretagem', null, 'm³', 30, 650.00, 3),
  ('62000000-0000-0000-0000-000000000022', 'material', 'Laje treliçada', null, 'm²', 180, 95.00, 1),
  ('62000000-0000-0000-0000-000000000022', 'mao_de_obra', 'Montagem da laje', null, 'm²', 180, 60.00, 2),
  ('62000000-0000-0000-0000-000000000031', 'material', 'Bloco cerâmico 14x19x29', '30000000-0000-0000-0000-000000000003', 'un', 5300, 2.90, 1),
  ('62000000-0000-0000-0000-000000000031', 'material', 'Argamassa de assentamento', '30000000-0000-0000-0000-000000000004', 'm²', 420, 12.00, 2),
  ('62000000-0000-0000-0000-000000000031', 'mao_de_obra', 'Assentamento', null, 'm²', 420, 45.00, 3),
  ('62000000-0000-0000-0000-000000000032', 'material', 'Argamassa de reboco', null, 'm²', 840, 9.00, 1),
  ('62000000-0000-0000-0000-000000000032', 'mao_de_obra', 'Chapisco e reboco', null, 'm²', 840, 28.00, 2),
  ('62000000-0000-0000-0000-000000000041', 'material', 'Argamassa de contrapiso', null, 'm²', 180, 30.00, 1),
  ('62000000-0000-0000-0000-000000000041', 'mao_de_obra', 'Execução do contrapiso', null, 'm²', 180, 25.00, 2),
  ('62000000-0000-0000-0000-000000000042', 'material', 'Tinta e massa', null, 'm²', 840, 12.00, 1),
  ('62000000-0000-0000-0000-000000000042', 'mao_de_obra', 'Pintura', null, 'm²', 840, 18.00, 2)
) as t (servico_id, natureza, descricao, material_id, unidade, quantidade, valor_unitario, ordem);

update public.orcamento_versoes set status = 'aprovada', aprovada_por = '10000000-0000-0000-0000-000000000002', aprovada_em = now() - interval '50 days'
 where id = '63000000-0000-0000-0000-000000000001';

insert into public.orcamento_versoes (id, obra_id, numero, descricao, criado_por) values
  ('63000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-00000000000a', 2, 'Reajuste do aço', '10000000-0000-0000-0000-000000000002');
insert into public.orcamento_itens (versao_id, servico_id, natureza, descricao, material_id, unidade, quantidade, valor_unitario, ordem)
select '63000000-0000-0000-0000-000000000002', servico_id, natureza, descricao, material_id, unidade, quantidade,
       case when descricao = 'Aço CA-50' then 9.80 else valor_unitario end, ordem
  from public.orcamento_itens where versao_id = '63000000-0000-0000-0000-000000000001';

update public.orcamento_versoes set status = 'substituida' where id = '63000000-0000-0000-0000-000000000001';
update public.orcamento_versoes set status = 'aprovada', aprovada_por = '10000000-0000-0000-0000-000000000002', aprovada_em = now() - interval '30 days'
 where id = '63000000-0000-0000-0000-000000000002';

-- Cronograma aprovado
insert into public.cronograma_versoes (id, obra_id, numero, descricao, criado_por) values
  ('64000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-00000000000a', 1, 'Cronograma base', '10000000-0000-0000-0000-000000000002');
insert into public.cronograma_atividades (versao_id, servico_id, inicio_previsto, fim_previsto) values
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000011', hoje() - 45, hoje() - 38),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000012', hoje() - 37, hoje() - 30),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000021', hoje() - 29, hoje() - 12),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000022', hoje() - 15, hoje() - 3),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000031', hoje() - 10, hoje() + 15),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000032', hoje() + 5, hoje() + 35),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000041', hoje() + 16, hoje() + 25),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000042', hoje() + 36, hoje() + 50);
insert into public.cronograma_dependencias (versao_id, servico_id, predecessor_id) values
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000012', '62000000-0000-0000-0000-000000000011'),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000021', '62000000-0000-0000-0000-000000000012'),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000041', '62000000-0000-0000-0000-000000000022'),
  ('64000000-0000-0000-0000-000000000001', '62000000-0000-0000-0000-000000000042', '62000000-0000-0000-0000-000000000032');
update public.cronograma_versoes set status = 'aprovada', aprovada_por = '10000000-0000-0000-0000-000000000002', aprovada_em = now() - interval '46 days'
 where id = '64000000-0000-0000-0000-000000000001';

-- -----------------------------------------------------------------------------
-- Obra A — diários e medições
-- -----------------------------------------------------------------------------
do $$
declare
  d record;
  v_diario uuid;
  v_campo uuid := '10000000-0000-0000-0000-000000000004';
  v_gestor uuid := '10000000-0000-0000-0000-000000000002';
begin
  for d in
    select * from (values
      (-44, 'aprovado',            '62000000-0000-0000-0000-000000000011', 20::numeric, 'Escavação das sapatas do eixo A.', null::text),
      (-40, 'aprovado',            '62000000-0000-0000-0000-000000000011', 20, 'Escavação das sapatas do eixo B.', null),
      (-36, 'aprovado',            '62000000-0000-0000-0000-000000000012', 12, 'Concretagem das sapatas do eixo A.', null),
      (-32, 'aprovado',            '62000000-0000-0000-0000-000000000012', 13, 'Concretagem das sapatas do eixo B.', null),
      (-25, 'aprovado',            '62000000-0000-0000-0000-000000000021', 15, 'Pilares do térreo.', null),
      (-18, 'aprovado',            '62000000-0000-0000-0000-000000000021', 15, 'Vigas do térreo.', null),
      (-12, 'aprovado',            '62000000-0000-0000-0000-000000000022', 72, 'Montagem da laje, metade norte.', null),
      (-8,  'aprovado',            '62000000-0000-0000-0000-000000000031', 60, 'Alvenaria do térreo, paredes externas.', null),
      (-5,  'aprovado',            '62000000-0000-0000-0000-000000000022', 72, 'Montagem da laje, metade sul.', null),
      (-3,  'aprovado',            '62000000-0000-0000-0000-000000000031', 66, 'Alvenaria do térreo, paredes internas.', null),
      (-2,  'enviado',             '62000000-0000-0000-0000-000000000031', 40, 'Alvenaria do pavimento superior.', null),
      (-1,  'correcao_solicitada', '62000000-0000-0000-0000-000000000031', 30, 'Alvenaria do pavimento superior.', 'Informe quantos serventes trabalharam e a hora da chuva.')
    ) as t (dia, status, servico, qtd, resumo, comentario)
  loop
    insert into public.diarios (obra_id, data, hora_inicio, hora_fim, clima_manha, clima_tarde, atividades_resumo, status,
                                enviado_por, enviado_em, revisado_por, revisado_em, comentario_revisao, criado_por)
    values ('60000000-0000-0000-0000-00000000000a', hoje() + d.dia, '07:00', '17:00',
            case when d.dia = -1 then 'nublado' else 'bom' end,
            case when d.dia = -1 then 'chuva_forte' when d.dia = -18 then 'chuva_fraca' else 'bom' end,
            d.resumo, d.status,
            case when d.status <> 'rascunho' then v_campo end,
            case when d.status <> 'rascunho' then now() + (d.dia || ' days')::interval end,
            case when d.status in ('aprovado', 'correcao_solicitada') then v_gestor end,
            case when d.status in ('aprovado', 'correcao_solicitada') then now() + (d.dia + 1 || ' days')::interval end,
            d.comentario, v_campo)
    returning id into v_diario;

    insert into public.diario_equipe (diario_id, profissional_id, nome, funcao, quantidade, horas) values
      (v_diario, '40000000-0000-0000-0000-000000000001', null, 'Pedreiro', 1, 8),
      (v_diario, '40000000-0000-0000-0000-000000000002', null, 'Pedreiro', 1, 8),
      (v_diario, null, 'Serventes diaristas', 'Servente', 3, 8);

    insert into public.medicoes (servico_id, diario_id, periodo_inicio, periodo_fim, quantidade, local, status,
                                 enviado_em, revisado_por, revisado_em, criado_por)
    values (d.servico::uuid, v_diario, hoje() + d.dia, hoje() + d.dia, d.qtd,
            case when d.dia >= -2 and d.servico = '62000000-0000-0000-0000-000000000031' then 'Pavimento superior' end,
            case d.status when 'aprovado' then 'aprovada' when 'enviado' then 'enviada' else 'rascunho' end,
            case when d.status in ('aprovado', 'enviado') then now() + (d.dia || ' days')::interval end,
            case when d.status = 'aprovado' then v_gestor end,
            case when d.status = 'aprovado' then now() + (d.dia + 1 || ' days')::interval end,
            v_campo);

    if d.dia in (-36, -12) then
      insert into public.diario_materiais (diario_id, material_id, servico_id, descricao, unidade, quantidade) values
        (v_diario, '30000000-0000-0000-0000-000000000001', d.servico::uuid, 'Concreto usinado fck 25', 'm³', least(d.qtd, 12));
      insert into public.diario_equipamentos (diario_id, equipamento_id, descricao, horas) values
        (v_diario, '50000000-0000-0000-0000-000000000001', 'Betoneira 400 L', 6);
    end if;
    if d.dia = -18 then
      insert into public.diario_ocorrencias (diario_id, tipo, hora, descricao) values
        (v_diario, 'impedimento', '15:00', 'Chuva fraca interrompeu a concretagem por 1 hora.');
    end if;
    if d.dia = -1 then
      insert into public.diario_ocorrencias (diario_id, tipo, hora, descricao) values
        (v_diario, 'impedimento', null, 'Chuva forte à tarde.');
    end if;
    if d.dia = -8 then
      insert into public.diario_ocorrencias (diario_id, tipo, hora, descricao) values
        (v_diario, 'entrega', '09:30', 'Entrega de 3.000 blocos cerâmicos.'),
        (v_diario, 'visita', '14:00', 'Visita do cliente à obra.');
    end if;
  end loop;

  -- Diário de hoje em rascunho, só com a equipe
  insert into public.diarios (obra_id, data, hora_inicio, clima_manha, status, criado_por)
  values ('60000000-0000-0000-0000-00000000000a', hoje(), '07:00', 'bom', 'rascunho', v_campo)
  returning id into v_diario;
  insert into public.diario_equipe (diario_id, profissional_id, funcao, quantidade, horas) values
    (v_diario, '40000000-0000-0000-0000-000000000001', 'Pedreiro', 1, 8);

  -- Medição avulsa aguardando aprovação
  insert into public.medicoes (servico_id, periodo_inicio, periodo_fim, quantidade, local, observacao, status, enviado_em, criado_por)
  values ('62000000-0000-0000-0000-000000000022', hoje() - 4, hoje() - 4, 20, 'Beiral', 'Complemento da laje no beiral.', 'enviada', now() - interval '3 days', v_campo);
end;
$$;

select public.atualizar_datas_reais_servico(id) from public.servicos where obra_id = '60000000-0000-0000-0000-00000000000a';

-- -----------------------------------------------------------------------------
-- Obra B — em planejamento, orçamento em rascunho
-- -----------------------------------------------------------------------------
insert into public.etapas (id, obra_id, codigo, nome, ordem) values
  ('61000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-00000000000b', '1', 'Demolição', 1),
  ('61000000-0000-0000-0000-0000000000b2', '60000000-0000-0000-0000-00000000000b', '2', 'Pisos e fachada', 2);
insert into public.servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('62000000-0000-0000-0000-0000000000b1', '61000000-0000-0000-0000-0000000000b1', '1.1', 'Demolição de piso existente', 'm²', 150, 1),
  ('62000000-0000-0000-0000-0000000000b2', '61000000-0000-0000-0000-0000000000b2', '2.1', 'Porcelanato 60x60', 'm²', 150, 1),
  ('62000000-0000-0000-0000-0000000000b3', '61000000-0000-0000-0000-0000000000b2', '2.2', 'Revestimento de fachada', 'm²', 60, 2);
insert into public.orcamento_versoes (id, obra_id, numero, descricao, criado_por) values
  ('63000000-0000-0000-0000-0000000000b1', '60000000-0000-0000-0000-00000000000b', 1, 'Proposta inicial', '10000000-0000-0000-0000-000000000002');
insert into public.orcamento_itens (versao_id, servico_id, natureza, descricao, unidade, quantidade, valor_unitario) values
  ('63000000-0000-0000-0000-0000000000b1', '62000000-0000-0000-0000-0000000000b1', 'mao_de_obra', 'Demolição e remoção', 'm²', 150, 22.00),
  ('63000000-0000-0000-0000-0000000000b1', '62000000-0000-0000-0000-0000000000b2', 'material', 'Porcelanato 60x60', 'm²', 165, 89.90),
  ('63000000-0000-0000-0000-0000000000b1', '62000000-0000-0000-0000-0000000000b2', 'mao_de_obra', 'Assentamento', 'm²', 150, 45.00);

-- -----------------------------------------------------------------------------
-- Obra C — outro gestor
-- -----------------------------------------------------------------------------
insert into public.etapas (id, obra_id, codigo, nome, ordem) values
  ('61000000-0000-0000-0000-0000000000c1', '60000000-0000-0000-0000-00000000000c', '1', 'Fundação', 1);
insert into public.servicos (id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem) values
  ('62000000-0000-0000-0000-0000000000c1', '61000000-0000-0000-0000-0000000000c1', '1.1', 'Estacas', 'm', 600, 1);

-- -----------------------------------------------------------------------------
-- Financeiro
-- -----------------------------------------------------------------------------
do $$
declare
  v_fin uuid := '10000000-0000-0000-0000-000000000005';
  l record;
  v_lanc uuid;
  v_parc uuid;
  p record;
begin
  for l in
    select * from (values
      -- tipo, descrição, categoria, obra, etapa, natureza, pessoa, doc, competência (dias), parcelas [(dias, valor, pago)]
      ('pagar', 'Concreto das sapatas', 'Materiais', 'a', '61000000-0000-0000-0000-000000000001', 'material', '20000000-0000-0000-0000-000000000003', 'NF 1021', -36,
        '[[-30, 6500, 6500], [-10, 6500, 6500]]'),
      ('pagar', 'Aço CA-50 para estrutura', 'Materiais', 'a', '61000000-0000-0000-0000-000000000002', 'material', '20000000-0000-0000-0000-000000000004', 'NF 5567', -28,
        '[[-20, 7840, 7840], [-5, 7840, 0], [25, 7840, 0]]'),
      ('pagar', 'Empreitada da estrutura — 1ª medição', 'Mão de obra', 'a', '61000000-0000-0000-0000-000000000002', 'mao_de_obra', '20000000-0000-0000-0000-000000000005', 'Contrato 12/2026', -12,
        '[[3, 15000, 5000]]'),
      ('pagar', 'Locação de retroescavadeira', 'Equipamentos', 'a', '61000000-0000-0000-0000-000000000001', 'equipamento', '20000000-0000-0000-0000-000000000006', 'Recibo 88', -44,
        '[[-40, 3520, 3520]]'),
      ('pagar', 'Blocos cerâmicos', 'Materiais', 'a', '61000000-0000-0000-0000-000000000003', 'material', '20000000-0000-0000-0000-000000000003', 'NF 1102', -8,
        '[[22, 9220, 0]]'),
      ('pagar', 'Aluguel do escritório', 'Administrativo', null, null, null, '20000000-0000-0000-0000-000000000007', null, -1,
        '[[6, 2500, 0]]'),
      ('receber', 'Medição 1 — fundação e estrutura', 'Medição de contrato', 'a', null, null, '20000000-0000-0000-0000-000000000001', 'Fatura 001', -30,
        '[[-25, 60000, 60000]]'),
      ('receber', 'Medição 2 — alvenaria', 'Medição de contrato', 'a', null, null, '20000000-0000-0000-0000-000000000001', 'Fatura 002', -2,
        '[[10, 60000, 0]]'),
      ('receber', 'Sinal da reforma', 'Adiantamento do cliente', 'b', null, null, '20000000-0000-0000-0000-000000000002', null, -3,
        '[[-1, 15000, 0], [29, 15000, 0]]')
    ) as t (tipo, descricao, categoria, obra, etapa, natureza, pessoa, doc, competencia, parcelas)
  loop
    insert into public.lancamentos (tipo, descricao, categoria_id, obra_id, etapa_id, natureza, pessoa_id, documento_numero,
                                    data_competencia, valor_total, criado_por)
    values (l.tipo, l.descricao,
            (select id from public.categorias_financeiras c where c.nome = l.categoria
               and c.tipo = case when l.tipo = 'pagar' then 'despesa' else 'receita' end),
            case l.obra when 'a' then '60000000-0000-0000-0000-00000000000a'::uuid when 'b' then '60000000-0000-0000-0000-00000000000b'::uuid end,
            l.etapa::uuid, l.natureza, l.pessoa::uuid, l.doc, hoje() + l.competencia,
            (select sum((x ->> 1)::numeric) from jsonb_array_elements(l.parcelas::jsonb) x), v_fin)
    returning id into v_lanc;

    for p in select (x ->> 0)::int as dia, (x ->> 1)::numeric as valor, (x ->> 2)::numeric as pago, ord
               from jsonb_array_elements(l.parcelas::jsonb) with ordinality as t (x, ord)
    loop
      insert into public.parcelas (lancamento_id, numero, vencimento, valor)
      values (v_lanc, p.ord, hoje() + p.dia, p.valor) returning id into v_parc;
      if p.pago > 0 then
        insert into public.baixas (parcela_id, data_pagamento, valor, forma, criado_por)
        values (v_parc, least(hoje(), hoje() + p.dia), p.pago, case when l.tipo = 'pagar' then 'pix' else 'transferencia' end, v_fin);
      end if;
    end loop;
  end loop;

  -- Lançamento cancelado
  insert into public.lancamentos (tipo, descricao, categoria_id, obra_id, etapa_id, natureza, pessoa_id, data_competencia,
                                  valor_total, cancelado, motivo_cancelamento, criado_por)
  values ('pagar', 'Cimento (lançado em duplicidade)', (select id from public.categorias_financeiras where nome = 'Materiais'),
          '60000000-0000-0000-0000-00000000000a', '61000000-0000-0000-0000-000000000001', 'material',
          '20000000-0000-0000-0000-000000000003', hoje() - 20, 1200, true, 'Lançado em duplicidade com a NF 1021.', v_fin)
  returning id into v_lanc;
  insert into public.parcelas (lancamento_id, numero, vencimento, valor) values (v_lanc, 1, hoje() - 10, 1200);
end;
$$;
