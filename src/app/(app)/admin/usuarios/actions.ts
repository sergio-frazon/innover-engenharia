"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { falhaValidacao, texto, textoOpcional, type Resultado } from "@/lib/acoes"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

const papelSchema = z.enum(["admin", "gestor", "campo", "financeiro"], { errorMap: () => ({ message: "Selecione o perfil." }) })

function obrasDoForm(formData: FormData): string[] {
  return formData.getAll("obras").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v))
}

const redirecionamento = () => `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/redefinir-senha`

async function sincronizarObras(perfilId: string, obras: string[]): Promise<string | null> {
  const supabase = await createClient()
  const { data: atuais, error } = await supabase.from("obra_membros").select("obra_id").eq("perfil_id", perfilId)
  if (error) return mensagemDeErro(error)
  const atuaisIds = new Set((atuais ?? []).map((m) => m.obra_id))
  const novos = obras.filter((o) => !atuaisIds.has(o))
  const removidos = [...atuaisIds].filter((o) => !obras.includes(o))

  if (novos.length) {
    const { error: e } = await supabase.from("obra_membros").insert(novos.map((obra_id) => ({ obra_id, perfil_id: perfilId })))
    if (e) return mensagemDeErro(e)
  }
  for (const obra_id of removidos) {
    const { error: e } = await supabase.from("obra_membros").delete().eq("obra_id", obra_id).eq("perfil_id", perfilId)
    if (e) return mensagemDeErro(e)
  }
  return null
}

const convidarSchema = z.object({
  nome: texto("Informe o nome."),
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  papel: papelSchema,
})

export async function convidarUsuario(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin"))) return SEM_PERMISSAO
  const dados = convidarSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const obras = obrasDoForm(formData)

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(dados.data.email, {
    data: { nome: dados.data.nome },
    redirectTo: redirecionamento(),
  })
  if (error) {
    if (error.code === "email_exists" || error.status === 422) {
      return { ok: false, erro: "Já existe um usuário com este e-mail.", campos: { email: "E-mail já cadastrado." } }
    }
    console.error("Convite:", error)
    return { ok: false, erro: "Não foi possível enviar o convite. Verifique o e-mail e tente novamente." }
  }

  // Papel fica no app_metadata (só a service_role altera) e no perfil.
  await admin.auth.admin.updateUserById(data.user.id, { app_metadata: { papel: dados.data.papel } })
  const supabase = await createClient()
  const { error: erroPerfil } = await supabase
    .from("perfis")
    .update({ papel: dados.data.papel, nome: dados.data.nome })
    .eq("id", data.user.id)
  if (erroPerfil) return { ok: false, erro: mensagemDeErro(erroPerfil) }

  const erroObras = await sincronizarObras(data.user.id, obras)
  if (erroObras) return { ok: false, erro: erroObras }

  revalidatePath("/admin/usuarios")
  return { ok: true, mensagem: `Convite enviado para ${dados.data.email}.` }
}

const editarSchema = z.object({
  id: z.string().uuid(),
  nome: texto("Informe o nome."),
  telefone: textoOpcional,
  papel: papelSchema,
})

export async function editarUsuario(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await usuarioDaAcao("admin")
  if (!eu) return SEM_PERMISSAO
  const dados = editarSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, ...campos } = dados.data

  const supabase = await createClient()
  const { error } = await supabase.from("perfis").update(campos).eq("id", id)
  if (error) return { ok: false, erro: mensagemDeErro(error) }

  await createAdminClient().auth.admin.updateUserById(id, { app_metadata: { papel: campos.papel } })

  const erroObras = await sincronizarObras(id, obrasDoForm(formData))
  if (erroObras) return { ok: false, erro: erroObras }

  revalidatePath("/admin/usuarios")
  return { ok: true, mensagem: "Usuário atualizado." }
}

export async function alterarSituacaoUsuario(id: string, ativo: boolean): Promise<Resultado> {
  const eu = await usuarioDaAcao("admin")
  if (!eu) return SEM_PERMISSAO
  if (id === eu.id && !ativo) return { ok: false, erro: "Você não pode desativar o próprio acesso." }

  const supabase = await createClient()
  const { error } = await supabase.from("perfis").update({ ativo }).eq("id", id)
  if (error) return { ok: false, erro: mensagemDeErro(error) }

  const { error: erroAuth } = await createAdminClient().auth.admin.updateUserById(id, {
    ban_duration: ativo ? "none" : "876000h",
  })
  if (erroAuth) console.error("Ban/unban:", erroAuth)

  revalidatePath("/admin/usuarios")
  return { ok: true, mensagem: ativo ? "Acesso reativado." : "Acesso desativado." }
}

export async function reenviarAcesso(id: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin"))) return SEM_PERMISSAO
  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.getUserById(id)
  if (error || !data.user?.email) return { ok: false, erro: "Usuário não encontrado." }

  if (!data.user.email_confirmed_at && !data.user.last_sign_in_at) {
    const { error: e } = await admin.auth.admin.inviteUserByEmail(data.user.email, { redirectTo: redirecionamento() })
    if (e) return { ok: false, erro: "Não foi possível reenviar o convite." }
    return { ok: true, mensagem: "Convite reenviado." }
  }
  const supabase = await createClient()
  const { error: e } = await supabase.auth.resetPasswordForEmail(data.user.email, { redirectTo: redirecionamento() })
  if (e) return { ok: false, erro: "Não foi possível enviar o e-mail." }
  return { ok: true, mensagem: "E-mail para definir nova senha enviado." }
}
