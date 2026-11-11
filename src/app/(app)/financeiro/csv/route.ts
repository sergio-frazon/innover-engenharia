import { NextResponse, type NextRequest } from "next/server"
import { getUsuario } from "@/lib/auth"
import { buscarParcelas } from "@/lib/financeiro"
import { gerarCsv, respostaCsv } from "@/lib/csv"
import { data } from "@/lib/format"
import { SITUACAO_PARCELA } from "@/lib/rotulos"

export async function GET(request: NextRequest) {
  const usuario = await getUsuario()
  if (!usuario?.ativo || !["admin", "financeiro"].includes(usuario.papel)) return new NextResponse(null, { status: 404 })
  const f = Object.fromEntries(request.nextUrl.searchParams)
  const { linhas } = await buscarParcelas(f, { limite: 5000 })
  const csv = gerarCsv(
    [
      { titulo: "Tipo", valor: (l) => (l.tipo === "pagar" ? "Pagar" : "Receber") },
      { titulo: "Vencimento", valor: (l) => data(l.vencimento) },
      { titulo: "Descrição", valor: (l) => l.descricao },
      { titulo: "Parcela", valor: (l) => `${l.numero}/${l.total_parcelas}` },
      { titulo: "Documento", valor: (l) => l.documento_numero },
      { titulo: "Pessoa", valor: (l) => l.pessoa },
      { titulo: "Obra", valor: (l) => l.obra ?? "Sem obra" },
      { titulo: "Categoria", valor: (l) => l.categoria },
      { titulo: "Valor", valor: (l) => l.valor },
      { titulo: "Pago", valor: (l) => l.valor_pago },
      { titulo: "Saldo", valor: (l) => l.saldo },
      { titulo: "Situação", valor: (l) => SITUACAO_PARCELA[l.situacao]?.texto },
    ],
    linhas,
  )
  return respostaCsv(csv, `contas-${f.tipo ?? "todas"}.csv`)
}
