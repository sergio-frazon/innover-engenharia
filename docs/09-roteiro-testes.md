# Roteiro de testes manuais (antes do deploy)

Ambiente: http://localhost:3000, com o Supabase local rodando no Docker.
A senha de todos os usuários de teste fica no topo de `supabase/seed.sql`.
Os e-mails enviados (convites e recuperação de senha) aparecem em http://localhost:54324.

Para voltar o banco ao estado inicial a qualquer momento, rode `npx supabase db reset`.
Isso apaga tudo o que você criou durante o teste e invalida os links dos e-mails antigos.

Links de e-mail: use sempre o e-mail **mais recente** (o primeiro da lista no Mailpit). Cada link funciona uma vez
e vale 24 horas. Na recuperação de senha, o e-mail só é enviado se o usuário existir.

Dica: use uma janela anônima para cada usuário. Assim dá para ficar logado com dois perfis ao mesmo tempo, por exemplo o campo lançando e o gestor aprovando.

Marque cada item com [x] à medida que testar e anote o que achar estranho no fim do arquivo.

---

## 1. Acesso

- [x] Entrar com `admin@teste.local`. O menu mostra Obras, Financeiro, Cadastros e Administração.
- [x] Entrar com `inativo@teste.local`. O acesso deve ser recusado.
- [x] "Esqueci minha senha" com `gestor@teste.local`: o e-mail chega no Mailpit, o link abre a tela de nova senha e o login funciona com a senha nova.
- [x] Como admin, vá em **Administração → Usuários** e convide um e-mail qualquer (por exemplo `teste1@teste.local`) com o perfil Campo.
  Abra o e-mail no Mailpit, defina a senha e confirme que você entra como Campo.
- [x] Desativar esse usuário e confirmar que ele não entra mais.

## 2. Obras e cadastros (admin ou gestor)

- [x] Criar uma pessoa (cliente) com CPF/CNPJ inválido. Deve recusar.
- [x] Criar uma obra nova. O código OB-AAAA-NNN deve ser gerado sozinho.
- [x] Adicionar membros à obra (gestor, campo, financeiro).
- [x] Em **Planejamento**, criar etapas e serviços, mudar a ordem e editar um serviço.

## 3. Orçamento e cronograma

- [x] Montar o orçamento em rascunho, aprovar e confirmar que não dá mais para editar.
- [x] Criar uma revisão. Ela nasce como cópia da aprovada; altere um valor e aprove. A versão antiga vira "substituída".
- [x] Exportar o orçamento em CSV e abrir no Excel. Confira os acentos e os valores. *(Formato conferido: BOM UTF-8, `;`, vírgula decimal. Falta abrir no Excel de verdade.)*
- [x] No cronograma, mudar a data de uma atividade que tem sucessoras e usar "empurrar sucessores".
- [x] Tentar criar uma dependência circular (A depende de B, e B depende de A). Deve ser recusada.

## 4. Diário de obra (use o celular de verdade, se possível)

Para testar no celular, ele precisa estar na mesma rede Wi-Fi do PC.
Acesse `http://IP-DO-PC:3000` (o IP aparece com `ipconfig`).
Se o login não funcionar pelo IP, teste no navegador do PC com a janela estreita (F12 → modo celular).

- [x] Entrar como `campo@teste.local` e abrir **Diário de hoje** da obra *Residencial Jardim das Flores*.
- [x] Preencher equipe, clima, serviços executados, materiais e uma ocorrência.
- [x] Lançar uma quantidade maior que o restante do serviço. Deve aparecer o aviso pedindo justificativa.
- [x] Enviar o diário. Depois de enviado, o campo não consegue mais editar.
- [x] Confirmar que o campo **não vê nenhum valor em R$** em nenhuma tela.
- [x] Como `gestor@teste.local`, abrir o diário e pedir correção. O campo edita e reenvia; depois o gestor aprova.
- [x] Depois da aprovação, o avanço físico da obra no painel deve subir.
- [ ] **Imprimir o diário** (botão Imprimir → Ctrl+P, ou "Salvar como PDF"). Confira se cabe bem na folha A4. *(Layout conferido na largura A4 em 12/11/2026; falta imprimir de verdade.)*

## 5. Medições

- [x] Como campo, lançar uma medição avulsa e enviar.
- [x] Como gestor, aprovar algumas medições em lote e rejeitar outra com motivo.
- [x] Tentar lançar duas vezes a mesma medição (mesmo serviço e mesma data). Deve avisar.
- [x] Exportar as medições em CSV.

## 6. Documentos

