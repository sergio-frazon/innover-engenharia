import type { Metadata } from "next"
import { Cabecalho } from "@/components/comum/pagina"
import { CadastroGenerico, type DefCampo, type LinhaCadastro } from "@/components/comum/cadastro-generico"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { alternarCategoria, salvarCategoria } from "../actions"

export const metadata: Metadata = { title: "Categorias financeiras" }

const CAMPOS: DefCampo[] = [
  { tipo: "texto", nome: "nome", rotulo: "Nome", obrigatorio: true },
  {
    tipo: "select",
    nome: "tipo",
    rotulo: "Tipo",
    obrigatorio: true,
    opcoes: [
      { valor: "despesa", rotulo: "Despesa (contas a pagar)" },
      { valor: "receita", rotulo: "Receita (contas a receber)" },
    ],
  },
]

export default async function PaginaCategorias() {
  await exigirPapel("admin", "financeiro")
  const supabase = await createClient()
  const { data } = await supabase.from("categorias_financeiras").select("*").order("tipo").order("nome")

  const linhas: LinhaCadastro[] = (data ?? []).map((c) => ({
    id: c.id,
    ativo: c.ativo,
    colunas: [c.nome, c.tipo === "despesa" ? "Despesa" : "Receita"],
    busca: c.nome,
    dados: { nome: c.nome, tipo: c.tipo },
  }))

  return (
    <>
      <Cabecalho titulo="Categorias financeiras" descricao="Classificação das contas a pagar e a receber." />
      <CadastroGenerico
        singular="Categoria"
        colunas={["Nome", "Tipo"]}
        linhas={linhas}
        campos={CAMPOS}
        salvar={salvarCategoria}
        alternar={alternarCategoria}
        podeEditar
        vazio="Nenhuma categoria cadastrada."
      />
    </>
  )
}
