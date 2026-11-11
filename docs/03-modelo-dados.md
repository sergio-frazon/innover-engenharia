# Modelo de dados (Fase 1)

Convenções para **todas** as tabelas, salvo indicação contrária:

- `id uuid primary key default gen_random_uuid()`
- `criado_em timestamptz not null default now()`, `atualizado_em timestamptz not null default now()` (trigger `tocar_atualizado_em()`)
- `criado_por uuid references perfis(id) default auth.uid()`
- RLS habilitado. Políticas em `05-permissoes.md`.
- Coluna `ativo boolean not null default true` onde indicado (exclusão lógica).
- **[A]** = tabela auditada (trigger `auditar()` em insert/update/delete).
- Textos obrigatórios: `check (length(trim(col)) > 0)`.
- Índices em toda FK e nas colunas usadas em filtros.

Valores de status/tipos são `text` com `check (col in (...))`, não `enum` do Postgres (mais fácil de evoluir).

Regras que dependem de `hoje()` ou de outras tabelas (ex.: "data não pode ser futura", "mesma obra do pai")
são **triggers** `before insert or update`, nunca `check` — `check` só para regras da própria linha e imutáveis.

---

## 1. Acesso

### `perfis` [A]
Um por usuário do Supabase Auth. Criado pelo trigger `criar_perfil_novo_usuario()` em `auth.users` (after insert),
lendo `raw_user_meta_data->>'nome'` e `->>'papel'` (padrão `campo`).

| Coluna | Tipo | Regras |
|---|---|---|
| id | uuid PK | `references auth.users(id) on delete cascade` (sem default) |
| nome | text not null | |
| email | text not null unique | copiado de `auth.users` |
| telefone | text | |
| papel | text not null | `admin`, `gestor`, `campo`, `financeiro` |
| ativo | boolean | |

Sem `criado_por`. Usuário comum só pode alterar `nome` e `telefone` do próprio perfil (trigger impede mudar `papel`/`ativo`/`email` se não for admin).

### `obra_membros` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| obra_id | uuid FK obras on delete cascade | PK composta |
| perfil_id | uuid FK perfis | PK composta |

Sem `id`/`atualizado_em`. Admin acessa todas as obras sem precisar ser membro.
Trigger: ao criar obra, o criador e o `responsavel_id` viram membros automaticamente.

### Funções auxiliares (SQL, `security definer`, `stable`, `set search_path = public`)
| Função | Retorno |
|---|---|
| `papel_atual()` | `text` — papel do `auth.uid()` se ativo, senão `null` |
| `eh_admin()` | `boolean` |
| `tem_papel(variadic papeis text[])` | `boolean` |
| `acessa_obra(p_obra uuid)` | `boolean` — admin, ou membro da obra |
| `obra_editavel(p_obra uuid)` | `boolean` — falso se a obra estiver `concluida`/`cancelada` e o usuário não for admin (R-OBR-03) |
| `hoje()` | `date` — `(now() at time zone 'America/Sao_Paulo')::date` |

`acessa_obra` e `obra_editavel` são criadas na migration de obras (passo 4), depois da tabela `obras`.

---

## 2. Cadastros de apoio (globais, não pertencem a uma obra)

### `pessoas` [A] — clientes, fornecedores e prestadores
| Coluna | Tipo | Regras |
|---|---|---|
| nome | text not null | |
| tipo_pessoa | text not null | `fisica`, `juridica` |
| documento | text | CPF/CNPJ só dígitos; `unique` quando não nulo; validar dígito verificador na UI (zod) |
| eh_cliente, eh_fornecedor, eh_prestador | boolean not null default false | `check` pelo menos um true |
| email, telefone, endereco, observacao | text | |
| ativo | boolean | |

View `v_pessoas_basico` (`security definer` via função ou view sem `security_invoker`, com filtro `papel_atual() is not null`):
só `id`, `nome`, `ativo`. Usada pelo perfil `campo`, que não lê a tabela `pessoas` diretamente.

### `profissionais` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| nome | text not null | |
| funcao | text not null | ex.: pedreiro, servente, eletricista |
| vinculo | text not null | `proprio`, `terceirizado` |
| empresa_id | uuid FK pessoas | obrigatório se `terceirizado` |
| telefone | text | |
| ativo | boolean | |

### `materiais` [A]
`descricao text not null`, `unidade text not null`, `custo_unitario numeric(14,2) check >= 0`, `ativo`.
`unique (lower(descricao), unidade)`.

