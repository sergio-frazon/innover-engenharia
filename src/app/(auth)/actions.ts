"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { falhaValidacao, type Resultado } from "@/lib/acoes"
import { caminhoInterno } from "@/lib/redirecionamento"

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  senha: z.string().min(1, "Informe a senha."),
  voltar: z.string().optional(),
})

export async function entrar(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const dados = loginSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email: dados.data.email, password: dados.data.senha })
  if (error) {
    if (error.message.toLowerCase().includes("banned")) {
      return { ok: false, erro: "Seu acesso está desativado. Fale com o administrador." }
    }
    return { ok: false, erro: "E-mail ou senha incorretos." }
  }

  const { data: perfil } = await supabase.from("perfis").select("ativo").eq("id", data.user.id).maybeSingle()
  if (!perfil?.ativo) {
    await supabase.auth.signOut()
    return { ok: false, erro: "Seu acesso está desativado. Fale com o administrador." }
  }

  redirect(caminhoInterno(dados.data.voltar))
}

const recuperarSchema = z.object({ email: z.string().trim().toLowerCase().email("Informe um e-mail válido.") })

export async function recuperarSenha(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const dados = recuperarSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(dados.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=/redefinir-senha`,
  })
  if (error) console.error("Recuperação de senha:", error.message)
  // Mesma resposta em qualquer caso, para não revelar quais e-mails existem.
  return { ok: true, mensagem: "Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha." }
}

const redefinirSchema = z
  .object({
    senha: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirmacao: z.string(),
  })
  .refine((d) => d.senha === d.confirmacao, { message: "As senhas não conferem.", path: ["confirmacao"] })

export async function redefinirSenha(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const dados = redefinirSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, erro: "O link expirou. Peça um novo e-mail de recuperação." }

  const { error } = await supabase.auth.updateUser({ password: dados.data.senha })
  if (error) {
    if (error.code === "same_password") return { ok: false, erro: "A nova senha precisa ser diferente da atual." }
    if (error.code === "weak_password") return { ok: false, erro: "Senha muito fraca. Use letras, números e símbolos." }
    console.error("Redefinir senha:", error)
    return { ok: false, erro: "Não foi possível alterar a senha. Tente novamente." }
  }
  redirect("/painel")
}
