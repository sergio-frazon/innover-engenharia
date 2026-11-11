# Regras de negócio

Cada regra tem um código. Testes pgTAP e comentários no SQL devem citar o código (ex.: `-- R-MED-03`).
"Hoje" é sempre `hoje()` (fuso `America/Sao_Paulo`).

---

## Versões de orçamento e cronograma (R-VER)

| Código | Regra |
|---|---|
| R-VER-01 | Status possíveis: `rascunho` → `aprovada` → `substituida`. Não há outra transição. |
| R-VER-02 | Por obra: no máximo 1 `aprovada` e 1 `rascunho` ao mesmo tempo. |
| R-VER-03 | Itens, atividades e dependências só podem ser criados, alterados ou apagados em versão `rascunho`. Em qualquer outro status, o trigger levanta "Esta versão está aprovada e não pode ser alterada. Crie uma revisão." |
| R-VER-04 | Revisão = nova versão `rascunho` com `numero = max + 1`, copiando o conteúdo da `aprovada` atual. A primeira versão de uma obra nasce vazia. |
| R-VER-05 | Aprovar torna a anterior `substituida`, na mesma transação. Versões substituídas continuam consultáveis (histórico). |
| R-VER-06 | Só `gestor` ou `admin` com acesso à obra criam, editam, aprovam ou descartam versões. |
| R-VER-07 | Cronograma só pode ser aprovado se todo serviço ativo da obra tiver atividade na versão. |
| R-VER-08 | Rascunho pode ser descartado (apagado). Versão aprovada/substituída nunca é apagada. |

## Orçamento (R-ORC)

| Código | Regra |
|---|---|
| R-ORC-01 | `valor_total` do item = `round(quantidade × valor_unitario, 2)` (coluna gerada). |
| R-ORC-02 | Total do serviço = Σ itens do serviço na versão. Total da etapa = Σ serviços. Total da obra = Σ etapas. Sempre calculado (views), nunca armazenado. |
| R-ORC-03 | Comparação: previsto = versão **aprovada**. Realizado = R-FIN-05. Diferença = realizado − previsto. Diferença % = diferença ÷ previsto × 100 (nulo se previsto = 0). Positivo = acima do orçado (vermelho); negativo = abaixo (verde). |
| R-ORC-04 | A tela de orçamento mostra também a comparação entre o rascunho e a aprovada (diferença por serviço), para o gestor ver o impacto da revisão antes de aprovar. |

## Medições e progresso (R-MED / R-PROG)

| Código | Regra |
|---|---|
| R-MED-01 | Status: `rascunho` → `enviada` → `aprovada` ou `rejeitada`. `rejeitada` é final (registrar nova medição). `aprovada` só volta para `enviada` via `reabrir_medicao` (gestor/admin, com motivo). |
| R-MED-02 | Só medições `aprovada` contam para o progresso. `enviada` aparece como "pendente de aprovação". |
| R-MED-03 | **Excesso:** ao enviar e ao aprovar, se `quantidade_aprovada_do_serviço + quantidade_pendente_de_outras + esta > quantidade_prevista`, a `justificativa_excesso` é obrigatória. Sem ela: "A quantidade ultrapassa o previsto para o serviço (previsto X un, acumulado Y un). Informe uma justificativa." Na aprovação, o gestor vê destaque visual de excesso. |
| R-MED-04 | **Duplicidade:** não pode existir outra medição não rejeitada do mesmo serviço, com período que se sobrepõe e mesmo `local` (comparação sem diferenciar maiúsculas; nulo = nulo). Mensagem: "Já existe uma medição deste serviço neste período e local (medição de dd/mm/aaaa). Verifique se não é o mesmo registro." Locais diferentes no mesmo dia são permitidos. |
| R-MED-05 | Num diário, cada serviço aparece no máximo uma vez (`unique (diario_id, servico_id)`). |
| R-MED-06 | Medição de diário tem `periodo_inicio = periodo_fim = diarios.data` e muda de status junto com o diário (não pode ser enviada/aprovada isoladamente). |
| R-MED-07 | Medição `aprovada` não pode ser alterada nem apagada. `rascunho` pode ser apagada pelo criador ou pelo gestor. `enviada` só pode ser alterada pelo gestor. |
| R-MED-08 | Não é permitido medir serviço inativo nem com `periodo_fim > hoje()`. |
| R-MED-09 | Na 1ª medição aprovada de um serviço, se `data_inicio_real` for nulo, recebe `periodo_inicio`. Quando a quantidade aprovada atinge ≥ 100% e `data_fim_real` é nulo, recebe `periodo_fim`. Ao reabrir uma medição e o percentual cair abaixo de 100%, `data_fim_real` volta a nulo apenas se tiver sido preenchido automaticamente (guardar flag `data_fim_real_automatica boolean` em `servicos`). |
| R-PROG-01 | `percentual = quantidade_aprovada ÷ quantidade_prevista × 100`. Pode passar de 100 (mostrar, ex.: "105%"). `percentual_limitado = least(percentual, 100)`. |
| R-PROG-02 | **Peso do serviço** = valor do serviço na versão de orçamento aprovada ÷ valor total da versão aprovada (somente serviços ativos). Σ pesos = 1. |
| R-PROG-03 | Sem orçamento aprovado (ou total = 0): pesos iguais (1 ÷ nº de serviços ativos), e a UI mostra o aviso "Progresso calculado com pesos iguais: aprove um orçamento para ponderar pelo valor." |
| R-PROG-04 | Serviço ativo sem item no orçamento aprovado tem peso 0; a UI lista esses serviços como aviso. |
| R-PROG-05 | **Avanço da etapa** = Σ(peso × percentual_limitado) dos serviços da etapa ÷ Σ pesos da etapa. **Avanço da obra** = Σ(peso × percentual_limitado) de todos os serviços. Nunca somar quantidades de unidades diferentes. |
| R-PROG-06 | Os pesos são exibidos na tela de planejamento (coluna "Peso %"), conforme a especificação ("pesos definidos e visíveis"). |
| R-PROG-07 | Exibição: percentuais com 1 casa decimal; quantidades com até 2 casas (sem zeros à direita); dinheiro com 2 casas. |

