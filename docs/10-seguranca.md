# Revisão de segurança antes do deploy — 11/11/2026

Ambiente testado: Supabase local (Docker) + Next.js local, com os usuários do seed.
Os testes atacam a API do Supabase **diretamente** (como faria alguém com a chave pública do site),
sem passar pelas telas, que não são uma barreira de segurança.

## Resultado

| Verificação | Resultado |
|---|---|
| Ataques diretos à API e aos arquivos (`scripts/teste-seguranca.ts`) | **113/113 barrados** |
| Testes de regras e permissões no banco (pgTAP) | 137/137 |
| Testes unitários (Vitest) | 20/20 |
| `npm audit` das dependências que vão para produção | **0 vulnerabilidades** |
| Chave secreta (`service_role`) nos arquivos enviados ao navegador | Não encontrada |
| Lint, typecheck e build de produção | Sem erros |

## Falhas encontradas e corrigidas

| # | Gravidade | Problema | Correção |
|---|---|---|---|
| 1 | **Crítica** | Next.js 15.5.4 tinha falhas públicas graves, entre elas execução remota de código no servidor (protocolo React Server Components), vazamento do código das Server Actions e desvio do middleware de login. | Atualizado para Next.js 15.5.29 e React 19.1.10 (mesma linha, só correções). |
| 2 | **Alta** | Um visitante **sem login** chegava à função que cria lançamentos financeiros. As funções do banco tratavam "sem usuário" como "processo interno confiável", e o papel `anon` podia executá-las. Só não gravou por um erro acidental de dado. | Nova função `sessao_interna()`: só migrations, seed, o Auth e a chave secreta do servidor são confiáveis; o visitante anônimo nunca é. Migration `0009_seguranca`: o `anon` perdeu acesso a todas as tabelas, views e funções do schema `public`. |
| 3 | **Alta** | O perfil campo lia o **custo unitário dos materiais (R$)** chamando a API direto. A tela não mostrava, mas o dado estava acessível. | A tabela `materiais` passou a ser lida só por admin, gestor e financeiro. O campo usa a view `v_materiais_basico`, sem custo. |
| 4 | Média | **Redirecionamento aberto:** um link de login como `/login?voltar=/\site-falso.com` mandaria o usuário, depois de entrar, para um site externo (útil em golpes de phishing). | Função única `caminhoInterno()`, usada no login e nos links de e-mail; recusa `//`, `\` e caracteres de controle. Tem teste unitário. |
| 5 | Média | **Fórmulas nas planilhas CSV:** uma descrição como `=HYPERLINK(...)` viraria fórmula ao abrir o CSV no Excel. | Textos que começam com `= + - @` saem com `'` na frente. Tem teste unitário. |
| 6 | Média | `zod` 3 (validação de formulários) tinha um alerta de consumo excessivo de memória, sem correção na versão 3. | Migrado para zod 4.6.7. Os IDs passaram a usar `z.guid()`, porque o `.uuid()` do zod 4 recusaria os IDs do seed. Há teste das mensagens de validação. |
| 7 | Baixa | Senha mínima de 6 caracteres na API do Auth (as telas já exigiam 8). | Mínimo de 8 também no Auth (config local + passo no README para produção). |
| 8 | Baixa | Outro site podia chamar `/auth/sessao` e logar o navegador da vítima em outra conta. | A rota só aceita chamadas da própria origem (testado: 403). |
| 9 | Baixa | Sem `Content-Security-Policy` nem `Strict-Transport-Security`. | CSP (só a própria origem + Supabase; sem iframes, sem plugins) e HSTS de 2 anos. Upload e download testados no navegador com o CSP ativo. |
| 10 | Baixa | `TRUNCATE`, `TRIGGER` e `REFERENCES` concedidos ao usuário logado; funções internas (`atualizar_datas_reais_servico`, `validar_excesso_medicao`, etc.) chamáveis pela API. | Privilégios retirados. |
| 11 | Baixa | `v_custo_obra` devolvia linhas zeradas para o campo (sem valores reais, mas desnecessário). | A view filtra por perfil. |
| 12 | Baixa | Otimizador de imagens do Next e `sharp` com alertas. | Otimizador desligado (só há a logo local) e `sharp`/`postcss` fixados em versões corrigidas. |

## O que os ataques cobrem

- **Visitante sem login:** não lê nenhuma das 36 tabelas/views, não chama funções, não se cadastra e não lista nem baixa arquivos.
- **Usuário desativado:** não consegue token. Mesmo com um token antigo, o banco não devolve nada.
- **Campo:**
  - Não lê nada com R$ (orçamento, lançamentos, parcelas, pagamentos, custos, materiais, fluxo de caixa) nem a auditoria.
  - Não vira admin nem troca o próprio e-mail.
  - Não aprova diário (nem pela função, nem mudando o status direto).
  - Não lança medição em obra alheia e não cria lançamento.
  - Não chama funções internas.
