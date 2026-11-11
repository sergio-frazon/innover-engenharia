"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import {
  dataISO,
  falhaValidacao,
  horaOpcional,
  numeroBR,
  numeroOpcional,
  texto,
  textoOpcional,
  uuid,
  uuidOpcional,
  type Resultado,
} from "@/lib/acoes"
import { EQUIPE_DA_OBRA, executar, falha, GESTAO, revalidarObra } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

// O diário alimenta o avanço da obra e os alertas de "diário pendente"
const revalidar = (obraId: string) => revalidarObra(obraId, { resumos: true })

// R-DIA-01 / R-DIA-08: cria o diário do dia, trazendo a equipe e o horário do último diário
export async function criarDiario(obraId: string, data: string): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { ok: false, erro: "Data inválida." }
  const supabase = await createClient()

  // Último diário anterior, já com a equipe (uma consulta só)
  const { data: ultimo } = await supabase
    .from("diarios")
    .select("hora_inicio, hora_fim, equipe:diario_equipe(profissional_id, nome, funcao, quantidade, horas)")
    .eq("obra_id", obraId)
    .lt("data", data)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: novo, error } = await supabase
    .from("diarios")
    .insert({ obra_id: obraId, data, hora_inicio: ultimo?.hora_inicio ?? null, hora_fim: ultimo?.hora_fim ?? null })
    .select("id")
    .single()
  if (error?.code === "23505") redirect(`/obras/${obraId}/diario/${data}`) // já existe: abre o existente
  if (error) return falha(error)

  if (ultimo?.equipe.length) {
    await supabase.from("diario_equipe").insert(ultimo.equipe.map((e) => ({ ...e, diario_id: novo.id })))
  }
  revalidar(obraId)
  redirect(`/obras/${obraId}/diario/${data}`)
}

const cabecalhoSchema = z.object({
  id: uuid(),
  obra_id: uuid(),
  hora_inicio: horaOpcional,
  hora_fim: horaOpcional,
  clima_manha: textoOpcional,
  clima_tarde: textoOpcional,
  atividades_resumo: textoOpcional,
  observacoes: textoOpcional,
  impedimentos: textoOpcional,
})

export async function salvarCabecalhoDiario(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  const dados = cabecalhoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, obra_id, ...campos } = dados.data
  if (campos.hora_inicio && campos.hora_fim && campos.hora_fim <= campos.hora_inicio) {
    return { ok: false, erro: "O horário de término deve ser depois do início.", campos: { hora_fim: "Depois do início." } }
  }
  const supabase = await createClient()
  const { error } = await supabase.from("diarios").update(campos).eq("id", id)
  if (error) return falha(error)
  revalidar(obra_id)
  return { ok: true, mensagem: "Diário salvo." }
}

// Linhas -----------------------------------------------------------------------

type TabelaFilha = "diario_equipe" | "diario_materiais" | "diario_equipamentos" | "diario_ocorrencias"

const equipeSchema = z
  .object({
    diario_id: uuid(),
    profissional_id: uuidOpcional,
    nome: textoOpcional,
    funcao: texto("Informe a função."),
    quantidade: numeroBR({ positivo: true, mensagem: "Informe a quantidade." }).refine(Number.isInteger, "Use número inteiro."),
    horas: numeroOpcional.refine((v) => v === null || (v > 0 && v <= 24), "Entre 0 e 24 horas."),
  })
  .refine((d) => d.profissional_id || d.nome || d.funcao, { message: "Informe o profissional ou a função.", path: ["nome"] })

const materialSchema = z.object({
  diario_id: uuid(),
  material_id: uuidOpcional,
  servico_id: uuidOpcional,
  descricao: texto("Informe o material."),
  unidade: texto("Informe a unidade."),
  quantidade: numeroBR({ positivo: true, mensagem: "Informe a quantidade." }),
})

const equipamentoSchema = z.object({
  diario_id: uuid(),
  equipamento_id: uuidOpcional,
  descricao: texto("Informe o equipamento."),
  horas: numeroOpcional.refine((v) => v === null || (v > 0 && v <= 24), "Entre 0 e 24 horas."),
  observacao: textoOpcional,
})

const ocorrenciaSchema = z.object({
  diario_id: uuid(),
  tipo: z.enum(["ocorrencia", "impedimento", "visita", "acidente", "entrega", "outro"]),
  hora: horaOpcional,
  descricao: texto("Descreva a ocorrência."),
})