### `equipamentos` [A]
`descricao text not null`, `propriedade text not null check in ('proprio','alugado')`, `identificacao text` (placa/série), `ativo`.

### `categorias_financeiras`
`nome text not null`, `tipo text not null check in ('despesa','receita')`, `ativo`. `unique (lower(nome), tipo)`.
Seed de produção (na migration, não no seed.sql): Despesa — Materiais, Mão de obra, Equipamentos, Serviços de terceiros,
Impostos e taxas, Administrativo, Outros. Receita — Medição de contrato, Adiantamento do cliente, Outros.

### Unidades
Lista fixa na UI (não é tabela): `un, m, m², m³, kg, t, l, h, dia, mês, vb (verba), cj (conjunto), pç`.
Campo é `text` livre no banco para aceitar outras.

---

## 3. Obras e documentos

### `obras` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| codigo | text not null unique | gerado: `OB-` + ano + sequencial de 3 dígitos (`OB-2026-001`) por trigger com sequence por ano; editável |
| nome | text not null | |
| cliente_id | uuid FK pessoas | `eh_cliente` deve ser true (trigger) |
| endereco | text | |
| cidade, uf | text | `uf` 2 letras |
| responsavel_id | uuid FK perfis not null | papel `gestor` ou `admin` (trigger) |
| data_inicio_prevista, data_fim_prevista | date | `check (fim >= inicio)` |
| data_inicio_real, data_fim_real | date | |
| situacao | text not null default `planejamento` | `planejamento`, `em_andamento`, `paralisada`, `concluida`, `cancelada` |
| descricao | text | |

### `documentos` [A]
Cada linha é **uma versão** de um documento. Versões do mesmo documento compartilham `grupo_id`.

| Coluna | Tipo | Regras |
|---|---|---|
| obra_id | uuid FK obras not null | |
| etapa_id | uuid FK etapas | opcional; mesma obra (trigger) |
| grupo_id | uuid not null | nova versão = mesmo `grupo_id` |
| versao | int not null | `unique (grupo_id, versao)`; calculado no insert = max+1 (trigger) |
| titulo | text not null | |
| categoria | text not null | `projeto`, `planta`, `memorial`, `contrato`, `licenca`, `outro` |
| caminho_arquivo | text not null | caminho no bucket `documentos` |
| nome_arquivo, tipo_mime | text not null | |
| tamanho_bytes | bigint not null | |
| observacao | text | ex.: "revisão do pavimento térreo" |

Sem exclusão: linhas nunca são apagadas. A UI mostra a versão mais recente de cada grupo e o histórico.
View `v_documentos_atuais` (última versão por `grupo_id`).

---

## 4. Planejamento

### `etapas` [A]
`obra_id FK not null`, `codigo text not null` (ex.: "1", "2"), `nome text not null`, `ordem int not null`,
`responsavel_id FK perfis`, `ativo`. `unique (obra_id, codigo)`.

### `servicos` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| obra_id | uuid FK obras not null | igual ao da etapa (trigger) |
| etapa_id | uuid FK etapas not null | |
| codigo | text not null | ex.: "1.1"; `unique (obra_id, codigo)` |
| descricao | text not null | |
| unidade | text not null | |
| quantidade_prevista | numeric(14,4) not null | `> 0` |
| responsavel_id | uuid FK perfis | |
| ordem | int not null | |
| data_inicio_real, data_fim_real | date | preenchidos pelo gestor ou automaticamente pelas medições (R-MED-09) |
| data_fim_real_automatica | boolean not null default false | true quando `data_fim_real` foi preenchida pela R-MED-09; edição manual zera a flag |
| ativo | boolean | só pode desativar se não houver medição aprovada |

`quantidade_prevista` é a quantidade contratual do serviço e base do percentual. Alteração é auditada.

### `orcamento_versoes` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| obra_id | uuid FK not null | |
| numero | int not null | `unique (obra_id, numero)`; 1, 2, 3… (trigger) |
| status | text not null default `rascunho` | `rascunho`, `aprovada`, `substituida` |
| descricao | text | motivo da revisão |
| aprovada_por | uuid FK perfis | |
| aprovada_em | timestamptz | |

Índices únicos parciais: no máximo **uma** `aprovada` e **uma** `rascunho` por obra.

### `orcamento_itens` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| versao_id | uuid FK orcamento_versoes on delete cascade not null | |
| servico_id | uuid FK servicos not null | mesma obra da versão (trigger) |
| natureza | text not null | `material`, `mao_de_obra`, `equipamento`, `outro` |
| descricao | text not null | |
| material_id | uuid FK materiais | opcional, preenche descrição/unidade/custo |
| unidade | text not null | |
| quantidade | numeric(14,4) not null | `>= 0` |
| valor_unitario | numeric(14,2) not null | `>= 0` |
| valor_total | numeric(16,2) | `generated always as (round(quantidade * valor_unitario, 2)) stored` |

