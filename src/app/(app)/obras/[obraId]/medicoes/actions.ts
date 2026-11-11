"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { dataISO, falhaValidacao, numeroBR, textoOpcional, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

function revalidar(obraId: string) {
  revalidatePath(`/obras/${obraId}`, "layout")
  revalidatePath("/painel")
  revalidatePath("/alertas")
}

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
    enviar: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  })
  .refine((d) => d.periodo_fim >= d.periodo_inicio, { message: "O fim deve ser depois do início.", path: ["periodo_fim"] })

export async function salvarMedicaoAvulsa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor", "campo"))) return SEM_PERMISSAO
  const dados = avulsaSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, enviar, ...campos } = dados.data
  const supabase = await createClient()

  let medicaoId = id
  if (id) {
    const { periodo_inicio, periodo_fim, quantidade, local, observacao, justificativa_excesso } = campos
    const { error } = await supabase
      .from("medicoes")
      .update({ periodo_inicio, periodo_fim, quantidade, local, observacao, justificativa_excesso })
      .eq("id", id)
    if (error) return { ok: false, erro: mensagemDeErro(error) }
  } else {
    const { data, error } = await supabase.from("medicoes").insert(campos).select("id").single()
    if (error) return { ok: false, erro: mensagemDeErro(error) }
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
  if (!(await usuarioDaAcao("admin", "gestor", "campo"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("enviar_medicao", { p_medicao: id })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Medição enviada para aprovação." }
}

export async function aprovarMedicoes(obraId: string, ids: string[]): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const erros: string[] = []
  let aprovadas = 0
  for (const id of ids) {
    const { error } = await supabase.rpc("aprovar_medicao", { p_medicao: id })
    if (error) erros.push(mensagemDeErro(error))
    else aprovadas++
  }
  revalidar(obraId)
  if (erros.length) return { ok: false, erro: `${aprovadas} aprovada(s). ${erros.length} com problema: ${erros[0]}` }
  return { ok: true, mensagem: aprovadas === 1 ? "Medição aprovada." : `${aprovadas} medições aprovadas.` }
}

export async function rejeitarMedicao(obraId: string, id: string, comentario: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("rejeitar_medicao", { p_medicao: id, p_comentario: comentario })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Medição rejeitada." }
}

export async function reabrirMedicao(obraId: string, id: string, motivo: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("reabrir_medicao", { p_medicao: id, p_motivo: motivo })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Medição reaberta: volta a aguardar aprovação." }
}

export async function excluirMedicao(obraId: string, id: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor", "campo"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from("medicoes").delete().eq("id", id)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Medição excluída." }
}
