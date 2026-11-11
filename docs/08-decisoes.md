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
