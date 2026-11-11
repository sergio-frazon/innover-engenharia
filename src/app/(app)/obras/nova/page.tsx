import type { Metadata } from "next"
import { Cabecalho, Secao } from "@/components/comum/pagina"
import { FormObra } from "@/components/obras/form-obra"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Nova obra" }

export default async function PaginaNovaObra() {
  await exigirPapel("admin", "gestor")
  const supabase = await createClient()
  const [{ data: clientes }, { data: responsaveis }] = await Promise.all([
    supabase.from("pessoas").select("id, nome").eq("eh_cliente", true).eq("ativo", true).order("nome"),
    supabase.from("perfis").select("id, nome").in("papel", ["admin", "gestor"]).eq("ativo", true).order("nome"),
  ])
  return (
    <>
      <Cabecalho titulo="Nova obra" trilha={[{ rotulo: "Obras", href: "/obras" }, { rotulo: "Nova" }]} />
      <Secao>
        <FormObra clientes={clientes ?? []} responsaveis={responsaveis ?? []} />
      </Secao>
    </>
  )
}
