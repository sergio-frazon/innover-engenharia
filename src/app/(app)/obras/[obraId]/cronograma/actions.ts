"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { dataISO, falhaValidacao, uuid, type Resultado } from "@/lib/acoes"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"
import { empurrarSucessores, type Periodo } from "@/lib/cronograma"

function revalidar(obraId: string) {
  revalidatePath(`/obras/${obraId}`, "layout")
}

export async function criarVersaoCronograma(obraId: string, descricao: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("criar_revisao_cronograma", { p_obra: obraId, p_descricao: descricao || undefined })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, id: data, mensagem: "Rascunho criado." }
}

export async function aprovarCronograma(obraId: string, versaoId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("aprovar_cronograma", { p_versao: versaoId })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Cronograma aprovado." }
}

export async function descartarRascunhoCronograma(obraId: string, versaoId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("descartar_rascunho_cronograma", { p_versao: versaoId })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Rascunho descartado." }
}

const atividadeSchema = z
  .object({
    obra_id: uuid(),
    versao_id: uuid(),
    servico_id: uuid(),
    inicio: dataISO("Informe o início."),
    fim: dataISO("Informe o término."),
    empurrar: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((d) => d.fim >= d.inicio, { message: "O término não pode ser antes do início.", path: ["fim"] })

export async function salvarAtividade(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const dados = atividadeSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { obra_id, versao_id, servico_id, inicio, fim, empurrar } = dados.data
  const predecessores = formData.getAll("predecessores").map(String).filter((v) => /^[0-9a-f-]{36}$/i.test(v))

  const supabase = await createClient()
  let ajustes: { servico_id: string; inicio: string; fim: string }[] = []

  if (empurrar) {
    const [{ data: atividades }, { data: deps }] = await Promise.all([
      supabase.from("cronograma_atividades").select("servico_id, inicio_previsto, fim_previsto").eq("versao_id", versao_id),
      supabase.from("cronograma_dependencias").select("servico_id, predecessor_id").eq("versao_id", versao_id),
    ])
    const mapa: Record<string, Periodo> = Object.fromEntries((atividades ?? []).map((a) => [a.servico_id, { inicio: a.inicio_previsto, fim: a.fim_previsto }]))
    mapa[servico_id] = { inicio, fim }
    const dependencias = [...(deps ?? []).filter((d) => d.servico_id !== servico_id), ...predecessores.map((p) => ({ servico_id, predecessor_id: p }))]
    try {
      ajustes = Object.entries(empurrarSucessores(mapa, dependencias, servico_id)).map(([id, p]) => ({ servico_id: id, ...p }))
    } catch {
      return { ok: false, erro: "As dependências formam um ciclo." }
    }
  }

  const { error } = await supabase.rpc("salvar_atividade_cronograma", {
    p_versao: versao_id,
    p_servico: servico_id,
    p_inicio: inicio,
    p_fim: fim,
    p_predecessores: predecessores,
    p_ajustes: ajustes,
  })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obra_id)
  return { ok: true, mensagem: ajustes.length ? `Datas salvas. ${ajustes.length} serviço(s) sucessor(es) deslocado(s).` : "Datas salvas." }
}

export async function removerAtividade(obraId: string, versaoId: string, servicoId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from("cronograma_atividades").delete().eq("versao_id", versaoId).eq("servico_id", servicoId)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Datas removidas." }
}
