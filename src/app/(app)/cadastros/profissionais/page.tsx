import type { Metadata } from "next"
import { Cabecalho } from "@/components/comum/pagina"
import { CadastroGenerico, type DefCampo, type LinhaCadastro } from "@/components/comum/cadastro-generico"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { alternarProfissional, salvarProfissional } from "../actions"

export const metadata: Metadata = { title: "Profissionais" }

const FUNCOES = ["Pedreiro", "Servente", "Mestre de obras", "Encarregado", "Armador", "Carpinteiro", "Eletricista", "Encanador", "Pintor", "Azulejista", "Gesseiro", "Serralheiro"]

export default async function PaginaProfissionais() {
  await exigirPapel("admin", "gestor")
  const supabase = await createClient()
  const [{ data }, { data: empresas }] = await Promise.all([
    supabase.from("profissionais").select("*, empresa:pessoas(nome)").order("nome"),
    supabase.from("pessoas").select("id, nome").eq("ativo", true).eq("eh_prestador", true).order("nome"),
  ])

  const campos: DefCampo[] = [
    { tipo: "texto", nome: "nome", rotulo: "Nome", obrigatorio: true },
    { tipo: "texto", nome: "funcao", rotulo: "Função", obrigatorio: true, lista: FUNCOES },
    {
      tipo: "select",
      nome: "vinculo",
      rotulo: "Vínculo",
      obrigatorio: true,
      opcoes: [
        { valor: "proprio", rotulo: "Próprio" },
        { valor: "terceirizado", rotulo: "Terceirizado" },
      ],
    },
    {
      tipo: "select",
      nome: "empresa_id",
      rotulo: "Empresa (se terceirizado)",
      opcoes: (empresas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome })),
      vazio: "Nenhuma",
      ajuda: "Cadastre a empresa em Clientes e fornecedores como prestador.",
    },
    { tipo: "tel", nome: "telefone", rotulo: "Telefone" },
  ]

  const linhas: LinhaCadastro[] = (data ?? []).map((p) => ({
    id: p.id,
    ativo: p.ativo,
    colunas: [p.nome, p.funcao, p.vinculo === "proprio" ? "Próprio" : "Terceirizado", p.empresa?.nome ?? "—", p.telefone ?? "—"],
    busca: `${p.nome} ${p.funcao}`,
    dados: { nome: p.nome, funcao: p.funcao, vinculo: p.vinculo, empresa_id: p.empresa_id, telefone: p.telefone },
  }))

  return (
    <>
      <Cabecalho titulo="Profissionais" descricao="Equipe própria e terceirizada usada no diário de obra." />
      <CadastroGenerico
        singular="Profissional"
        colunas={["Nome", "Função", "Vínculo", "Empresa", "Telefone"]}
        linhas={linhas}
        campos={campos}
        salvar={salvarProfissional}
        alternar={alternarProfissional}
        podeEditar
        vazio="Nenhum profissional cadastrado."
      />
    </>
  )
}