Trigger `bloquear_versao_fechada()`: insert/update/delete só se a versão estiver `rascunho`.

### `cronograma_versoes` [A]
Mesma estrutura e regras de `orcamento_versoes`.

### `cronograma_atividades` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| versao_id | uuid FK cronograma_versoes on delete cascade not null | |
| servico_id | uuid FK servicos not null | `unique (versao_id, servico_id)`; mesma obra |
| inicio_previsto, fim_previsto | date not null | `check (fim_previsto >= inicio_previsto)` |
| duracao_dias | int | `generated always as (fim_previsto - inicio_previsto + 1) stored` (dias corridos) |

### `cronograma_dependencias` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| versao_id | uuid FK cronograma_versoes on delete cascade not null | PK composta |
| servico_id | uuid FK servicos | PK composta — o sucessor |
| predecessor_id | uuid FK servicos | PK composta; `check (servico_id <> predecessor_id)` |

Tipo único: término → início. Trigger rejeita ciclos (busca recursiva) e rejeita se
`inicio_previsto(sucessor) <= fim_previsto(predecessor)` na mesma versão (mensagem: "O serviço X precisa começar depois do término de Y").
O mesmo trigger roda quando datas de uma atividade mudam.
Ambas as tabelas obedecem a `bloquear_versao_fechada()`.

### Funções RPC de versão (`security definer`, verificam `tem_papel('admin','gestor') and acessa_obra(...)`)
| Função | O que faz |
|---|---|
| `criar_revisao_orcamento(p_obra uuid, p_descricao text) returns uuid` | Falha se já existe rascunho. Cria versão `rascunho` com `numero = max+1` e copia todos os itens da versão aprovada (se houver). |
| `aprovar_orcamento(p_versao uuid) returns void` | Versão precisa ser `rascunho` e ter ao menos 1 item. A aprovada atual vira `substituida`; esta vira `aprovada` com `aprovada_por/em`. |
| `descartar_rascunho_orcamento(p_versao uuid)` | Apaga versão `rascunho` (e itens em cascata). |
| `criar_revisao_cronograma`, `aprovar_cronograma`, `descartar_rascunho_cronograma` | Idem para cronograma (copia atividades e dependências). Aprovação exige que todo serviço ativo tenha atividade. |

---

## 5. Execução

### `diarios` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| obra_id | uuid FK not null | |
| data | date not null | `unique (obra_id, data)`; `<= hoje()` (trigger) |
| hora_inicio, hora_fim | time | |
| clima_manha, clima_tarde | text | `bom`, `nublado`, `chuva_fraca`, `chuva_forte`, `impraticavel` |
| atividades_resumo | text | texto livre do que foi feito |
| observacoes | text | |
| impedimentos | text | condições que afetaram a execução |
| status | text not null default `rascunho` | `rascunho`, `enviado`, `correcao_solicitada`, `aprovado` |
| enviado_por, enviado_em | uuid, timestamptz | |
| revisado_por, revisado_em | uuid, timestamptz | |
| comentario_revisao | text | obrigatório ao solicitar correção |

Edição: `campo` só edita diário em `rascunho` ou `correcao_solicitada`. Gestor/admin editam em qualquer status
(edição após aprovação fica no histórico via auditoria — exigência da seção 5).

### Tabelas filhas do diário [A] (todas com `diario_id FK on delete cascade not null`)
Seguem a regra de edição do diário pai (trigger `bloquear_diario_fechado()`).

| Tabela | Colunas |
|---|---|
| `diario_equipe` | `profissional_id FK` (opcional), `nome text` (se não cadastrado), `funcao text not null`, `quantidade int not null default 1 check > 0`, `horas numeric(5,2) check (horas > 0 and horas <= 24)` |
| `diario_materiais` | `material_id FK` (opcional), `descricao text not null`, `unidade text not null`, `quantidade numeric(14,4) not null check > 0`, `servico_id FK` (opcional) |
| `diario_equipamentos` | `equipamento_id FK` (opcional), `descricao text not null`, `horas numeric(5,2) check > 0`, `observacao text` |
| `diario_ocorrencias` | `tipo text not null` (`ocorrencia`, `impedimento`, `visita`, `acidente`, `entrega`, `outro`), `hora time`, `descricao text not null` |

