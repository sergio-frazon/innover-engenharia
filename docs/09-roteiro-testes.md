# Roteiro de testes manuais (antes do deploy)

Ambiente: http://localhost:3000, com o Supabase local rodando no Docker.
A senha de todos os usuários de teste fica no topo de `supabase/seed.sql`.
Os e-mails enviados (convites e recuperação de senha) aparecem em http://localhost:54324.

Para voltar o banco ao estado inicial a qualquer momento, rode `npx supabase db reset`.
Isso apaga tudo o que você criou durante o teste.

Dica: use uma janela anônima para cada usuário. Assim dá para ficar logado com dois perfis ao mesmo tempo, por exemplo o campo lançando e o gestor aprovando.

Marque cada item com [x] à medida que testar e anote o que achar estranho no fim do arquivo.

---

## 1. Acesso

- [ ] Entrar com `admin@teste.local`. O menu mostra Obras, Financeiro, Cadastros e Administração.
- [ ] Entrar com `inativo@teste.local`. O acesso deve ser recusado.
- [ ] "Esqueci minha senha" com `gestor@teste.local`: o e-mail chega no Mailpit, o link abre a tela de nova senha e o login funciona com a senha nova.
- [ ] Como admin, vá em **Administração → Usuários** e convide um e-mail qualquer (por exemplo `teste1@teste.local`) com o perfil Campo.
  Abra o e-mail no Mailpit, defina a senha e confirme que você entra como Campo.
- [ ] Desativar esse usuário e confirmar que ele não entra mais.

## 2. Obras e cadastros (admin ou gestor)

- [ ] Criar uma pessoa (cliente) com CPF/CNPJ inválido. Deve recusar.
- [ ] Criar uma obra nova. O código OB-AAAA-NNN deve ser gerado sozinho.
- [ ] Adicionar membros à obra (gestor, campo, financeiro).
- [ ] Em **Planejamento**, criar etapas e serviços, mudar a ordem e editar um serviço.

## 3. Orçamento e cronograma

- [ ] Montar o orçamento em rascunho, aprovar e confirmar que não dá mais para editar.
- [ ] Criar uma revisão. Ela nasce como cópia da aprovada; altere um valor e aprove. A versão antiga vira "substituída".
- [ ] Exportar o orçamento em CSV e abrir no Excel. Confira os acentos e os valores.
- [ ] No cronograma, mudar a data de uma atividade que tem sucessoras e usar "empurrar sucessores".
- [ ] Tentar criar uma dependência circular (A depende de B, e B depende de A). Deve ser recusada.

## 4. Diário de obra (use o celular de verdade, se possível)

Para testar no celular, ele precisa estar na mesma rede Wi-Fi do PC.
Acesse `http://IP-DO-PC:3000` (o IP aparece com `ipconfig`).
Se o login não funcionar pelo IP, teste no navegador do PC com a janela estreita (F12 → modo celular).

- [ ] Entrar como `campo@teste.local` e abrir **Diário de hoje** da obra *Residencial Jardim das Flores*.
- [ ] Preencher equipe, clima, serviços executados, materiais e uma ocorrência.
- [ ] Lançar uma quantidade maior que o restante do serviço. Deve aparecer o aviso pedindo justificativa.
- [ ] Enviar o diário. Depois de enviado, o campo não consegue mais editar.
- [ ] Confirmar que o campo **não vê nenhum valor em R$** em nenhuma tela.
- [ ] Como `gestor@teste.local`, abrir o diário e pedir correção. O campo edita e reenvia; depois o gestor aprova.
- [ ] Depois da aprovação, o avanço físico da obra no painel deve subir.
- [ ] **Imprimir o diário** (botão Imprimir → Ctrl+P, ou "Salvar como PDF"). Confira se cabe bem na folha A4. *(Ainda não testado.)*

## 5. Medições

- [ ] Como campo, lançar uma medição avulsa e enviar.
- [ ] Como gestor, aprovar algumas medições em lote e rejeitar outra com motivo.
- [ ] Tentar lançar duas vezes a mesma medição (mesmo serviço e mesma data). Deve avisar.
- [ ] Exportar as medições em CSV.

## 6. Documentos *(ainda não testado no navegador)*

- [ ] Enviar um PDF e uma foto na aba **Documentos** da obra. A barra de progresso deve andar até o fim.
- [ ] Baixar o arquivo enviado e conferir que ele abre.
- [ ] Enviar uma nova versão do mesmo documento. A lista mostra a versão atual e o histórico.
- [ ] Tentar enviar um arquivo com mais de 50 MB. Deve recusar.
- [ ] Entrar como `gestor2@teste.local` e confirmar que ele não vê os documentos da obra A.

## 7. Financeiro (use `financeiro@teste.local`)

- [ ] Criar uma conta a pagar em 3 parcelas. A soma das parcelas deve bater com o total.
- [ ] Criar outra conta igual (mesma pessoa, valor e vencimento). Deve aparecer o aviso de duplicidade.
- [ ] Registrar o pagamento parcial de uma parcela **anexando um comprovante** (PDF ou foto). *(O upload ainda não foi testado.)*
- [ ] Baixar o comprovante pela tela do lançamento.
- [ ] Estornar esse pagamento. A parcela volta a ficar em aberto.
- [ ] Cancelar um lançamento e confirmar que ele sai dos totais.
- [ ] Abrir o **Fluxo de caixa** e conferir se o gráfico bate com as contas.
- [ ] Exportar a lista em CSV.
- [ ] Como `campo@teste.local`, tentar abrir `/financeiro` digitando o endereço. Deve ser bloqueado.

## 8. Painel, alertas e histórico

- [ ] O painel de cada perfil mostra só o que faz sentido para ele: o campo vê o diário de hoje, e o financeiro vê as contas vencidas.
- [ ] Clicar em cada alerta leva para a tela certa.
- [ ] Na aba **Histórico** da obra (admin ou gestor), as alterações que você fez aparecem com quem fez e quando.

## 9. Teste com o seu pai (o mais importante)

- [ ] Ele cadastra uma obra real dele, do zero, sem ajuda, e diz onde travou.
- [ ] Ele lança o orçamento de verdade de uma obra. Confira se os campos e unidades fazem sentido para o dia a dia dele.
- [ ] Alguém da equipe de campo usa o diário pelo celular, no canteiro.

---

## Anotações / problemas encontrados

| Tela | O que aconteceu | Usuário |
|---|---|---|
| | | |
