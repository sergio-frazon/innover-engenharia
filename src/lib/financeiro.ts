import "server-only"
import { createClient } from "@/lib/supabase/server"

export type FiltrosParcelas = {
  tipo?: string
  situacao?: string
  obra?: string
  pessoa?: string
  categoria?: string
  de?: string
  ate?: string
  q?: string
}

const SITUACOES_PADRAO = ["aberta", "parcial", "vencida"]

/** Parcelas (v_parcelas_situacao) com nomes de pessoa, obra e categoria. */
export async function buscarParcelas(f: FiltrosParcelas, opcoes: { obraFixa?: string; limite?: number } = {}) {
  const supabase = await createClient()
  let consulta = supabase
    .from("v_parcelas_situacao")
    .select("*")
    .order("vencimento")
    .order("numero")
    .limit(opcoes.limite ?? 500)
  if (f.tipo) consulta = consulta.eq("tipo", f.tipo)
  const situacoes = f.situacao === "todas" ? null : f.situacao ? [f.situacao] : SITUACOES_PADRAO
  if (situacoes) consulta = consulta.in("situacao", situacoes)
  const obra = opcoes.obraFixa ?? f.obra
  if (obra === "sem-obra") consulta = consulta.is("obra_id", null)
  else if (obra) consulta = consulta.eq("obra_id", obra)
  if (f.pessoa) consulta = consulta.eq("pessoa_id", f.pessoa)
  if (f.categoria) consulta = consulta.eq("categoria_id", f.categoria)
  if (f.de) consulta = consulta.gte("vencimento", f.de)
  if (f.ate) consulta = consulta.lte("vencimento", f.ate)
  if (f.q) consulta = consulta.or(`descricao.ilike.%${f.q.replace(/[%,()]/g, "")}%,documento_numero.ilike.%${f.q.replace(/[%,()]/g, "")}%`)

  const [{ data: parcelas }, { data: pessoas }, { data: obras }, { data: categorias }] = await Promise.all([
    consulta,
    supabase.from("pessoas").select("id, nome").order("nome"),
    supabase.from("obras").select("id, codigo, nome").order("codigo"),
    supabase.from("categorias_financeiras").select("id, nome, tipo").order("nome"),
  ])
  const nomePessoa = new Map((pessoas ?? []).map((p) => [p.id, p.nome]))
  const nomeObra = new Map((obras ?? []).map((o) => [o.id, o.codigo]))
  const nomeCategoria = new Map((categorias ?? []).map((c) => [c.id, c.nome]))

  const linhas = (parcelas ?? []).map((p) => ({
    id: p.id!,
    lancamento_id: p.lancamento_id!,
    numero: p.numero!,
    total_parcelas: Number(p.total_parcelas ?? 1),
    vencimento: p.vencimento!,
    valor: Number(p.valor),
    valor_pago: Number(p.valor_pago),
    saldo: Number(p.saldo),
    situacao: p.situacao!,
    tipo: p.tipo!,
    descricao: p.descricao!,
    documento_numero: p.documento_numero,
    obra_id: p.obra_id,
    pessoa: p.pessoa_id ? (nomePessoa.get(p.pessoa_id) ?? null) : null,
    obra: p.obra_id ? (nomeObra.get(p.obra_id) ?? null) : null,
    categoria: p.categoria_id ? (nomeCategoria.get(p.categoria_id) ?? null) : null,
    dias_para_vencer: p.dias_para_vencer,
  }))
  return { linhas, pessoas: pessoas ?? [], obras: obras ?? [], categorias: categorias ?? [] }
}

export type LinhaParcela = Awaited<ReturnType<typeof buscarParcelas>>["linhas"][number]