- **Gestor de outra obra:** não lê, não edita e não aprova nada da obra A; não se coloca como membro dela.
- **Financeiro:**
  - Não aprova diário nem mexe no orçamento.
  - Não altera o valor de um lançamento direto na tabela.
  - Não apaga pagamento (só estorna).
  - Não vê obra que não é dele.
- **Gestor:**
  - Não vira admin e não edita o perfil de outra pessoa.
  - Não apaga nem forja a auditoria.
  - Não apaga obra e não edita orçamento aprovado.
- **Arquivos:**
  - Ninguém baixa, lista nem gera link de documento de obra alheia.
  - Não se envia HTML nem SVG.
  - Não se sobrescreve nem apaga documento.
  - Comprovantes só para admin e financeiro, e só das obras deles.

## Pontos conhecidos (aceitos)

- **Dependências de desenvolvimento** (nada disso vai para produção; `npm audit --omit=dev` = 0). Em 12/11/2026, após os
  alertas do Dependabot: Vitest 3 → 5.1.0 (corrige `tinypool` e `@vitest/mocker`, um deles crítico) e `minimatch`
  forçado para 11.0.8 dentro do ESLint e da CLI do shadcn (via `overrides`). Restam 3 alertas **baixos** do `deepmerge`,
  usado só pela CLI do shadcn (que não roda no build nem no site) e ainda sem versão corrigida.
- **Sair por link:** `/auth/sair` aceita GET, então um link malicioso poderia deslogar alguém. Impacto: só um incômodo.
- **CSP com `'unsafe-inline'` para scripts:** é necessário no Next sem nonce. O React já escapa todo o conteúdo e não há HTML cru no código (`dangerouslySetInnerHTML` não é usado).
- **Gestor vê nome e e-mail dos usuários ativos:** é necessário para adicionar membros às obras.

## Security Advisor do Supabase (produção, 12/11/2026)

Primeira análise do projeto de produção: 2 erros e 57 avisos. Situação de cada grupo:

| Alerta | Qtd. | Situação |
|---|---|---|
| *Security Definer View* em `v_pessoas_basico` e `v_materiais_basico` | 2 erros | **Aceito (intencional).** As views existem para o perfil campo ver só nomes, sem acesso às tabelas: `id, nome, ativo` das pessoas (sem documento, telefone, e-mail) e `id, descricao, unidade, ativo` dos materiais (sem custo). Têm filtro `papel_atual() is not null` (só usuário ativo) e nenhum acesso do `anon`. Coberto por `teste-seguranca.ts`. |
| Funções de gatilho executáveis pelo usuário logado (`auditar`, `*_antes_gravar`, `bloquear_*`...) | ~23 avisos | **Corrigido** na migration `20261112000011_funcoes_gatilho.sql` (EXECUTE retirado). O Postgres já recusava chamá-las pela API, mas não há motivo para ficarem expostas. Os triggers continuam disparando (o EXECUTE só é conferido ao criar o trigger). |
| Ações chamadas pelo sistema (`aprovar_*`, `criar_lancamento`, `estornar_baixa`...) | ~17 avisos | **Aceito (intencional).** São a forma de o sistema executar regras de negócio; cada função confere o papel e a obra de quem chama. Coberto por pgTAP e `teste-seguranca.ts`. |
| Funções usadas pelas políticas RLS (`papel_atual`, `tem_papel`, `acessa_obra`, `pode_*`...) | ~16 avisos | **Aceito (necessário).** O RLS as executa como o usuário logado; sem EXECUTE, todas as consultas falhariam. Só respondem sobre o próprio usuário. |
| *Auth OTP long expiry* (links de e-mail valem 24 h) | 1 aviso | **Aceito (decisão).** O convite precisa sobreviver até a pessoa abrir o e-mail (equipe de campo). Os links são de uso único e chegam só à caixa do próprio usuário; o admin pode reenviar o convite. |

## Depois do deploy (no Supabase de produção)

Os passos estão no README, seção "Colocar no ar":

- [ ] Desativar o cadastro aberto (signup).
- [ ] Senha mínima de 8 caracteres.
- [ ] Proteção contra senhas vazadas.
- [ ] Templates de e-mail em português.
- [ ] Validade dos links de e-mail em 24 h.
- [ ] SMTP próprio.
- [ ] Rodar o **Security Advisor** do painel do Supabase.
- [ ] A `service_role` key só nas variáveis de ambiente da Vercel. Nunca no código nem no GitHub.
- [ ] Rodar `scripts/teste-seguranca.ts` **só** contra o banco local. O script se recusa a rodar contra outro endereço.
