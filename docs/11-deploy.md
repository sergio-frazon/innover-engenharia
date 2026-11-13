# Colocar no ar (produção)

Passo a passo usado no deploy de novembro de 2026 (Supabase + Vercel, ambos na região São Paulo).

> Use um projeto Supabase **novo**, exclusivo deste sistema.

## 1. Supabase

1. Em https://supabase.com, crie um projeto. Região: **South America (São Paulo)**. Guarde a senha do banco.
2. Anote a *Project URL* (**Project Settings → Data API**) e as chaves em **Project Settings → API Keys**: a *anon*
   (ou *Publishable*) e a *service_role* (ou *Secret*). Se só aparecerem as novas, as antigas ficam na aba *Legacy API keys*.
3. No computador, na pasta do projeto:

   ```bash
   npx supabase login
   ```

   ```bash
   npx supabase link --project-ref SEU_PROJECT_REF
   ```

   ```bash
   npx supabase db push --linked
   ```

   O `db push` aplica as migrations. O seed de teste **não** vai para produção.
4. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**. Ninguém se cadastra sozinho: os usuários entram por convite.
5. Em **Authentication → URL Configuration**:
   - *Site URL*: `https://SEU-DOMINIO`
   - *Redirect URLs*: `https://SEU-DOMINIO/**`
6. Em **Authentication → Emails → Templates**, troque os modelos para os que estão em português na pasta
   `supabase/templates/`. Isso é obrigatório: os links do sistema dependem deles.
   O Supabase só libera a edição dos modelos **depois** de configurar o SMTP próprio (passo 8): faça o 8 antes.
   - **Invite user**: assunto `Seu acesso ao sistema de Gestão de Obras`; corpo = conteúdo de `convite.html`.
   - **Reset password**: assunto `Criar nova senha — Gestão de Obras`; corpo = conteúdo de `recuperacao.html`.
7. Em **Authentication → Sign In / Providers → Email**, ajuste **Email OTP Expiration** para `86400`
   (24 horas), para que o convite não expire antes da pessoa abrir o e-mail.
8. Em **Authentication → Emails → SMTP Settings**, configure um SMTP próprio (Resend, Brevo, etc.). O SMTP padrão do Supabase envia poucos e-mails por hora e não serve para uso real.
9. Em **Authentication → Sign In / Providers → Email**, ajuste **Minimum password length** para `8`
   (o mesmo mínimo exigido pelas telas).
10. Em **Authentication → Attack Protection**, ative **Prevent use of leaked passwords** (plano Pro).
11. Em **Advisors → Security Advisor**, rode a análise. O resultado esperado são 2 erros (*Security Definer View*
    em `v_pessoas_basico` e `v_materiais_basico`) e cerca de 36 avisos, todos intencionais e explicados em
    [`docs/10-seguranca.md`](docs/10-seguranca.md). Qualquer alerta fora dessa lista precisa ser investigado.
12. **Backup:** o plano gratuito não tem backup gerenciado. Antes de colocar dados reais, assine o plano **Pro**, que faz backup diário com restauração.

## 2. Vercel

1. Suba o projeto para um repositório no GitHub.
2. Em https://vercel.com, importe o repositório. O `vercel.json` já coloca as funções na região `gru1` (São Paulo), ao lado do banco.
   Não use a integração "Supabase" oferecida pela Vercel: ela cria variáveis com outros nomes.
3. Em **Environment Variables**, cadastre:

   | Variável | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role key (**secreta**; marque só o ambiente *Production*) |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU-DOMINIO` |

4. Faça o deploy e, se quiser, configure um domínio próprio em **Settings → Domains**.

## 3. Primeiro administrador

Faça antes o passo 5 do Supabase (*Site URL*): o link do convite usa esse endereço.

No Windows (PowerShell), cole o bloco inteiro **numa mesma janela**, trocando só o endereço, o e-mail e o nome.
A chave secreta **não** vai escrita no comando: cole-a apenas quando aparecer a pergunta "Cole a chave service_role".
Ela fica oculta na tela e fora do histórico do terminal.

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://SEU_PROJECT_REF.supabase.co"
$env:NEXT_PUBLIC_SITE_URL = "https://SEU-DOMINIO"
$s = Read-Host "Cole a chave service_role" -AsSecureString
$env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
npx tsx scripts/criar-admin.ts email@empresa.com.br "Nome Completo"
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY; Remove-Variable s
```

Se a chave secreta aparecer em algum lugar (tela, print, mensagem), gere uma nova no Supabase, troque na Vercel,
faça um *Redeploy* e só então apague a antiga.

A pessoa recebe um e-mail, define a senha e entra como administrador. Os demais usuários são convidados pela tela
**Administração → Usuários**.

## Atualizações futuras do banco

Nunca edite uma migration que já foi aplicada em produção. Crie um arquivo novo em `supabase/migrations/`, teste no
banco local (`npx supabase db reset --local` e `npx supabase test db`) e só então rode `npx supabase db push --linked`.

Com o projeto ligado à produção (`supabase link`), **nunca** rode `npx supabase db reset` sem `--local`: ele apaga o banco.
