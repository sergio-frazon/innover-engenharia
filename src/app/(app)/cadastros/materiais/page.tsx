import type { Metadata } from "next"
import { Cabecalho } from "@/components/comum/pagina"
import { CadastroGenerico, type DefCampo, type LinhaCadastro } from "@/components/comum/cadastro-generico"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { moeda, numeroParaInput } from "@/lib/format"
import { UNIDADES } from "@/lib/rotulos"
import { alternarMaterial, salvarMaterial } from "../actions"

export const metadata: Metadata = { title: "Materiais" }

const CAMPOS: DefCampo[] = [
  { tipo: "texto", nome: "descricao", rotulo: "Descrição", obrigatorio: true, largo: true },
  { tipo: "texto", nome: "unidade", rotulo: "Unidade", obrigatorio: true, lista: UNIDADES },
  { tipo: "numero", nome: "custo_unitario", rotulo: "Custo unitário (R$)", ajuda: "Usado como sugestão no orçamento." },
]

export default async function PaginaMateriais() {
  await exigirPapel("admin", "gestor")
  const supabase = await createClient()
  const { data } = await supabase.from("materiais").select("*").order("descricao")

  const linhas: LinhaCadastro[] = (data ?? []).map((m) => ({
    id: m.id,
    ativo: m.ativo,
    colunas: [m.descricao, m.unidade, moeda(m.custo_unitario)],
    busca: m.descricao,
    dados: { descricao: m.descricao, unidade: m.unidade, custo_unitario: numeroParaInput(m.custo_unitario) },
  }))

  return (
    <>
      <Cabecalho titulo="Materiais" descricao="Catálogo usado no orçamento e no diário de obra." />
      <CadastroGenerico
        singular="Material"
        colunas={["Descrição", "Unidade", "Custo unitário"]}
        linhas={linhas}
        campos={CAMPOS}
        salvar={salvarMaterial}
        alternar={alternarMaterial}
        podeEditar
        vazio="Nenhum material cadastrado."
      />
    </>
  )
}
