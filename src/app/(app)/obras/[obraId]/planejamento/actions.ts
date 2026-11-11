"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { falhaValidacao, numeroBR, texto, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

function revalidar(obraId: string) {
  revalidatePath(`/obras/${obraId}`, "layout")
}

const etapaSchema = z.object({
  id: uuidOpcional,
  obra_id: uuid(),
  codigo: texto("Informe o código."),
  nome: texto("Informe o nome da etapa."),
  responsavel_id: uuidOpcional,
})

export async function salvarEtapa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const dados = etapaSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, ...campos } = dados.data
  const supabase = await createClient()

  let error
  if (id) {
    ;({ error } = await supabase.from("etapas").update(campos).eq("id", id))
  } else {
    const { data: ultima } = await supabase.from("etapas").select("ordem").eq("obra_id", campos.obra_id).order("ordem", { ascending: false }).limit(1).maybeSingle()
    ;({ error } = await supabase.from("etapas").insert({ ...campos, ordem: (ultima?.ordem ?? 0) + 1 }))
  }
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Já existe uma etapa com este código.", campos: { codigo: "Código em uso." } }
    return { ok: false, erro: mensagemDeErro(error) }
  }
  revalidar(campos.obra_id)
  return { ok: true, mensagem: id ? "Etapa atualizada." : "Etapa criada." }
}

const servicoSchema = z.object({
  id: uuidOpcional,
  obra_id: uuid(),
  etapa_id: uuid("Selecione a etapa."),
  codigo: texto("Informe o código."),
  descricao: texto("Informe a descrição."),
  unidade: texto("Informe a unidade."),
  quantidade_prevista: numeroBR({ positivo: true, mensagem: "Informe a quantidade prevista." }),
  responsavel_id: uuidOpcional,
})

export async function salvarServico(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const dados = servicoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, obra_id, ...campos } = dados.data
  const supabase = await createClient()

  let error
  if (id) {
    ;({ error } = await supabase.from("servicos").update(campos).eq("id", id))
  } else {
    const { data: ultimo } = await supabase.from("servicos").select("ordem").eq("etapa_id", campos.etapa_id).order("ordem", { ascending: false }).limit(1).maybeSingle()
    ;({ error } = await supabase.from("servicos").insert({ ...campos, obra_id, ordem: (ultimo?.ordem ?? 0) + 1 }))
  }
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Já existe um serviço com este código.", campos: { codigo: "Código em uso." } }
    return { ok: false, erro: mensagemDeErro(error) }
  }
  revalidar(obra_id)
  return { ok: true, mensagem: id ? "Serviço atualizado." : "Serviço criado." }
}

async function reordenar(tabela: "etapas" | "servicos", paiId: string, id: string, direcao: -1 | 1) {
  const supabase = await createClient()
  const { data: irmaos, error } =
    tabela === "etapas"
      ? await supabase.from("etapas").select("id, ordem, codigo").eq("obra_id", paiId).order("ordem").order("codigo")
      : await supabase.from("servicos").select("id, ordem, codigo").eq("etapa_id", paiId).order("ordem").order("codigo")
  if (error || !irmaos) return mensagemDeErro(error)
  const i = irmaos.findIndex((x) => x.id === id)
  const j = i + direcao
  if (i < 0 || j < 0 || j >= irmaos.length) return null
  ;[irmaos[i], irmaos[j]] = [irmaos[j], irmaos[i]]
  for (const [ordem, item] of irmaos.entries()) {
    if (item.ordem !== ordem + 1) {
      const { error: e } = await supabase.from(tabela).update({ ordem: ordem + 1 }).eq("id", item.id)
      if (e) return mensagemDeErro(e)
    }
  }
  return null
}

export async function moverEtapa(obraId: string, id: string, direcao: -1 | 1): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const erro = await reordenar("etapas", obraId, id, direcao)
  if (erro) return { ok: false, erro }
  revalidar(obraId)
  return { ok: true }
}

export async function moverServico(obraId: string, etapaId: string, id: string, direcao: -1 | 1): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const erro = await reordenar("servicos", etapaId, id, direcao)
  if (erro) return { ok: false, erro }
  revalidar(obraId)
  return { ok: true }
}

export async function alternarServico(obraId: string, id: string, ativo: boolean): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from("servicos").update({ ativo }).eq("id", id)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: ativo ? "Serviço reativado." : "Serviço desativado." }
}

export async function alternarEtapa(obraId: string, id: string, ativo: boolean): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  if (!ativo) {
    const { count } = await supabase.from("servicos").select("id", { count: "exact", head: true }).eq("etapa_id", id).eq("ativo", true)
    if (count) return { ok: false, erro: "Desative os serviços desta etapa antes." }
  }
  const { error } = await supabase.from("etapas").update({ ativo }).eq("id", id)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: ativo ? "Etapa reativada." : "Etapa desativada." }
}
