"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { falhaValidacao, texto, textoOpcional, type Resultado } from "@/lib/acoes"
import { falha } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

const perfilSchema = z.object({ nome: texto("Informe seu nome."), telefone: textoOpcional })

export async function salvarPerfil(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const usuario = await usuarioDaAcao()
  if (!usuario) return SEM_PERMISSAO
  const dados = perfilSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const supabase = await createClient()
  const { error } = await supabase.from("perfis").update(dados.data).eq("id", usuario.id)
  if (error) return falha(error)
  revalidatePath("/", "layout")
  return { ok: true, mensagem: "Perfil atualizado." }
}

const senhaSchema = z
  .object({
    senha_atual: z.string().min(1, "Informe a senha atual."),
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem.", path: ["confirmacao"] })

export async function trocarSenha(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const usuario = await usuarioDaAcao()
  if (!usuario) return SEM_PERMISSAO
  const dados = senhaSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const supabase = await createClient()
  const { error: erroLogin } = await supabase.auth.signInWithPassword({ email: usuario.email, password: dados.data.senha_atual })
  if (erroLogin) return { ok: false, erro: "Senha atual incorreta.", campos: { senha_atual: "Senha atual incorreta." } }

  const { error } = await supabase.auth.updateUser({ password: dados.data.senha })
  if (error) {
    if (error.code === "same_password") return { ok: false, erro: "A nova senha precisa ser diferente da atual." }
    return { ok: false, erro: "Não foi possível alterar a senha." }
  }
  return { ok: true, mensagem: "Senha alterada." }
}
