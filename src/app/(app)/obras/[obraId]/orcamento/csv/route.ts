import { NextResponse, type NextRequest } from "next/server"
import { getUsuario } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { gerarCsv, respostaCsv } from "@/lib/csv"
import { NATUREZA } from "@/lib/rotulos"

export async function GET(request: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const usuario = await getUsuario()
  if (!usuario?.ativo || !["admin", "gestor", "financeiro"].includes(usuario.papel)) return new NextResponse(null, { status: 404 })

  const versaoId = request.nextUrl.searchParams.get("v") ?? ""
  const supabase = await createClient()
  const [{ data: versao }, { data: itens }] = await Promise.all([
    supabase.from("orcamento_versoes").select("numero, obra:obras(codigo)").eq("id", versaoId).eq("obra_id", obraId).maybeSingle(),
    supabase
      .from("orcamento_itens")
      .select("natureza, descricao, unidade, quantidade, valor_unitario, valor_total, servico:servicos(codigo, descricao, etapa:etapas(codigo, nome))")
      .eq("versao_id", versaoId),
  ])
  if (!versao) return new NextResponse(null, { status: 404 })

  const linhas = (itens ?? []).sort((a, b) => (a.servico?.codigo ?? "").localeCompare(b.servico?.codigo ?? "", "pt-BR", { numeric: true }))
  const csv = gerarCsv(
    [
      { titulo: "Etapa", valor: (i) => (i.servico?.etapa ? `${i.servico.etapa.codigo}. ${i.servico.etapa.nome}` : "") },
      { titulo: "Código", valor: (i) => i.servico?.codigo },
      { titulo: "Serviço", valor: (i) => i.servico?.descricao },
      { titulo: "Natureza", valor: (i) => NATUREZA[i.natureza] },
      { titulo: "Descrição", valor: (i) => i.descricao },
      { titulo: "Unidade", valor: (i) => i.unidade },
      { titulo: "Quantidade", valor: (i) => Number(i.quantidade) },
      { titulo: "Valor unitário", valor: (i) => Number(i.valor_unitario) },
      { titulo: "Total", valor: (i) => Number(i.valor_total) },
    ],
    linhas,
  )
  return respostaCsv(csv, `orcamento-${versao.obra?.codigo ?? "obra"}-v${versao.numero}.csv`)
}
