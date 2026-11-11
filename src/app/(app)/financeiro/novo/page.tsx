import type { Metadata } from "next"
import { Cabecalho, Secao } from "@/components/comum/pagina"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { hojeISO } from "@/lib/format"
import { FormLancamento } from "./form"

export const metadata: Metadata = { title: "Novo lançamento" }

export default async function NovoLancamento({ searchParams }: { searchParams: Promise<{ tipo?: string; obra?: string }> }) {
  await exigirPapel("admin", "financeiro")
  const f = await searchParams
  const supabase = await createClient()
  const [{ data: categorias }, { data: pessoas }, { data: obras }, { data: etapas }] = await Promise.all([
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("pessoas").select("id, nome, eh_cliente, eh_fornecedor, eh_prestador").eq("ativo", true).order("nome"),
    supabase.from("obras").select("id, codigo, nome").not("situacao", "in", "(concluida,cancelada)").order("codigo"),
    supabase.from("etapas").select("id, obra_id, codigo, nome").eq("ativo", true).order("ordem"),
  ])

  return (
    <>
      <Cabecalho titulo="Novo lançamento" trilha={[{ rotulo: "Financeiro", href: "/financeiro" }, { rotulo: "Novo" }]} />
      <Secao>
        <FormLancamento
          tipoInicial={f.tipo === "receber" ? "receber" : "pagar"}
          obraInicial={f.obra ?? ""}
          categorias={categorias ?? []}
          pessoas={pessoas ?? []}
          obras={obras ?? []}
          etapas={etapas ?? []}
          hoje={hojeISO()}
        />
      </Secao>
    </>
  )
}
