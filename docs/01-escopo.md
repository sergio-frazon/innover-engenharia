# Escopo por fase

Referência: seção 8 de `00-especificacao-original.md` ("Implantação sugerida").

## Fase 1 — entrega atual

| Módulo | Inclui | Seção da especificação |
|---|---|---|
| Acesso | Login, logout, recuperação de senha. Admin cria/edita/desativa usuários, define perfil e obras com acesso. Restrição por perfil e por obra (RLS). | 2 |
| Obras | Cadastro completo, situação, membros, busca e filtros (situação, responsável, período). | 3 |
| Documentos | Upload de documentos/projetos por obra (opcionalmente por etapa), com controle de versões. | 3 |
| Painel da obra | Progresso físico, etapas/serviços atrasados, custo previsto × realizado, pendências de revisão. | 3 |
| Painel geral | Lista de obras com progresso e alertas; contas a vencer. | 3, 7 |
| Estrutura de serviços | Etapas e serviços (descrição, unidade, quantidade prevista, responsável). Relacionar documentos às etapas. Histórico de alterações. | 4 |
| Orçamento | Itens por serviço (material, mão de obra, equipamento, outro), totais por serviço/etapa/obra, versões (rascunho → aprovada → substituída), comparação previsto × realizado em valor e %. | 4 |
| Cronograma | Datas previstas por serviço, dependências término→início, Gantt, versões com baseline aprovada, datas reais, destaque de atrasos. | 4 |
| Cadastros de apoio | Pessoas (clientes/fornecedores/prestadores), profissionais, materiais, equipamentos, categorias financeiras. **Só cadastro**, sem estoque. | 5 |
| Diário de obra | Um por obra/data: horários, clima, equipe, serviços executados (medições), materiais aplicados, equipamentos, ocorrências, impedimentos. Rascunho → enviado → aprovado / correção solicitada. Histórico após aprovação. Impressão (PDF pelo navegador). | 5 |
| Medições | Quantidade executada por serviço e período, aprovação pelo gestor, percentual por serviço, avanço geral ponderado pelo valor orçado, regra de excesso com justificativa, proteção contra duplicidade. | 5 |
| Financeiro básico | Contas a pagar e a receber com parcelas, baixas parciais/totais com comprovante, vínculo com obra/etapa/natureza de custo, situações (aberta, parcial, paga, vencida, cancelada), fluxo de caixa por período e obra. | 7 |
| Alertas | Lista dentro do sistema (sem e-mail): serviços atrasados, contas vencendo em até 7 dias ou vencidas, diários e medições pendentes de revisão. | 7 |
| Exportação | CSV de lançamentos financeiros, medições e orçamento. Impressão do diário e do orçamento. | 7 |
| Auditoria | Registro de quem alterou o quê e quando nas tabelas principais; visualização do histórico por registro. | 4, 8 |

## Fora da Fase 1 (NÃO implementar agora)

| Fase | Item |
|---|---|
| 2 | Estoque de materiais (entradas, consumo, devoluções, saldo, nível mínimo) |
| 2 | Custo de mão de obra a partir de horas, produtividade |
| 2 | Equipamentos: períodos de uso, locações e vencimentos, indisponibilidade |
| 2 | Integração automática de custos da execução no financeiro (com antiduplicidade) |
| 3 | Fotos e áudios no diário, transcrição de voz, sugestões da IA |
| 4 | Estimativa de quantidade por foto, comparação de fotos ao longo do tempo |
| 4 | Boletos e cobranças com banco/provedor, conciliação |
| 4 | Relatórios em PDF gerados no servidor e planilhas XLSX |
| 4 | Acesso de cliente (somente consulta) |
| — | Operação sem internet (decidido: não haverá) |
| — | Alertas por e-mail/WhatsApp |

O modelo de dados da Fase 1 deve deixar espaço para essas fases (ex.: `origem` em medições, `natureza` em lançamentos),
mas sem criar tabelas delas.
