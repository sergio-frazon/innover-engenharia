import { NextResponse, type NextRequest } from "next/server"
import { getUsuario } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { gerarCsv, respostaCsv } from "@/lib/csv"
import { data as fmtData } from "@/lib/format"
import { STATUS_MEDICAO } from "@/lib/rotulos"

export async function GET(request: NextRequest, { params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const usuario = await getUsuario()
  if (!usuario?.ativo || !["admin", "gestor", "campo"].includes(usuario.papel)) return new NextResponse(null, { status: 404 })

  const f = request.nextUrl.searchParams
  const supabase = await createClient()
  let consulta = supabase
    .from("medicoes")
    .select("periodo_inicio, periodo_fim, quantidade, local, status, origem, justificativa_excesso, observacao, servico:servicos(codigo, descricao, unidade), autor:perfis!medicoes_criado_por_fkey(nome)")
    .eq("obra_id", obraId)
    .order("periodo_fim")
  if (f.get("aba") !== "todas" && ["admin", "gestor"].includes(usuario.papel)) consulta = consulta.eq("status", "enviada")
  if (f.get("status")) consulta = consulta.eq("status", f.get("status")!)
  if (f.get("servico")) consulta = consulta.eq("servico_id", f.get("servico")!)
  if (f.get("origem")) consulta = consulta.eq("origem", f.get("origem")!)
  if (f.get("de")) consulta = consulta.gte("periodo_fim", f.get("de")!)
  if (f.get("ate")) consulta = consulta.lte("periodo_inicio", f.get("ate")!)
  const { data } = await consulta

  const csv = gerarCsv(
    [
      { titulo: "Início", valor: (m) => fmtData(m.periodo_inicio) },
      { titulo: "Fim", valor: (m) => fmtData(m.periodo_fim) },
      { titulo: "Código", valor: (m) => m.servico?.codigo },
      { titulo: "Serviço", valor: (m) => m.servico?.descricao },
      { titulo: "Quantidade", valor: (m) => Number(m.quantidade) },
      { titulo: "Unidade", valor: (m) => m.servico?.unidade },
      { titulo: "Local", valor: (m) => m.local },
      { titulo: "Situação", valor: (m) => STATUS_MEDICAO[m.status]?.texto },
      { titulo: "Origem", valor: (m) => (m.origem === "diario" ? "Diário" : "Avulsa") },
      { titulo: "Justificativa de excesso", valor: (m) => m.justificativa_excesso },
      { titulo: "Observação", valor: (m) => m.observacao },
      { titulo: "Lançada por", valor: (m) => m.autor?.nome },
    ],
    data ?? [],
  )
  return respostaCsv(csv, "medicoes.csv")
}
