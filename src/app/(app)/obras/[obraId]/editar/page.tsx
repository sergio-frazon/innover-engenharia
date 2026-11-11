import { Secao } from "@/components/comum/pagina"
import { FormObra } from "@/components/obras/form-obra"
import { Membros } from "@/components/obras/membros"
import { exigirPapel } from "@/lib/auth"
import { getObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"

export default async function EditarObra({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const usuario = await exigirPapel("admin", "gestor")
  const obra = await getObra(obraId)
  const supabase = await createClient()

  const [{ data: clientes }, { data: usuarios }, { data: membros }] = await Promise.all([
    supabase.from("pessoas").select("id, nome").eq("eh_cliente", true).eq("ativo", true).order("nome"),
    supabase.from("perfis").select("id, nome, papel, ativo").eq("ativo", true).order("nome"),
    supabase.from("obra_membros").select("perfil:perfis(id, nome, papel, email)").eq("obra_id", obra.id),
  ])

  const responsaveis = (usuarios ?? []).filter((u) => u.papel === "admin" || u.papel === "gestor")
  const listaMembros = (membros ?? []).map((m) => m.perfil).filter((p): p is NonNullable<typeof p> => !!p)

  return (
    <div className="grid gap-6">
      <Secao titulo="Dados da obra">
        <FormObra obra={obra} clientes={clientes ?? []} responsaveis={responsaveis} />
      </Secao>
      <Secao titulo="Membros da obra">
        <Membros
          obraId={obra.id}
          responsavelId={obra.responsavel_id}
          meuId={usuario.id}
          membros={listaMembros}
          disponiveis={(usuarios ?? []).filter((u) => u.papel !== "admin" && !listaMembros.some((m) => m.id === u.id))}
        />
      </Secao>
    </div>
  )
}
