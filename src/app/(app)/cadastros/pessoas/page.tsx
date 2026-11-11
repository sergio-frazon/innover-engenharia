import type { Metadata } from "next"
import { Cabecalho } from "@/components/comum/pagina"
import { CadastroGenerico, type DefCampo, type LinhaCadastro } from "@/components/comum/cadastro-generico"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { documentoFormatado } from "@/lib/format"
import { alternarPessoa, salvarPessoa } from "../actions"

export const metadata: Metadata = { title: "Clientes e fornecedores" }

const CAMPOS: DefCampo[] = [
  { tipo: "texto", nome: "nome", rotulo: "Nome / razão social", obrigatorio: true, largo: true },
  {
    tipo: "select",
    nome: "tipo_pessoa",
    rotulo: "Tipo",
    obrigatorio: true,
    opcoes: [
      { valor: "juridica", rotulo: "Pessoa jurídica (CNPJ)" },
      { valor: "fisica", rotulo: "Pessoa física (CPF)" },
    ],
  },
  { tipo: "texto", nome: "documento", rotulo: "CPF / CNPJ", ajuda: "Opcional. Só números ou com pontuação." },
  {
    tipo: "checkboxes",
    nome: "tipos",
    rotulo: "É",
    largo: true,
    itens: [
      { nome: "eh_cliente", rotulo: "Cliente" },
      { nome: "eh_fornecedor", rotulo: "Fornecedor" },
      { nome: "eh_prestador", rotulo: "Prestador de serviço" },
    ],
  },
  { tipo: "email", nome: "email", rotulo: "E-mail" },
  { tipo: "tel", nome: "telefone", rotulo: "Telefone" },
  { tipo: "texto", nome: "endereco", rotulo: "Endereço", largo: true },
  { tipo: "textarea", nome: "observacao", rotulo: "Observação", largo: true },
]

export default async function PaginaPessoas() {
  await exigirPapel("admin", "gestor", "financeiro")
  const supabase = await createClient()
  const { data } = await supabase.from("pessoas").select("*").order("nome")

  const linhas: LinhaCadastro[] = (data ?? []).map((p) => {
    const papeis = [p.eh_cliente && "Cliente", p.eh_fornecedor && "Fornecedor", p.eh_prestador && "Prestador"].filter(Boolean).join(", ")
    return {
      id: p.id,
      ativo: p.ativo,
      colunas: [p.nome, papeis, p.documento ? documentoFormatado(p.documento) : "—", p.telefone ?? "—", p.email ?? "—"],
      busca: `${p.nome} ${p.documento ?? ""} ${p.email ?? ""}`,
      dados: { ...p, documento: p.documento ? documentoFormatado(p.documento) : null },
    }
  })

  return (
    <>
      <Cabecalho titulo="Clientes e fornecedores" descricao="Clientes das obras, fornecedores e prestadores de serviço." />
      <CadastroGenerico
        singular="Cadastro"
        colunas={["Nome", "Tipo", "CPF/CNPJ", "Telefone", "E-mail"]}
        linhas={linhas}
        campos={CAMPOS}
        salvar={salvarPessoa}
        alternar={alternarPessoa}
        podeEditar
        vazio="Nenhum cliente ou fornecedor cadastrado."
      />
    </>
  )
}