Os "serviços executados" do diário são **medições** (`medicoes.diario_id`), não uma tabela separada.

### `medicoes` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| obra_id | uuid FK not null | igual à do serviço e do diário (trigger) |
| servico_id | uuid FK servicos not null | serviço ativo |
| diario_id | uuid FK diarios on delete cascade | opcional; `unique (diario_id, servico_id)` quando não nulo |
| periodo_inicio, periodo_fim | date not null | `check (fim >= inicio)`; se tem diário, ambos = `diarios.data` |
| quantidade | numeric(14,4) not null | `> 0` |
| local | text | ex.: "térreo", "bloco B" |
| observacao | text | |
| justificativa_excesso | text | obrigatória quando ultrapassa o previsto (ver regras) |
| status | text not null default `rascunho` | `rascunho`, `enviada`, `aprovada`, `rejeitada` |
| origem | text not null default `manual` | `manual`, `diario` (Fase 3 adiciona `foto`, `voz`) |
| enviado_em | timestamptz | |
| revisado_por, revisado_em | uuid, timestamptz | |
| comentario_revisao | text | obrigatório ao rejeitar |

Triggers: ver regras R-MED-* em `04-regras-negocio.md`.

### Funções RPC de execução
| Função | Quem | O que faz |
|---|---|---|
| `enviar_diario(p_diario uuid)` | membro da obra | `rascunho`/`correcao_solicitada` → `enviado`; medições `rascunho` do diário → `enviada`. Exige ao menos atividades_resumo ou 1 medição. |
| `aprovar_diario(p_diario uuid)` | gestor/admin | `enviado` → `aprovado`; medições `enviada` do diário → `aprovada` (aplicando R-MED-*). Tudo ou nada. |
| `solicitar_correcao_diario(p_diario uuid, p_comentario text)` | gestor/admin | `enviado` → `correcao_solicitada`; medições `enviada` → `rascunho`. |
| `enviar_medicao(p_id)`, `aprovar_medicao(p_id)`, `rejeitar_medicao(p_id, p_comentario)` | idem | Para medições avulsas (sem diário). Medição com diário só muda junto com o diário. |
| `reabrir_medicao(p_id uuid, p_motivo text)` | gestor/admin | `aprovada` → `enviada`, para correção. Motivo vai para `comentario_revisao`. |

---

## 6. Financeiro

### `lancamentos` [A]
| Coluna | Tipo | Regras |
|---|---|---|
| tipo | text not null | `pagar`, `receber` |
| descricao | text not null | |
| categoria_id | uuid FK categorias_financeiras not null | `despesa` para `pagar`, `receita` para `receber` (trigger) |
| obra_id | uuid FK obras | opcional (despesa administrativa geral) |
| etapa_id | uuid FK etapas | opcional; exige `obra_id` e mesma obra |
| natureza | text | `material`, `mao_de_obra`, `equipamento`, `outro`; obrigatório se `tipo = 'pagar'` e `obra_id` não nulo |
| pessoa_id | uuid FK pessoas | fornecedor (pagar) ou cliente (receber) |
| documento_numero | text | NF, contrato, recibo |
| data_competencia | date not null | data do fato gerador; base do "custo realizado" |
| valor_total | numeric(14,2) not null | `> 0`; deve ser igual à soma das parcelas (checado na RPC) |
| cancelado | boolean not null default false | |
| motivo_cancelamento | text | obrigatório se cancelado |
| observacao | text | |
| origem_tipo, origem_id | text, uuid | reservado para a Fase 2 (antiduplicidade); `unique (origem_tipo, origem_id)` quando não nulos |

### `parcelas` [A]
`lancamento_id FK on delete cascade not null`, `numero int not null` (`unique (lancamento_id, numero)`),
`vencimento date not null`, `valor numeric(14,2) not null check > 0`.

### `baixas` [A] — pagamentos/recebimentos efetivos
| Coluna | Tipo | Regras |
|---|---|---|
| parcela_id | uuid FK parcelas not null | |
| data_pagamento | date not null | `<= hoje()` (trigger) |
| valor | numeric(14,2) not null | `> 0`; soma das baixas não estornadas `<= parcelas.valor` (trigger) |
| juros_multa | numeric(14,2) not null default 0 | `>= 0` (não conta para quitar a parcela) |
| desconto | numeric(14,2) not null default 0 | `>= 0` (conta para quitar a parcela) |
| forma | text not null | `pix`, `boleto`, `transferencia`, `dinheiro`, `cartao`, `cheque`, `outro` |
| comprovante_caminho | text | bucket `comprovantes` |
| observacao | text | |
| estornada | boolean not null default false | baixa nunca é apagada, é estornada |
| motivo_estorno | text | obrigatório se estornada |

