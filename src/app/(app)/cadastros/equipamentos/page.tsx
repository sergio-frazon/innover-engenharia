import type { Metadata } from "next"
import { Cabecalho } from "@/components/comum/pagina"
import { CadastroGenerico, type DefCampo, type LinhaCadastro } from "@/components/comum/cadastro-generico"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { alternarEquipamento, salvarEquipamento } from "../actions"

export const metadata: Metadata = { title: "Equipamentos" }

const CAMPOS: DefCampo[] = [
  { tipo: "texto", nome: "descricao", rotulo: "Descrição", obrigatorio: true, largo: true },
  {
    tipo: "select",
    nome: "propriedade",
    rotulo: "Propriedade",
    obrigatorio: true,
    opcoes: [
      { valor: "proprio", rotulo: "Próprio" },
      { valor: "alugado", rotulo: "Alugado" },
    ],
  },
  { tipo: "texto", nome: "identificacao", rotulo: "Identificação", ajuda: "Placa, número de série ou patrimônio." },
]

export default async function PaginaEquipamentos() {
  await exigirPapel("admin", "gestor")
  const supabase = await createClient()
  const { data } = await supabase.from("equipamentos").select("*").order("descricao")

  const linhas: LinhaCadastro[] = (data ?? []).map((e) => ({
    id: e.id,
    ativo: e.ativo,
    colunas: [e.descricao, e.propriedade === "proprio" ? "Próprio" : "Alugado", e.identificacao ?? "—"],
    busca: `${e.descricao} ${e.identificacao ?? ""}`,
    dados: { descricao: e.descricao, propriedade: e.propriedade, identificacao: e.identificacao },
  }))

  return (
    <>
      <Cabecalho titulo="Equipamentos" descricao="Equipamentos próprios e alugados usados no diário de obra." />
      <CadastroGenerico
        singular="Equipamento"
        colunas={["Descrição", "Propriedade", "Identificação"]}
        linhas={linhas}
        campos={CAMPOS}
        salvar={salvarEquipamento}
        alternar={alternarEquipamento}
        podeEditar
        vazio="Nenhum equipamento cadastrado."
      />
    </>
  )
}