### Exemplo de referência (usar no teste pgTAP de progresso)

Obra com orçamento aprovado:

| Serviço | Previsto | Valor orçado | Peso |
|---|---|---|---|
| 1.1 Alvenaria | 200 m² | R$ 30.000,00 | 0,75 |
| 1.2 Reboco | 400 m² | R$ 10.000,00 | 0,25 |

1. Medição aprovada de 20 m² de alvenaria → alvenaria 10% → avanço da obra = 0,75 × 10 = **7,5%**.
2. Nova medição de 190 m² sem justificativa → **erro R-MED-03**. Com justificativa, aprovada → alvenaria 105% (limitado a 100) → avanço = **75%**.
3. Medição de 100 m² de reboco aprovada → reboco 25% → avanço = 75 + 0,25 × 25 = **81,25%**.
4. Segunda medição de alvenaria no mesmo dia e mesmo local → **erro R-MED-04**.

## Prazo (R-PRZ)

Usa o cronograma **aprovado**. Para cada serviço, `situacao_prazo` é a primeira condição verdadeira:

| Ordem | Situação | Condição |
|---|---|---|
| 1 | `concluido` | percentual ≥ 100 |
| 2 | `sem_cronograma` | serviço sem atividade no cronograma aprovado |
| 3 | `atrasado` | hoje > fim_previsto |
| 4 | `inicio_atrasado` | hoje > inicio_previsto e quantidade_aprovada = 0 |
| 5 | `a_iniciar` | hoje < inicio_previsto |
| 6 | `em_risco` | percentual_esperado − percentual > 20 pontos, sendo `percentual_esperado = least(100, (hoje − inicio_previsto + 1) ÷ duracao_dias × 100)` |
| 7 | `no_prazo` | demais casos |

| Código | Regra |
|---|---|
| R-PRZ-01 | Etapa é "atrasada" se tiver algum serviço `atrasado` ou `inicio_atrasado`. |
| R-PRZ-02 | Gantt mostra barra prevista (baseline aprovada) e, abaixo, barra real (de `data_inicio_real` até `data_fim_real` ou hoje), com cor por situação: atrasado/início atrasado = vermelho, em risco = âmbar, no prazo = azul, concluído = verde, a iniciar = cinza. |
| R-PRZ-03 | Dependências são término → início. O sucessor deve começar **depois** do término do predecessor. Ciclos são proibidos. |
| R-PRZ-04 | Na edição do rascunho, a UI oferece "Empurrar sucessores": ao mover uma atividade, desloca os sucessores que ficariam inválidos (calculado no cliente, salvo em lote). Não é automático. |

## Diário de obra (R-DIA)

| Código | Regra |
|---|---|
| R-DIA-01 | Um diário por obra e data. Data não pode ser futura. |
| R-DIA-02 | Transições: `rascunho` → `enviado`; `enviado` → `aprovado` ou `correcao_solicitada`; `correcao_solicitada` → `enviado`. Aprovado não volta de status. |
| R-DIA-03 | `campo` cria e edita diários (e filhos) em `rascunho` ou `correcao_solicitada` das obras que acessa. Depois de enviado, só gestor/admin editam. |
| R-DIA-04 | Gestor/admin podem editar diário aprovado; toda alteração fica na auditoria e a tela do diário mostra "Editado após aprovação por Fulano em dd/mm/aaaa hh:mm" com link para o histórico. |
| R-DIA-05 | Solicitar correção exige comentário. O comentário aparece em destaque para quem for corrigir. |
| R-DIA-06 | Só diário `rascunho` pode ser apagado (pelo criador ou gestor/admin). |
| R-DIA-07 | Enviar exige `atividades_resumo` preenchido ou pelo menos uma medição. |
| R-DIA-08 | Ao criar o diário, a UI pré-preenche a equipe com a do último diário da obra (o usuário ajusta). |

