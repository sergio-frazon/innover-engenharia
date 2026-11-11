"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { booleano, dataISO, falhaValidacao, uuid, type Resultado } from "@/lib/acoes"
import { executar, falha, GESTAO, revalidarObra } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"
import { empurrarSucessores, type Periodo } from "@/lib/cronograma"

// Versões (R-CRO): mesmo ciclo do orçamento — rascunho → aprovada → substituída.

export async function criarVersaoCronograma(obraId: string, descricao: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("criar_revisao_cronograma", { p_obra: obraId, p_descricao: descricao || undefined }),
    mensagem: "Rascunho criado.",
    revalidar: () => revalidarObra(obraId),
  })
}

export async function aprovarCronograma(obraId: string, versaoId: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("aprovar_cronograma", { p_versao: versaoId }),
    mensagem: "Cronograma aprovado.",
    revalidar: () => revalidarObra(obraId),
  })
}

export async function descartarRascunhoCronograma(obraId: string, versaoId: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("descartar_rascunho_cronograma", { p_versao: versaoId }),
    mensagem: "Rascunho descartado.",
    revalidar: () => revalidarObra(obraId),
  })
}

// Atividades -------------------------------------------------------------------

const UUID = /^[0-9a-f-]{36}$/i

const atividadeSchema = z
  .object({
    obra_id: uuid(),
    versao_id: uuid(),
    servico_id: uuid(),
    inicio: dataISO("Informe o início."),
    fim: dataISO("Informe o término."),
    empurrar: booleano,
  })
  .refine((d) => d.fim >= d.inicio, { message: "O término não pode ser antes do início.", path: ["fim"] })

/**
 * Salva as datas de um serviço e seus predecessores. Com "empurrar", calcula aqui os
 * deslocamentos dos sucessores (lib/cronograma) e o banco grava tudo numa única transação.
 */
export async function salvarAtividade(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const dados = atividadeSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { obra_id, versao_id, servico_id, inicio, fim, empurrar } = dados.data
  const predecessores = formData.getAll("predecessores").map(String).filter((v) => UUID.test(v))

  const supabase = await createClient()
  let ajustes: { servico_id: string; inicio: string; fim: string }[] = []

  if (empurrar) {
    const [{ data: atividades }, { data: deps }] = await Promise.all([
      supabase.from("cronograma_atividades").select("servico_id, inicio_previsto, fim_previsto").eq("versao_id", versao_id),
      supabase.from("cronograma_dependencias").select("servico_id, predecessor_id").eq("versao_id", versao_id),
    ])
    // Estado como ficará depois de salvar: datas novas deste serviço e seus predecessores novos
    const periodos: Record<string, Periodo> = Object.fromEntries((atividades ?? []).map((a) => [a.servico_id, { inicio: a.inicio_previsto, fim: a.fim_previsto }]))
    periodos[servico_id] = { inicio, fim }
    const dependencias = [...(deps ?? []).filter((d) => d.servico_id !== servico_id), ...predecessores.map((p) => ({ servico_id, predecessor_id: p }))]
    try {
      ajustes = Object.entries(empurrarSucessores(periodos, dependencias, servico_id)).map(([id, p]) => ({ servico_id: id, ...p }))
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
  if (error) return falha(error)
  revalidarObra(obra_id)
  return { ok: true, mensagem: ajustes.length ? `Datas salvas. ${ajustes.length} serviço(s) sucessor(es) deslocado(s).` : "Datas salvas." }
}

export async function removerAtividade(obraId: string, versaoId: string, servicoId: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.from("cronograma_atividades").delete().eq("versao_id", versaoId).eq("servico_id", servicoId),
    mensagem: "Datas removidas.",
    revalidar: () => revalidarObra(obraId),
  })
}
