import type { Metadata } from "next"
import { Cabecalho } from "@/components/comum/pagina"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { ListaUsuarios, type LinhaUsuario } from "./lista-usuarios"

export const metadata: Metadata = { title: "Usuários" }

export default async function PaginaUsuarios() {
  const eu = await exigirPapel("admin")
  const supabase = await createClient()

  const [{ data: perfis }, { data: membros }, { data: obras }, contas] = await Promise.all([
    supabase.from("perfis").select("*").order("ativo", { ascending: false }).order("nome"),
    supabase.from("obra_membros").select("obra_id, perfil_id"),
    supabase.from("obras").select("id, codigo, nome, situacao").order("codigo"),
    createAdminClient().auth.admin.listUsers({ perPage: 1000 }),
  ])

  const ultimoAcesso = new Map((contas.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]))
  const linhas: LinhaUsuario[] = (perfis ?? []).map((p) => ({
    ...p,
    obras: (membros ?? []).filter((m) => m.perfil_id === p.id).map((m) => m.obra_id),
    ultimo_acesso: ultimoAcesso.get(p.id) ?? null,
  }))

  return (
    <>
      <Cabecalho titulo="Usuários" descricao="Quem acessa o sistema, com qual perfil e em quais obras." />
      <ListaUsuarios usuarios={linhas} obras={obras ?? []} meuId={eu.id} />
    </>
  )
}
