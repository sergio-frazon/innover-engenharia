# Telas e rotas

## Princípios de interface

- **Celular primeiro** para o perfil `campo` (diário e medições). Botões com no mínimo 44px de altura, formulários em uma coluna.
- Computador: menu lateral fixo. Celular: menu em gaveta (Sheet) + barra inferior com atalhos (Painel, Diário de hoje, Alertas).
- Visual sóbrio: fundo claro, uma cor de destaque (azul), cores de status consistentes:
  rascunho = cinza · enviado/pendente = âmbar · aprovado/pago/concluído = verde · rejeitado/vencido/atrasado = vermelho · correção = laranja.
- Todo status aparece como `Badge` com texto (nunca só cor).
- Listas com busca, filtros e paginação de 25 itens. Estado vazio com explicação e botão de ação ("Nenhuma obra ainda. Cadastrar obra").
- Confirmação (Dialog) antes de aprovar, rejeitar, cancelar, estornar, desativar ou descartar.
- Toast (sonner) após salvar. Erros de validação abaixo do campo.
- Datas `dd/mm/aaaa`, moeda `R$ 1.234,56`, números `1.234,5`. Campos numéricos aceitam vírgula.
- Itens de menu e botões aparecem apenas para os perfis que podem usá-los (`05-permissoes.md`).

## Mapa de rotas

| Rota | Perfis | Conteúdo |
|---|---|---|
| `/login` | público | E-mail, senha, "Esqueci minha senha" |
| `/recuperar-senha` | público | Envia e-mail de recuperação |
| `/redefinir-senha` | logado via link | Nova senha + confirmação (mín. 8 caracteres) |
| `/painel` | todos | Painel geral (abaixo) |
| `/obras` | todos | Lista de obras com filtros |
| `/obras/nova` | admin, gestor | Formulário de obra |
| `/obras/[obraId]` | membros | Painel da obra (abas abaixo) |
| `/obras/[obraId]/editar` | admin, gestor | Formulário de obra + membros |
| `/obras/[obraId]/planejamento` | membros | Etapas e serviços |
| `/obras/[obraId]/orcamento` | admin, gestor, financeiro | Orçamento e versões |
| `/obras/[obraId]/cronograma` | membros | Gantt e versões |
| `/obras/[obraId]/diario` | admin, gestor, campo | Lista de diários (calendário + lista) |
| `/obras/[obraId]/diario/[data]` | admin, gestor, campo | Diário do dia (`data` = `aaaa-mm-dd`) |
| `/obras/[obraId]/diario/[data]/imprimir` | admin, gestor, campo | Versão para impressão/PDF |
| `/obras/[obraId]/medicoes` | admin, gestor, campo | Medições da obra |
| `/obras/[obraId]/documentos` | membros | Documentos e versões |
| `/obras/[obraId]/financeiro` | admin, gestor (leitura), financeiro | Lançamentos da obra + previsto × realizado |
| `/obras/[obraId]/historico` | admin, gestor | Auditoria da obra |
| `/financeiro` | admin, financeiro | Contas a pagar e a receber (todas as obras) |
| `/financeiro/novo` | admin, financeiro | Novo lançamento |
| `/financeiro/[lancamentoId]` | admin, financeiro, gestor (leitura) | Detalhe, parcelas, baixas |
| `/financeiro/fluxo-caixa` | admin, financeiro | Fluxo de caixa |
| `/cadastros/pessoas` | admin, gestor, financeiro | Clientes, fornecedores e prestadores |
| `/cadastros/profissionais` | admin, gestor | Profissionais |
| `/cadastros/materiais` | admin, gestor | Materiais |
| `/cadastros/equipamentos` | admin, gestor | Equipamentos |
| `/cadastros/categorias` | admin, financeiro | Categorias financeiras |
| `/alertas` | todos | Lista de alertas (R-ALE) |
| `/admin/usuarios` | admin | Usuários: lista, convidar, editar, desativar, obras de acesso |
| `/perfil` | todos | Nome, telefone, trocar senha |

