import "server-only"
import { cache } from "react"
import { notFound, redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Papel } from "@/lib/rotulos"
import type { Tables } from "@/lib/supabase/database.types"

export type Usuario = Tables<"perfis"> & { papel: Papel }

/** Usuário logado (perfil) ou null. Cacheado por requisição. */
export const getUsuario = cache(async (): Promise<Usuario | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: perfil } = await supabase.from("perfis").select("*").eq("id", user.id).maybeSingle()
  return (perfil as Usuario | null) ?? null
})

/** Exige sessão de usuário ativo; senão manda para o login. */
export async function exigirUsuario(): Promise<Usuario> {
  const usuario = await getUsuario()
  if (!usuario) redirect("/login")
  if (!usuario.ativo) redirect("/auth/sair?motivo=inativo")
  return usuario
}

/** Exige um dos papéis; caso contrário a página "não existe" (docs/06-telas.md). */
export async function exigirPapel(...papeis: Papel[]): Promise<Usuario> {
  const usuario = await exigirUsuario()
  if (!papeis.includes(usuario.papel)) notFound()
  return usuario
}

/** O usuário tem um dos papéis? (para mostrar/esconder partes da tela) */
export function temPapel(usuario: Pick<Usuario, "papel">, ...papeis: Papel[]): boolean {
  return papeis.includes(usuario.papel)
}

/** Para Server Actions: retorna o usuário ou null (a action responde com erro). */
export async function usuarioDaAcao(...papeis: Papel[]): Promise<Usuario | null> {
  const usuario = await getUsuario()
  if (!usuario || !usuario.ativo) return null
  if (papeis.length && !papeis.includes(usuario.papel)) return null
  return usuario
}

/** Resultado padrão quando a action é chamada por quem não tem o papel exigido. */
export const SEM_PERMISSAO = { ok: false as const, erro: "Você não tem permissão para esta ação." }