- [x] Enviar um PDF e uma foto na aba **Documentos** da obra. A barra de progresso deve andar até o fim.
- [x] Baixar o arquivo enviado e conferir que ele abre.
- [x] Enviar uma nova versão do mesmo documento. A lista mostra a versão atual e o histórico.
- [x] Tentar enviar um arquivo com mais de 50 MB. Deve recusar.
- [x] Entrar como `gestor2@teste.local` e confirmar que ele não vê os documentos da obra A.

## 7. Financeiro (use `financeiro@teste.local`)

- [x] Criar uma conta a pagar em 3 parcelas. A soma das parcelas deve bater com o total.
- [x] Criar outra conta igual (mesma pessoa, valor e vencimento). Deve aparecer o aviso de duplicidade.
- [x] Registrar o pagamento parcial de uma parcela **anexando um comprovante** (PDF ou foto).
- [x] Baixar o comprovante pela tela do lançamento.
- [x] Estornar esse pagamento. A parcela volta a ficar em aberto.
- [x] Cancelar um lançamento e confirmar que ele sai dos totais.
- [x] Abrir o **Fluxo de caixa** e conferir se o gráfico bate com as contas.
- [x] Exportar a lista em CSV.
- [x] Como `campo@teste.local`, tentar abrir `/financeiro` digitando o endereço. Deve ser bloqueado.

## 8. Painel, alertas e histórico

- [x] O painel de cada perfil mostra só o que faz sentido para ele: o campo vê o diário de hoje, e o financeiro vê as contas vencidas.
- [x] Clicar em cada alerta leva para a tela certa.
- [x] Na aba **Histórico** da obra (admin ou gestor), as alterações que você fez aparecem com quem fez e quando.

## 9. Teste com o seu pai (o mais importante)

- [ ] Ele cadastra uma obra real dele, do zero, sem ajuda, e diz onde travou.
- [ ] Ele lança o orçamento de verdade de uma obra. Confira se os campos e unidades fazem sentido para o dia a dia dele.
- [ ] Alguém da equipe de campo usa o diário pelo celular, no canteiro.

---

## Anotações / problemas encontrados

Rodada de 12/11/2026 (Claude, navegador do app, banco recém-resetado). Seções 1 a 8 executadas; a seção 9 é com o usuário real.

| Tela | O que aconteceu | Usuário | Situação |
|---|---|---|---|
| Vários formulários (cadastro de pessoa, medição avulsa, login...) | Quando o servidor recusava o envio (CPF inválido, medição duplicada, senha errada), o formulário **apagava o que foi digitado**. Causa: o React 19 limpa todo `<form action>` ao fim do envio. | admin, campo | **Corrigido**: novo componente `<Formulario>` (`components/comum/formulario.tsx`) só limpa os campos quando o servidor aceita. Conferido no navegador. |
| Obra → Histórico | Valores crus: data/hora em ISO, usuários como UUID, nomes de coluna sem acento (`duracao dias`). | gestor | **Corrigido**: datas em pt-BR, nomes de pessoas/etapas/serviços, valores em R$ e rótulos com acento (`lib/auditoria.ts`, com testes). |
| Painel / Fluxo de caixa | Valores em R$ estouravam a caixa dos indicadores em telas médias. | financeiro | **Corrigido**: o tamanho acompanha a largura do cartão. |
| Orçamento → Comparar | Linhas fora da ordem de código (1.2, 2.1, 1.1). | admin | **Corrigido**: ordem por código, igual ao CSV. |
| Administração → Usuários | Em ~1000 px a tabela cortava os botões de ação. | admin | **Corrigido**: abaixo de 1280 px a lista vira cartões. |
| Medições → CSV | Arquivo saía como `medicoes.csv`, sem o código da obra. | gestor | **Corrigido**: `medicoes-OB-2026-001.csv`. |
| Lançamento financeiro | A aba mostrava só "Gestão de Obras". | financeiro | **Corrigido**: mostra a descrição do lançamento. |
| Planejamento | Ao fechar o diálogo, o título trocava para "Novo serviço" durante a animação. | admin | **Corrigido**: mantém o último título até fechar. |
| Páginas bloqueadas (404) | A aba mostrava o nome da página negada (ex.: "Contas a pagar e receber"). | campo | **Corrigido**: a aba mostra "Página não encontrada". |
| Páginas bloqueadas (404) | A resposta HTTP é 200, não 404. O conteúdo é bloqueado corretamente. | — | **Não corrigido (aceito)**: efeito do carregamento progressivo (`(app)/loading.tsx`); mudar exigiria tirar o "carregando" de todas as telas. Não afeta a segurança. |

Ambiente: não rode dois `npm run dev` ao mesmo tempo na mesma pasta, nem `npm run build` com o `dev` aberto. Eles brigam pela pasta `.next` e as páginas dão erro 500 ou param de responder a cliques. Se acontecer, feche os servidores, apague a pasta `.next` e rode `npm run dev` de novo.
