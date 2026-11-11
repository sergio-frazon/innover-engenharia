/**
 * Convida o primeiro administrador (uso em produção, uma única vez).
 *
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SITE_URL=https://seu-dominio \
 *   npx tsx scripts/criar-admin.ts email@empresa.com.br "Nome Completo"
 */
import { createClient } from "@supabase/supabase-js"

async function main() {
  const [email, nome] = process.argv.slice(2)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY
  const site = process.env.NEXT_PUBLIC_SITE_URL

  if (!email || !nome) throw new Error('Uso: npx tsx scripts/criar-admin.ts email "Nome"')
  if (!url || !chave || !site) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY e NEXT_PUBLIC_SITE_URL.")

  const supabase = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email.toLowerCase(), {
    data: { nome },
    redirectTo: `${site}/auth/callback?next=/redefinir-senha`,
  })
  if (error) throw error

  await supabase.auth.admin.updateUserById(data.user.id, { app_metadata: { papel: "admin" } })
  const { error: e } = await supabase.from("perfis").update({ papel: "admin", nome }).eq("id", data.user.id)
  if (e) throw e

  console.log(`Convite de administrador enviado para ${email}.`)
}

main().catch((erro) => {
  console.error("Falhou:", erro.message ?? erro)
  process.exit(1)
})