Página sem permissão → `notFound()` (não revelar que existe).

## Detalhe das telas principais

### Painel geral (`/painel`)
- Cartões: obras em andamento · serviços atrasados · diários/medições pendentes de revisão (gestor) · contas vencidas e a vencer em 7 dias (financeiro).
- Tabela de obras em andamento: código, nome, responsável, avanço físico (barra), situação de prazo, pendências. Para admin/financeiro/gestor: orçado × realizado.
- Perfil `campo`: em vez dos cartões financeiros, botão grande "Diário de hoje" por obra.

### Lista de obras (`/obras`)
- Busca por nome/código/cliente. Filtros: situação, responsável, período (obras cujo intervalo previsto cruza o período).
- Colunas: código, nome, cliente, responsável, situação, início/fim previstos, avanço. Celular: cards.

### Painel da obra (`/obras/[obraId]`)
- Cabeçalho: código, nome, situação (badge), cliente, responsável, datas previstas/reais. Abas de navegação para as sub-rotas.
- Cartões: avanço físico (%) · serviços atrasados · custo previsto × realizado com diferença em R$ e % (sem `campo`) · pendências.
- Gráfico de barras horizontais: avanço por etapa (recharts).
- Lista "Atenção": serviços atrasados/em risco e etapas sem orçamento.
- Avisos R-PROG-03 e R-PROG-04 quando aplicáveis.

### Planejamento (`/obras/[obraId]/planejamento`)
- Árvore etapa → serviços (tabela agrupada). Colunas: código, descrição, unidade, qtd. prevista, qtd. aprovada, %, peso %, responsável, situação de prazo.
- Ações (gestor): nova etapa, novo serviço (Dialog), editar, reordenar (setas ↑↓), desativar.
- Cada etapa mostra os documentos vinculados (link para a aba de documentos filtrada).
- Botão "Histórico" por linha (auditoria do registro em Sheet lateral).

### Orçamento (`/obras/[obraId]/orcamento`)
- Seletor de versão: "v3 — Aprovada em 10/11/2026 por Fulano", rascunho e substituídas.
- Sem nenhuma versão: botão "Criar orçamento" (cria v1 rascunho).
- Tabela agrupada etapa → serviço → itens: natureza, descrição, unidade, quantidade, valor unitário, total. Subtotais por serviço e etapa; total geral no rodapé.
- Rascunho: edição inline dos itens (adicionar linha, duplicar, remover), seleção de material do cadastro preenche descrição/unidade/custo.
- Ações: "Criar revisão" (se há aprovada e não há rascunho), "Aprovar versão", "Descartar rascunho".
- Aba "Comparar": rascunho × aprovada por serviço (R-ORC-04) e aprovada × realizado por etapa e natureza (R-ORC-03), com diferença colorida.
- Exportar CSV · Imprimir.

### Cronograma (`/obras/[obraId]/cronograma`)
- Seletor de versão (igual ao orçamento). `campo` vê só a aprovada.
- **Gantt próprio**: coluna fixa à esquerda (código, serviço, início, fim, duração) e área rolável horizontalmente com escala por semana (cabeçalho mês/semana); linha vertical em "hoje".
  Cada serviço: barra prevista (cor da situação, R-PRZ-02) com o % preenchido; barra real fina abaixo. Etapas como linha-resumo (do menor início ao maior fim).
  Dependências: na Fase 1, listadas como texto na coluna "Depende de" (setas desenhadas são opcionais).
- Rascunho: editar datas por formulário na linha (Dialog), definir predecessores (multiselect), "Empurrar sucessores" (R-PRZ-04).
- Alternância "Gantt / Lista". No celular, abre a lista por padrão.
- Comparação baseline: ao visualizar o rascunho, mostrar a barra da aprovada em contorno tracejado.