### Funções RPC financeiras
| Função | O que faz |
|---|---|
| `criar_lancamento(p_dados jsonb, p_parcelas jsonb) returns uuid` | Insere lançamento e parcelas numa transação. Valida soma das parcelas = valor_total. Atalho na UI: "dividir em N parcelas mensais" (última parcela recebe a diferença de centavos). |
| `atualizar_parcelas(p_lancamento uuid, p_parcelas jsonb)` | Substitui parcelas sem baixa; falha se tentar mudar parcela com baixa. |
| `cancelar_lancamento(p_id uuid, p_motivo text)` | Só se nenhuma baixa ativa. |
| `estornar_baixa(p_id uuid, p_motivo text)` | Marca estornada. |

---

## 7. Auditoria

### `auditoria`
| Coluna | Tipo |
|---|---|
| id | bigint generated always as identity PK |
| tabela | text not null |
| registro_id | text not null (id da linha; PK composta vira `a:b`) |
| obra_id | uuid (preenchido quando a linha tem `obra_id` ou pertence a uma obra via pai) |
| acao | text not null — `INSERT`, `UPDATE`, `DELETE` |
| antes, depois | jsonb (em UPDATE, `depois` guarda só colunas alteradas + id) |
| usuario_id | uuid (`auth.uid()`) |
| em | timestamptz not null default now() |

Sem `atualizado_em`/`criado_por`. Ninguém pode inserir/alterar/apagar diretamente (só o trigger `security definer`).
Índices: `(tabela, registro_id)`, `(obra_id, em desc)`.

---

## 8. Views (todas `with (security_invoker = true)` para respeitar o RLS)

| View | Colunas principais | Uso |
|---|---|---|
| `v_documentos_atuais` | última versão de cada `grupo_id` + `total_versoes` | Lista de documentos |
| `v_orcamento_totais_servico` | `versao_id, servico_id, natureza, total` e total geral por serviço | Orçamento, pesos |
| `v_orcamento_totais_etapa` | `versao_id, etapa_id, total` | Orçamento |
| `v_custo_obra` | `obra_id, valor_orcado (versão aprovada), custo_realizado, diferenca, diferenca_pct` | Painéis (só perfis financeiros) |
| `v_custo_previsto_realizado` | `obra_id, etapa_id, natureza, previsto, realizado, diferenca, diferenca_pct` | Comparação orçamento × realizado |
| `v_parcelas_situacao` | parcela + `valor_pago` (baixas ativas + desconto), `saldo`, `situacao` (`aberta`, `parcial`, `paga`, `vencida`, `cancelada`), `dias_para_vencer` | Contas a pagar/receber |
| `v_fluxo_caixa` | `data, obra_id, tipo, entradas, saidas` (das baixas ativas; `valor + juros_multa`) | Fluxo de caixa |
| `v_alertas` | `tipo, obra_id, referencia_id, titulo, data_referencia, gravidade` | Tela de alertas e contadores |

As fórmulas estão em `04-regras-negocio.md`. **Toda view que expõe valores financeiros** deve retornar linhas apenas
para perfis com acesso financeiro (o RLS das tabelas base já garante, pois as views são `security_invoker`).

### Funções de progresso (`security definer`, `stable`)

O perfil `campo` não lê valores do orçamento, mas precisa ver o progresso (que é ponderado pelo valor orçado).
Por isso o progresso é calculado em funções `security definer` que checam `acessa_obra(p_obra)` no início
(senão `raise exception 'Sem acesso a esta obra'`) e **não devolvem nenhuma coluna em R$**.

| Função | Retorno (`returns table`) | Uso |
|---|---|---|
| `progresso_servicos(p_obra uuid)` | `servico_id, etapa_id, codigo, descricao, unidade, quantidade_prevista, quantidade_aprovada, quantidade_pendente, percentual, percentual_limitado, peso, inicio_previsto, fim_previsto, data_inicio_real, data_fim_real, situacao_prazo` | Planejamento, cronograma, medições |
| `progresso_etapas(p_obra uuid)` | `etapa_id, codigo, nome, peso, avanco, servicos_atrasados` | Painel da obra |
| `progresso_obras()` | `obra_id, avanco_fisico, servicos_atrasados, diarios_pendentes, medicoes_pendentes` para todas as obras que o usuário acessa | Painel geral, lista de obras |
