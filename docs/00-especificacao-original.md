<!-- Convertido de Funcionalidades_Sistema_Gestao_Obras (2).docx. Fonte da verdade funcional; nao editar. -->

# Funcionalidades do sistema de gestão de obras

Especificação funcional inicial • Versão 1.0 • 15 de outubro de 2026

O sistema tem como objetivo centralizar o planejamento, a execução e o controle financeiro de obras, permitindo registrar o andamento dos serviços por fotos, texto e voz. A inteligência artificial auxiliará na organização do diário de obra e na sugestão de medições, sempre com conferência do responsável.

## 1 Objetivo e organização

A plataforma será acessada pelo navegador no computador e no celular. Cada obra reunirá seus projetos, orçamento, cronograma, equipe, materiais, equipamentos, movimentações financeiras e registros diários.

## 2 Perfis de acesso propostos

Administrador: gerencia usuários, permissões e configurações. Gestor ou engenheiro responsável: administra obras, revisa medições e acompanha prazos e custos. Equipe de campo: registra atividades, fotos e áudios. Financeiro: controla pagamentos, recebimentos e cobranças. O acesso do cliente à consulta de informações poderá ser incluído conforme a necessidade.

- O sistema deve permitir login, saída da conta e recuperação de senha.

- O sistema deve permitir cadastrar, editar e desativar usuários, definindo suas permissões e as obras às quais possuem acesso.

- O sistema deve restringir a visualização e a alteração de dados conforme o perfil e a obra autorizada.

## 3 Cadastro e visão geral das obras

- O sistema deve permitir cadastrar obras com nome, cliente, endereço, responsável, datas previstas, situação e descrição.

- O sistema deve permitir anexar documentos e projetos, mantendo a identificação de suas versões.

- O sistema deve apresentar um painel por obra com progresso físico, etapas atrasadas, custos previstos e realizados e pendências.

- O sistema deve permitir pesquisar e filtrar obras por situação, responsável e período.

Escopo: planejamento, acompanhamento, financeiro, análise de fotos e registro por voz são as ideias centrais. Perfis, permissões, painéis e relatórios são complementos propostos para viabilizar a operação integrada.

## 4 Planejamento da obra

### Projetos e estrutura dos serviços

- O sistema deve permitir cadastrar etapas e serviços da obra, com descrição, unidade de medida, quantidade prevista e responsável.

- O sistema deve permitir relacionar projetos, plantas e documentos às etapas correspondentes.

- O sistema deve permitir consultar o histórico de alterações no planejamento e identificar o responsável por cada mudança.

### Orçamento

- O sistema deve permitir elaborar orçamentos por obra, etapa e serviço, informando materiais, mão de obra, equipamentos e outros custos.

- O sistema deve permitir registrar quantidades, valores unitários e valores totais de cada item.

- O sistema deve calcular os totais por serviço, etapa e obra, com atualização quando os itens forem alterados.

- O sistema deve permitir registrar revisões do orçamento e preservar uma versão aprovada para comparação com os gastos realizados.

- O sistema deve permitir comparar o orçamento previsto com os custos realizados, destacando diferenças em valor e percentual.

### Cronograma

- O sistema deve permitir definir datas de início e término, duração prevista e responsáveis pelas atividades.

- O sistema deve permitir relacionar atividades que dependam da conclusão de outras e apresentar o cronograma em calendário ou gráfico de Gantt.

- O sistema deve registrar datas reais e avanço das atividades, comparando a execução com o planejamento aprovado.

- O sistema deve destacar atrasos e permitir revisar o cronograma, preservando o histórico das alterações.

### Integração entre prazo e custo

- O sistema deve vincular registros de execução e custos às atividades da obra para acompanhar a evolução física e financeira.

- O sistema deve permitir consultar o previsto e o realizado por período, etapa e serviço.

Regra de atualização: revisões do planejamento devem ser identificadas. A alteração de uma previsão não deve apagar o orçamento ou o cronograma anteriormente aprovado.

## 5 Acompanhamento da execução

### Mão de obra

- O sistema deve permitir cadastrar profissionais, equipes e prestadores, vinculando-os às obras e aos serviços executados.

- O sistema deve permitir registrar presença, horas trabalhadas, atividade realizada e custo da mão de obra.

- O sistema deve permitir acompanhar a produtividade pela relação entre quantidade executada e horas registradas, quando houver dados suficientes.

### Materiais

- O sistema deve permitir cadastrar materiais com descrição, unidade de medida e custo unitário.

- O sistema deve registrar entradas, consumo, devoluções e ajustes de materiais por obra, com data e responsável.

- O sistema deve relacionar o consumo de materiais aos serviços e comparar as quantidades previstas com as utilizadas.

- O sistema deve apresentar o saldo de materiais e sinalizar níveis mínimos definidos pelo usuário.

### Equipamentos

- O sistema deve permitir cadastrar equipamentos próprios ou alugados e vinculá-los às obras.

- O sistema deve registrar períodos de utilização, horas de uso, custos e indisponibilidades.

- O sistema deve permitir acompanhar a disponibilidade dos equipamentos e os vencimentos das locações.

### Diário de obra

- O sistema deve permitir criar um diário por obra e data, com horários, equipe, serviços executados, materiais aplicados, equipamentos e ocorrências.

- O sistema deve permitir registrar informações manualmente, por fotos e por áudio, mantendo os arquivos vinculados ao diário.

- O sistema deve permitir incluir observações, impedimentos e condições que afetaram a execução.

- O sistema deve permitir salvar rascunhos e enviar registros para conferência do responsável.

- O sistema deve permitir aprovar ou solicitar correções e manter histórico das alterações após a aprovação.