### Diário (`/obras/[obraId]/diario` e `/[data]`)
- Lista: calendário do mês com dia colorido pelo status + lista dos últimos diários. Botão "Diário de hoje" (cria se não existir; R-DIA-08).
- Tela do diário, seções em cards empilhados (celular) ou duas colunas (computador):
  1. Cabeçalho: data, status, horários, clima manhã/tarde (botões com ícones).
  2. Equipe: linhas (profissional ou nome livre, função, quantidade, horas).
  3. **Serviços executados** (= medições): selecionar serviço (busca por código/descrição; mostra unidade e saldo previsto restante), quantidade, local, observação. Aviso de excesso em tempo real (R-MED-03) com campo de justificativa.
  4. Materiais aplicados, 5. Equipamentos, 6. Ocorrências (tipo, hora, descrição).
  7. Resumo das atividades, observações, impedimentos (textareas).
- Salvamento: botão "Salvar rascunho" fixo no rodapé no celular. Aviso ao sair com alterações não salvas.
- Barra de ações por status/perfil: "Enviar para conferência" (campo/gestor) · "Aprovar" · "Solicitar correção" (gestor) · comentário de correção em destaque (Alert laranja).
- Indicação R-DIA-04 quando editado após aprovação. Botão "Imprimir".
- Imprimir: layout A4 com cabeçalho da obra, todas as seções, campos de assinatura (responsável técnico / encarregado). CSS `@media print`.

### Medições (`/obras/[obraId]/medicoes`)
- Abas: "Pendentes de aprovação" (gestor) · "Todas".
- Filtros: serviço, etapa, status, período, origem.
- Colunas: data/período, serviço, quantidade + unidade, local, origem (link para o diário), status, criado por, revisado por.
- Nova medição avulsa (Dialog). Aprovar/rejeitar em lote (checkbox) para avulsas; medições de diário levam ao diário.
- Destaque de excesso e da justificativa.
- Exportar CSV.

### Documentos (`/obras/[obraId]/documentos`)
- Lista da versão atual de cada documento: título, categoria, etapa, versão, data, enviado por, tamanho. Filtros por categoria e etapa.
- "Enviar documento" (título, categoria, etapa, arquivo, observação) com barra de progresso de upload.
- Por documento: "Enviar nova versão" e "Versões" (lista com download de cada uma).

### Financeiro (`/financeiro`)
- Abas: A pagar · A receber. Filtros: situação (padrão: abertas + vencidas + parciais), obra, pessoa, categoria, vencimento (de/até), busca.
- Lista por **parcela**: vencimento, descrição (n/N), pessoa, obra, valor, pago, saldo, situação. Totais do filtro no rodapé.
- Ação rápida "Registrar pagamento/recebimento" na linha (Dialog: data, valor — preenchido com o saldo, juros/multa, desconto, forma, comprovante).
- Exportar CSV.

### Novo lançamento (`/financeiro/novo`)
- Tipo (pagar/receber), descrição, categoria (filtrada pelo tipo), pessoa, obra, etapa (filtrada pela obra), natureza (se pagar com obra), nº do documento, competência, valor total.
- Parcelamento: "À vista" ou "Parcelado" (nº de parcelas + 1º vencimento + intervalo mensal) → gera tabela de parcelas editável; mostra diferença se a soma não fechar.
- Aviso de possível duplicidade (R-FIN-09).

### Detalhe do lançamento (`/financeiro/[lancamentoId]`)
- Dados, parcelas com situação, baixas de cada parcela (com comprovante e estornos), histórico de auditoria.
- Ações: editar (enquanto sem baixa), cancelar, registrar baixa, estornar baixa.

### Fluxo de caixa (`/financeiro/fluxo-caixa`)
- Filtros: período, obra, agrupamento (dia/semana/mês).
- Gráfico de barras (entradas × saídas) + linha de saldo acumulado; tabela abaixo com realizado e previsto (R-FIN-06).

### Usuários (`/admin/usuarios`)
- Lista: nome, e-mail, perfil, obras, situação (ativo/inativo), último acesso.
- Convidar: nome, e-mail, perfil, obras (multiselect). Editar: perfil, obras, telefone. Desativar/reativar com confirmação. Reenviar convite.
- Admin não pode desativar a si mesmo nem rebaixar o último admin ativo (validar na action e em trigger).