## Financeiro (R-FIN)

| Código | Regra |
|---|---|
| R-FIN-01 | Soma das parcelas = `valor_total` do lançamento (validado na RPC; diferença de centavos vai na última parcela ao dividir). |
| R-FIN-02 | Situação da parcela, na ordem: `cancelada` (lançamento cancelado) → `paga` (valor_pago ≥ valor) → `parcial` (valor_pago > 0) → `vencida` (vencimento < hoje) → `aberta`. `valor_pago` = Σ (valor + desconto) das baixas não estornadas. |
| R-FIN-03 | Σ (valor + desconto) das baixas não estornadas de uma parcela não pode passar do valor da parcela. Juros/multa são pagos à parte e não contam para quitar. |
| R-FIN-04 | Baixa não é apagada: é estornada com motivo. Lançamento com baixa ativa não pode ser cancelado nem ter o valor alterado. |
| R-FIN-05 | **Custo realizado** (para comparar com o orçamento) = Σ `valor_total` dos lançamentos `pagar`, não cancelados, da obra (regime de competência, pela `data_competencia`). Agrupável por etapa e natureza; sem etapa entra como "Sem etapa". |
| R-FIN-06 | **Fluxo de caixa realizado** = baixas não estornadas por `data_pagamento`: entradas (receber) e saídas (pagar), valor = `valor + juros_multa`. **Previsto** = saldos de parcelas `aberta`/`parcial`/`vencida` por vencimento. Agrupamento por dia, semana ou mês; filtro por obra. |
| R-FIN-07 | Categoria precisa ser do tipo compatível: `pagar` → `despesa`, `receber` → `receita`. |
| R-FIN-08 | Lançamento `pagar` vinculado a obra exige `natureza` (para comparar com o orçamento por natureza). |
| R-FIN-09 | Antiduplicidade (Fase 2): `unique (origem_tipo, origem_id)`. Na Fase 1, o formulário avisa (sem bloquear) se já existe lançamento com mesmo fornecedor, mesmo `documento_numero` ou mesmo valor e competência nos últimos 30 dias. |

## Obras e cadastros (R-OBR / R-CAD)

| Código | Regra |
|---|---|
| R-OBR-01 | Criador e responsável viram membros da obra automaticamente. |
| R-OBR-02 | Responsável precisa ter papel `gestor` ou `admin`. |
| R-OBR-03 | Obra `concluida` ou `cancelada` fica somente leitura para todos, exceto admin (que pode reabrir mudando a situação). Implementar no trigger das tabelas filhas via `obra_editavel(p_obra)`. |
| R-OBR-04 | Ao mudar para `em_andamento` com `data_inicio_real` nulo, preencher com hoje. Ao mudar para `concluida` com `data_fim_real` nulo, preencher com hoje. |
| R-CAD-01 | Cadastros nunca são apagados se referenciados; desativar (`ativo = false`). Inativos não aparecem em seleções novas, mas continuam visíveis nos registros antigos. |
| R-CAD-02 | CPF/CNPJ validados por dígito verificador na UI; armazenados só com dígitos. |

## Documentos (R-DOC)

| Código | Regra |
|---|---|
| R-DOC-01 | Enviar nova versão = mesmo `grupo_id`, `versao = max + 1`. Versões antigas ficam disponíveis para download. |
| R-DOC-02 | Documento nunca é apagado (nem o arquivo no Storage). |
| R-DOC-03 | Validar tipo e tamanho antes do upload (UI) e no bucket (`allowed_mime_types`, `file_size_limit`). |

## Alertas (R-ALE)

Calculados na view `v_alertas` (sem tabela, sem e-mail). Cada usuário vê só os das suas obras e do seu perfil.

| Tipo | Gravidade | Quem vê | Condição |
|---|---|---|---|
| `servico_atrasado` | alta | gestor, admin | `situacao_prazo in ('atrasado','inicio_atrasado')` |
| `servico_em_risco` | media | gestor, admin | `situacao_prazo = 'em_risco'` |
| `diario_pendente` | media | gestor, admin | diário `enviado` |
| `medicao_pendente` | media | gestor, admin | medição avulsa `enviada` |
| `diario_correcao` | alta | criador do diário | diário `correcao_solicitada` |
| `diario_ausente` | baixa | gestor, campo | obra `em_andamento` sem diário no último dia útil (seg–sex) |
| `conta_vencida` | alta | financeiro, admin | parcela `vencida` |
| `conta_a_vencer` | media | financeiro, admin | parcela aberta/parcial com vencimento em até 7 dias |

O menu mostra um contador com o total de alertas de gravidade alta e média.
