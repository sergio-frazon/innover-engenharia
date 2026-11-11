"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { dataISO, falhaValidacao, numeroBR, texto, textoOpcional, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"
import { somarDias } from "@/lib/format"

function revalidar(obraId?: string | null) {
  revalidatePath("/financeiro", "layout")
  revalidatePath("/painel")
  revalidatePath("/alertas")
  if (obraId) revalidatePath(`/obras/${obraId}`, "layout")
}

const parcelasSchema = z
  .array(z.object({ vencimento: dataISO("Informe o vencimento."), valor: z.number().positive("Valor da parcela deve ser maior que zero.") }))
  .min(1, "Informe pelo menos uma parcela.")

const lancamentoSchema = z
  .object({
    tipo: z.enum(["pagar", "receber"]),
    descricao: texto("Informe a descrição."),
    categoria_id: uuid("Selecione a categoria."),
    obra_id: uuidOpcional,
    etapa_id: uuidOpcional,
    natureza: z.preprocess((v) => (v === "" ? null : v), z.enum(["material", "mao_de_obra", "equipamento", "outro"]).nullable()),
    pessoa_id: uuidOpcional,
    documento_numero: textoOpcional,
    data_competencia: dataISO("Informe a competência."),
    valor_total: numeroBR({ positivo: true, mensagem: "Informe o valor total." }),
    observacao: textoOpcional,
    parcelas: z.preprocess((v) => {
      try {
        return JSON.parse(String(v))
      } catch {
        return []
      }
    }, parcelasSchema),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === "pagar" && d.obra_id && !d.natureza) {
      ctx.addIssue({ code: "custom", path: ["natureza"], message: "Informe a natureza do custo." })
    }
    const soma = d.parcelas.reduce((a, p) => a + Math.round(p.valor * 100), 0)
    if (soma !== Math.round(d.valor_total * 100)) {
      ctx.addIssue({ code: "custom", path: ["parcelas"], message: "A soma das parcelas precisa ser igual ao valor total." })
    }
  })

export async function criarLancamento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return SEM_PERMISSAO
  const dados = lancamentoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { parcelas, ...lancamento } = dados.data

  const supabase = await createClient()
  const { data: id, error } = await supabase.rpc("criar_lancamento", {
    p_dados: { ...lancamento, etapa_id: lancamento.obra_id ? lancamento.etapa_id : null },
    p_parcelas: parcelas,
  })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(lancamento.obra_id)
  redirect(`/financeiro/${id}?novo=1`)
}

const edicaoSchema = z.object({
  id: uuid(),
  descricao: texto("Informe a descrição."),
  categoria_id: uuid("Selecione a categoria."),
  etapa_id: uuidOpcional,
  natureza: z.preprocess((v) => (v === "" ? null : v), z.enum(["material", "mao_de_obra", "equipamento", "outro"]).nullable()),
  pessoa_id: uuidOpcional,
  documento_numero: textoOpcional,
  data_competencia: dataISO("Informe a competência."),
  observacao: textoOpcional,
})

export async function editarLancamento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return SEM_PERMISSAO
  const dados = edicaoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, ...campos } = dados.data
  const supabase = await createClient()
  const { data, error } = await supabase.from("lancamentos").update(campos).eq("id", id).select("obra_id").single()
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(data.obra_id)
  return { ok: true, mensagem: "Lançamento atualizado." }
}

export async function atualizarParcelas(lancamentoId: string, parcelas: { vencimento: string; valor: number }[]): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return SEM_PERMISSAO
  const ok = parcelasSchema.safeParse(parcelas)
  if (!ok.success) return { ok: false, erro: ok.error.issues[0].message }
  const supabase = await createClient()
  const { error } = await supabase.rpc("atualizar_parcelas", { p_lancamento: lancamentoId, p_parcelas: ok.data })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar()
  return { ok: true, mensagem: "Parcelas atualizadas." }
}

export async function cancelarLancamento(lancamentoId: string, motivo: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("cancelar_lancamento", { p_lancamento: lancamentoId, p_motivo: motivo })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar()
  return { ok: true, mensagem: "Lançamento cancelado." }
}

const baixaSchema = z.object({
  parcela_id: uuid(),
  data_pagamento: dataISO("Informe a data do pagamento."),
  valor: numeroBR({ positivo: true, mensagem: "Informe o valor pago." }),
  juros_multa: numeroBR({ min: 0 }).optional().default(0),
  desconto: numeroBR({ min: 0 }).optional().default(0),
  forma: z.enum(["pix", "boleto", "transferencia", "dinheiro", "cartao", "cheque", "outro"], { error: "Selecione a forma." }),
  comprovante_caminho: textoOpcional,
  observacao: textoOpcional,
})

export async function registrarBaixa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return SEM_PERMISSAO
  const obj = Object.fromEntries(formData)
  const dados = baixaSchema.safeParse({
    ...obj,
    juros_multa: obj.juros_multa === "" ? undefined : obj.juros_multa,
    desconto: obj.desconto === "" ? undefined : obj.desconto,
  })
  if (!dados.success) return falhaValidacao(dados.error)
  const supabase = await createClient()
  const { error } = await supabase.from("baixas").insert(dados.data)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar()
  return { ok: true, mensagem: "Pagamento registrado." }
}

export async function estornarBaixa(baixaId: string, motivo: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("estornar_baixa", { p_baixa: baixaId, p_motivo: motivo })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar()
  return { ok: true, mensagem: "Pagamento estornado." }
}

/** R-FIN-09: avisa (sem bloquear) possíveis lançamentos duplicados. */
export async function verificarDuplicidade(params: {
  tipo: string
  pessoa_id: string | null
  documento_numero: string | null
  valor_total: number | null
  data_competencia: string | null
}): Promise<{ id: string; descricao: string; data_competencia: string; valor_total: number }[]> {
  if (!(await usuarioDaAcao("admin", "financeiro"))) return []
  const supabase = await createClient()
  const filtros: string[] = []
  if (params.pessoa_id && params.documento_numero) filtros.push(`and(pessoa_id.eq.${params.pessoa_id},documento_numero.eq.${params.documento_numero.replace(/[,()]/g, "")})`)
  if (params.valor_total && params.data_competencia) {
    filtros.push(
      `and(valor_total.eq.${params.valor_total},data_competencia.gte.${somarDias(params.data_competencia, -30)},data_competencia.lte.${somarDias(params.data_competencia, 30)})`,
    )
  }
  if (!filtros.length) return []
  const { data } = await supabase
    .from("lancamentos")
    .select("id, descricao, data_competencia, valor_total")
    .eq("tipo", params.tipo)
    .eq("cancelado", false)
    .or(filtros.join(","))
    .limit(5)
  return (data ?? []).map((l) => ({ ...l, valor_total: Number(l.valor_total) }))
}