### Medições e percentuais

- O sistema deve permitir informar a quantidade executada de cada serviço, sua unidade e o período de referência.

- O sistema deve calcular o percentual do serviço pela quantidade acumulada aprovada dividida pela quantidade total prevista, multiplicada por 100.

- O sistema deve calcular o avanço geral da obra com pesos definidos e visíveis, evitando somar diretamente unidades diferentes.

Regra de medição: registros repetidos da mesma execução não podem aumentar o progresso. Quantidades acima do previsto devem exigir justificativa e revisão do responsável.

## 6 Inteligência artificial para fotos e voz

### Análise de fotos

- O sistema deve permitir enviar fotos do celular ou computador e associá-las à obra, data, etapa e serviço.

- O sistema deve utilizar a IA para sugerir os serviços visíveis e os materiais aparentes nas imagens.

- O sistema deve permitir selecionar a atividade planejada à qual cada sugestão se refere e comparar fotos da mesma etapa ao longo do tempo.

- O sistema deve sugerir quantidades e percentuais somente quando houver referências e informações suficientes, apresentando a unidade, a base do cálculo e a incerteza da estimativa.

- O sistema deve solicitar medidas, escala, dimensões de projeto ou confirmação manual quando a foto não permitir uma estimativa confiável.

- O sistema deve apresentar as sugestões para revisão, permitindo aceitar, corrigir ou rejeitar cada informação antes de incorporá-la à medição e ao diário.

- O sistema deve manter a imagem original, a sugestão gerada e a identificação de quem validou o resultado.

Limite funcional: uma foto isolada pode não demonstrar dimensões, espessura, serviços ocultos ou consumo real de materiais. A IA deve auxiliar a medição, sem tratar estimativas visuais como quantidades comprovadas. Materiais identificados em fotos não devem gerar baixas automáticas no estoque.

### Transcrição e preenchimento por voz

- O sistema deve permitir gravar ou enviar áudio e transcrever a fala para texto em português.

- O sistema deve identificar no relato informações como data, hora, obra, serviço, equipe, materiais, quantidades e ocorrências, sugerindo seu preenchimento nos campos correspondentes.

- O sistema deve distinguir a data e a hora mencionadas no relato da data e da hora de envio, pedindo confirmação quando houver ambiguidade.

- O sistema deve permitir ouvir o áudio, revisar a transcrição e corrigir os campos antes de salvar o registro.

- O sistema deve sinalizar trechos não compreendidos e campos obrigatórios ausentes, sem inventar informações.

### Exemplo de uso integrado

O profissional envia uma foto e relata: “Hoje, às 14 horas, a equipe concluiu 20 metros quadrados de alvenaria no térreo”. O sistema sugere a data, o horário, o serviço, o local, a quantidade e a unidade. O responsável confere o registro e aprova a medição. Somente então o avanço do cronograma é atualizado.

Regra de rastreabilidade: uma sugestão da IA deve permanecer identificada como sugestão até a validação. Fotos, áudios e relatos de um mesmo serviço devem ser relacionados para evitar medições duplicadas.

## 7 Controle financeiro e relatórios

### Contas a pagar e a receber

- O sistema deve permitir cadastrar despesas e receitas com descrição, categoria, obra, fornecedor ou cliente, valor, vencimento e situação.

- O sistema deve permitir registrar parcelas, pagamentos e recebimentos parciais ou totais, com comprovantes.

- O sistema deve relacionar os lançamentos às etapas e aos custos de materiais, mão de obra e equipamentos.

- O sistema deve apresentar contas vencidas, próximas do vencimento, pagas e recebidas, além do fluxo de caixa por período e obra.

- O sistema deve evitar a duplicação de despesas quando um custo registrado na execução for integrado ao financeiro.

### Boletos e cobranças

- O sistema deve permitir emitir boletos por integração com banco ou provedor de pagamentos, após configuração da conta e das credenciais necessárias.

- O sistema deve registrar identificação da cobrança, vencimento, valor e situação, permitindo consultar ou disponibilizar o boleto.

- O sistema deve atualizar a situação do recebimento com base no retorno do provedor e permitir conciliação manual quando necessário.

Dependência: emissão, baixa, cancelamento e tarifas de boletos dependem dos recursos e condições do provedor escolhido. A simples geração de um documento não confirma o recebimento.

### Relatórios e alertas

- O sistema deve gerar relatórios de diário de obra, evolução física, cronograma, consumo de materiais, mão de obra, equipamentos e resultados financeiros.

- O sistema deve permitir filtrar relatórios por obra, período, etapa e situação, com exportação para PDF ou planilha conforme o tipo de informação.

- O sistema deve emitir avisos sobre atrasos, contas próximas do vencimento e registros pendentes de revisão.

## 8 Requisitos gerais e definições para o desenvolvimento

- A interface deve se adaptar a celulares e computadores, facilitar o envio de fotos e áudios e informar o andamento de uploads e análises. O sistema deve manter histórico de ações relevantes, proteger os arquivos conforme as permissões e oferecer cópias de segurança com possibilidade de restauração.

Antes do desenvolvimento, devem ser definidos: tipos de obra atendidos; perfis e aprovações; critérios de peso do progresso geral; banco ou provedor de boletos; formatos e limites de arquivos; prazos de retenção de fotos e áudios; e necessidade de operação sem internet.

Implantação sugerida: iniciar com cadastro de obras, planejamento, diário manual e financeiro básico; depois integrar fotos e voz; por fim, validar estimativas visuais e integrar cobranças. A análise de imagens deve ser testada com fotos reais dos serviços antes de estabelecer metas de precisão.
