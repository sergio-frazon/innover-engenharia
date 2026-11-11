# Decisões e suposições

## Decisões tomadas com o cliente (11/11/2026)

| # | Tema | Decisão |
|---|---|---|
| D1 | Hospedagem | Vercel (app) + Supabase Cloud (banco, login, arquivos). Desenvolvimento com Supabase local em Docker. |
| D2 | Sem internet | Não haverá operação offline. O sistema exige conexão. |
| D3 | Peso do avanço geral | Pelo valor do serviço no orçamento aprovado (R-PROG-02). Sem orçamento aprovado, pesos iguais. |
| D4 | Escopo da 1ª entrega | Fase 1 (ver `01-escopo.md`). IA, boletos, estoque e acesso de cliente ficam para depois. |
| D5 | Uso | Produção, com usuários reais. |

## Decisões técnicas

| # | Decisão | Motivo |
|---|---|---|
| T1 | Regras de negócio no Postgres (constraints, triggers, RPC, RLS) | Garante integridade mesmo com bug na tela; uma única fonte da verdade. |
| T2 | Status como `text` + `check`, não `enum` | Mais fácil adicionar valores nas próximas fases. |
| T3 | Progresso via funções `security definer` sem valores em R$ | O perfil `campo` precisa ver o avanço, mas não os valores do orçamento. |
| T4 | Gantt próprio, sem biblioteca | Bibliotecas de Gantt gratuitas são frágeis com React 19/SSR; a necessidade da Fase 1 é simples. |
| T5 | Serviços executados no diário são medições | Evita registrar a mesma execução em dois lugares (regra de duplicidade da especificação). |
| T6 | Cronograma no nível de serviço | Liga direto com medições e progresso; etapas são resumo. |
| T7 | Custo realizado por competência; fluxo de caixa por pagamento | Comparar com o orçamento exige competência; caixa exige data de pagamento. |
| T8 | Exportação em CSV (`;`, UTF-8 com BOM) e impressão pelo navegador na Fase 1 | PDF no servidor e XLSX ficam para a Fase 4. |
| T9 | Cadastro público desativado; usuários entram por convite | Sistema interno da empresa. |

## Suposições (confirmar com o cliente quando possível)

| # | Suposição | Impacto se estiver errada |
|---|---|---|
| S1 | O gestor pode aprovar medições e diários lançados por ele mesmo. | Exigiria um segundo aprovador. Mudança pequena (trigger). |
| S2 | Duração no cronograma em **dias corridos** (não úteis). | Calcular dias úteis exige calendário de feriados. |
| S3 | Cadastros (pessoas, materiais, profissionais, equipamentos) são da empresa, compartilhados entre obras. | Se forem por obra, adicionar `obra_id`. |
| S4 | Tamanho máximo de arquivo: 50 MB (documentos) e 10 MB (comprovantes). | Ajustar no bucket. |
| S5 | Fotos e áudios não existem na Fase 1, então a retenção deles fica para a Fase 3. | — |
| S6 | "Tipos de obra atendidos" (seção 8) não muda o sistema na Fase 1: a estrutura etapa → serviço serve para qualquer tipo. | Se houver modelos prontos por tipo de obra, criar "modelos de orçamento" numa próxima fase. |
| S7 | Backup: o plano gratuito do Supabase não tem backup gerenciado. **Recomendação:** plano Pro (backup diário, 7 dias de restauração) antes de colocar dados reais. | Sem o Pro, configurar um `pg_dump` agendado. |
| S8 | Moeda única BRL; sem impostos calculados automaticamente. | — |
| S9 | E-mails (convite e recuperação) saem por SMTP próprio em produção (ex.: Resend, Brevo). | O SMTP padrão do Supabase tem limite de poucos e-mails por hora. |

## Registro durante a execução

<!-- O Claude acrescenta aqui qualquer escolha feita durante a implementação que não estava nos documentos. Formato: data · passo · decisão · motivo -->

| Data | Passo | Decisão | Motivo |
|---|---|---|---|
| 11/11/2026 | 3–6 | `ligar_via_rpc()`/`desligar_via_rpc()`: a liberação para mudar `status` é desligada ao fim de cada RPC. | Os testes mostraram que, ligada até o fim da transação, ela liberaria mudanças diretas posteriores na mesma transação. |
| 11/11/2026 | 7 | Na situação da parcela, `parcial` tem precedência sobre `vencida` (como em R-FIN-02); a tela pinta a data de vermelho e o alerta de "conta vencida" usa o vencimento, não a situação. | Parcela paga em parte e vencida não pode sumir dos alertas. |
| 11/11/2026 | 8 | Progresso por funções `security definer` sem colunas em R$ (`progresso_servicos/etapas/obras`) e alertas na view `v_alertas`. | Campo vê avanço sem ver valores. |
| 11/11/2026 | 16 | Nova migration `0008`: RPC `salvar_atividade_cronograma` grava a atividade, os sucessores empurrados e as dependências numa só transação (security invoker). | Com várias chamadas separadas, a revalidação de dependências falharia no meio do caminho. |
| 11/11/2026 | 15 | Itens do orçamento são editados em diálogo (não "inline" na tabela). | Mais confiável no celular e com validação por campo; mesma funcionalidade. |
| 11/11/2026 | 11 | Convite chega com os tokens no fragmento da URL; `/auth/confirmar` envia os tokens a `/auth/sessao`, que grava a sessão pelo servidor. | O cliente do navegador disputava o processamento do link e travava. |
| 11/11/2026 | 14 | Páginas sem permissão mostram a tela 404, mas o código HTTP pode ser 200 (streaming do Next). Verificado que nenhum dado vaza no conteúdo. | Limitação do streaming do App Router; a segurança real é o RLS. |
| 11/11/2026 | 14 | `getObra` busca o nome do cliente em `v_pessoas_basico` quando o perfil não lê `pessoas`. | Campo via "Sem cliente". |
| 11/11/2026 | 17 | Medição de diário: `obra_id` é enviado no insert (o trigger confirma pela obra do serviço). | Tipagem gerada exige a coluna. |
| 11/11/2026 | testes | Links de convite e recuperação passam a usar `token_hash` validado no servidor (`/auth/verificar`) com templates em português (`supabase/templates`); validade 24 h. | Links PKCE só funcionavam no mesmo navegador; e-mails vinham em inglês; convite de 1 h é curto para uso real. |
| 11/11/2026 | segurança | Revisão de segurança: Next 15.5.29/React 19.1.10, zod 4, migration 0009 (anon sem acesso, `sessao_interna()`, materiais só para quem vê R$), CSP/HSTS, redirecionamento seguro, CSV sem fórmulas. Detalhes em `docs/10-seguranca.md`. | Pedido antes do deploy. |
| 11/11/2026 | limpeza | Ações do servidor unificadas em `lib/acao-servidor.ts` (`executar`, `falha`, grupos de papéis); hook `useAcao` no lugar de 4 cópias; CSV com checagem de papel única; formatadores numéricos em cache; `getObra` e `criarDiario` com menos consultas; índices em `lancamentos`; código morto removido (9 componentes, 4 dependências). | Pedido de padronização do código. |