const SCHEMAS: Record<TabelaFilha, z.ZodTypeAny> = {
  diario_equipe: equipeSchema,
  diario_materiais: materialSchema,
  diario_equipamentos: equipamentoSchema,
  diario_ocorrencias: ocorrenciaSchema,
}

/** Adiciona uma linha (equipe, material, equipamento ou ocorrência) ao diário. */
export async function adicionarLinhaDiario(tabela: TabelaFilha, obraId: string, _: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  const dados = SCHEMAS[tabela].safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const supabase = await createClient()
  // O schema de cada tabela (SCHEMAS) já garante as colunas; o cast só une os tipos das quatro tabelas
  const { error } = await supabase.from(tabela).insert(dados.data as never)
  if (error) return falha(error)
  revalidar(obraId)
  return { ok: true }
}

export async function removerLinhaDiario(tabela: TabelaFilha, obraId: string, id: string): Promise<Resultado> {
  return executar({ papeis: EQUIPE_DA_OBRA, operacao: (sb) => sb.from(tabela).delete().eq("id", id), revalidar: () => revalidar(obraId) })
}

// Serviços executados (medições do diário) ----------------------------------------

const medicaoDiarioSchema = z.object({
  id: uuidOpcional,
  diario_id: uuid(),
  servico_id: uuid("Selecione o serviço."),
  quantidade: numeroBR({ positivo: true, mensagem: "Informe a quantidade executada." }),
  local: textoOpcional,
  observacao: textoOpcional,
  justificativa_excesso: textoOpcional,
})

export async function salvarMedicaoDiario(obraId: string, _: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  const dados = medicaoDiarioSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, ...campos } = dados.data
  const supabase = await createClient()
  // A medição do diário vale para o dia do diário (período de um dia só)
  const { data: diario } = await supabase.from("diarios").select("data").eq("id", campos.diario_id).single()
  if (!diario) return { ok: false, erro: "Diário não encontrado." }
  const { quantidade, local, observacao, justificativa_excesso } = campos
  const { error } = id
    ? await supabase.from("medicoes").update({ quantidade, local, observacao, justificativa_excesso }).eq("id", id)
    : await supabase.from("medicoes").insert({ ...campos, obra_id: obraId, periodo_inicio: diario.data, periodo_fim: diario.data })
  if (error?.code === "23505") return { ok: false, erro: "Este serviço já foi lançado neste diário. Edite o lançamento existente." }
  if (error) return falha(error)
  revalidar(obraId)
  return { ok: true, mensagem: id ? "Serviço atualizado." : "Serviço lançado." }
}

export async function removerMedicaoDiario(obraId: string, id: string): Promise<Resultado> {
  return executar({
    papeis: EQUIPE_DA_OBRA,
    operacao: (sb) => sb.from("medicoes").delete().eq("id", id),
    mensagem: "Serviço removido do diário.",
    revalidar: () => revalidar(obraId),
  })
}

// Fluxo -----------------------------------------------------------------------------

export async function enviarDiario(obraId: string, id: string): Promise<Resultado> {
  return executar({
    papeis: EQUIPE_DA_OBRA,
    operacao: (sb) => sb.rpc("enviar_diario", { p_diario: id }),
    mensagem: "Diário enviado para conferência.",
    revalidar: () => revalidar(obraId),
  })
}

export async function aprovarDiario(obraId: string, id: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("aprovar_diario", { p_diario: id }),
    mensagem: "Diário aprovado. O avanço da obra foi atualizado.",
    revalidar: () => revalidar(obraId),
  })
}

export async function solicitarCorrecaoDiario(obraId: string, id: string, comentario: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("solicitar_correcao_diario", { p_diario: id, p_comentario: comentario }),
    mensagem: "Correção solicitada.",
    revalidar: () => revalidar(obraId),
  })
}

export async function excluirDiario(obraId: string, id: string): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from("diarios").delete().eq("id", id)
  if (error) return falha(error)
  revalidar(obraId)
  redirect(`/obras/${obraId}/diario`)
}

export async function irParaData(obraId: string, formData: FormData) {
  const data = dataISO().safeParse(formData.get("data"))
  if (data.success) redirect(`/obras/${obraId}/diario/${data.data}`)
}
