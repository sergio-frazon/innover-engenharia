"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { booleano, dataISO, falhaValidacao, numeroBR, textoOpcional, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { EQUIPE_DA_OBRA, executar, falha, GESTAO, revalidarObra } from "@/lib/acao-servidor"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

// Medições mexem no avanço da obra, que aparece no painel e nos alertas
const revalidar = (obraId: string) => revalidarObra(obraId, { resumos: true })

const avulsaSchema = z
  .object({
    id: uuidOpcional,
    obra_id: uuid(),
    servico_id: uuid("Selecione o serviço."),
    periodo_inicio: dataISO("Informe o início do período."),
    periodo_fim: dataISO("Informe o fim do período."),
    quantidade: numeroBR({ positivo: true, mensagem: "Informe a quantidade." }),
    local: textoOpcional,
    observacao: textoOpcional,
    justificativa_excesso: textoOpcional,
    enviar: booleano,
  })
  .refine((d) => d.periodo_fim >= d.periodo_inicio, { message: "O fim deve ser depois do início.", path: ["periodo_fim"] })

/** Medição fora do diário: salva como rascunho e, se pedido, já envia para aprovação. */
export async function salvarMedicaoAvulsa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  const dados = avulsaSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, enviar, ...campos } = dados.data
  const supabase = await createClient()

  let medicaoId = id
  if (id) {
    // Obra e serviço não mudam numa edição
    const { periodo_inicio, periodo_fim, quantidade, local, observacao, justificativa_excesso } = campos
    const { error } = await supabase
      .from("medicoes")
      .update({ periodo_inicio, periodo_fim, quantidade, local, observacao, justificativa_excesso })
      .eq("id", id)
    if (error) return falha(error)
  } else {
    const { data, error } = await supabase.from("medicoes").insert(campos).select("id").single()
    if (error) return falha(error)
    medicaoId = data.id
  }

  if (enviar && medicaoId) {
    const { error } = await supabase.rpc("enviar_medicao", { p_medicao: medicaoId })
    if (error) {
      revalidar(campos.obra_id)
      return { ok: false, erro: `Medição salva como rascunho, mas não foi enviada: ${mensagemDeErro(error)}` }
    }
  }
  revalidar(campos.obra_id)
  return { ok: true, mensagem: enviar ? "Medição enviada para aprovação." : "Medição salva como rascunho." }
}

export async function enviarMedicao(obraId: string, id: string): Promise<Resultado> {
  return executar({
    papeis: EQUIPE_DA_OBRA,
    operacao: (sb) => sb.rpc("enviar_medicao", { p_medicao: id }),
    mensagem: "Medição enviada para aprovação.",
    revalidar: () => revalidar(obraId),
  })
}

/** Aprovação em lote: cada medição é aprovada à parte, e as que falharem não travam as demais. */
export async function aprovarMedicoes(obraId: string, ids: string[]): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const supabase = await createClient()
  const erros: string[] = []
  for (const id of ids) {
    const { error } = await supabase.rpc("aprovar_medicao", { p_medicao: id })
    if (error) erros.push(mensagemDeErro(error))
  }
  const aprovadas = ids.length - erros.length
  revalidar(obraId)
  if (erros.length) return { ok: false, erro: `${aprovadas} aprovada(s). ${erros.length} com problema: ${erros[0]}` }
  return { ok: true, mensagem: aprovadas === 1 ? "Medição aprovada." : `${aprovadas} medições aprovadas.` }
}

export async function rejeitarMedicao(obraId: string, id: string, comentario: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("rejeitar_medicao", { p_medicao: id, p_comentario: comentario }),
    mensagem: "Medição rejeitada.",
    revalidar: () => revalidar(obraId),
  })
}

export async function reabrirMedicao(obraId: string, id: string, motivo: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("reabrir_medicao", { p_medicao: id, p_motivo: motivo }),
    mensagem: "Medição reaberta: volta a aguardar aprovação.",
    revalidar: () => revalidar(obraId),
  })
}

export async function excluirMedicao(obraId: string, id: string): Promise<Resultado> {
  return executar({
    papeis: EQUIPE_DA_OBRA,
    operacao: (sb) => sb.from("medicoes").delete().eq("id", id),
    mensagem: "Medição excluída.",
    revalidar: () => revalidar(obraId),
  })
}
