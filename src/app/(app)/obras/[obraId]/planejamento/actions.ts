"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { falhaValidacao, numeroBR, texto, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { executar, falha, GESTAO, revalidarObra, type ClienteSupabase } from "@/lib/acao-servidor"
import { mensagemDeErro } from "@/lib/erros"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

/** Lista de irmãos de um item: etapas da obra ou serviços da etapa. */
function irmaos(supabase: ClienteSupabase, tabela: "etapas" | "servicos", paiId: string) {
  return tabela === "etapas"
    ? supabase.from("etapas").select("id, ordem, codigo").eq("obra_id", paiId)
    : supabase.from("servicos").select("id, ordem, codigo").eq("etapa_id", paiId)
}

/** Próxima posição no fim da lista. */
async function proximaOrdem(supabase: ClienteSupabase, tabela: "etapas" | "servicos", paiId: string) {
  const { data } = await irmaos(supabase, tabela, paiId).order("ordem", { ascending: false }).limit(1).maybeSingle()
  return (data?.ordem ?? 0) + 1
}

// Etapas -----------------------------------------------------------------------

const etapaSchema = z.object({
  id: uuidOpcional,
  obra_id: uuid(),
  codigo: texto("Informe o código."),
  nome: texto("Informe o nome da etapa."),
  responsavel_id: uuidOpcional,
})

export async function salvarEtapa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const dados = etapaSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, ...campos } = dados.data
  const supabase = await createClient()

  const { error } = id
    ? await supabase.from("etapas").update(campos).eq("id", id)
    : await supabase.from("etapas").insert({ ...campos, ordem: await proximaOrdem(supabase, "etapas", campos.obra_id) })
  if (error?.code === "23505") return { ok: false, erro: "Já existe uma etapa com este código.", campos: { codigo: "Código em uso." } }
  if (error) return falha(error)
  revalidarObra(campos.obra_id)
  return { ok: true, mensagem: id ? "Etapa atualizada." : "Etapa criada." }
}

export async function alternarEtapa(obraId: string, id: string, ativo: boolean): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const supabase = await createClient()
  if (!ativo) {
    const { count } = await supabase.from("servicos").select("id", { count: "exact", head: true }).eq("etapa_id", id).eq("ativo", true)
    if (count) return { ok: false, erro: "Desative os serviços desta etapa antes." }
  }
  const { error } = await supabase.from("etapas").update({ ativo }).eq("id", id)
  if (error) return falha(error)
  revalidarObra(obraId)
  return { ok: true, mensagem: ativo ? "Etapa reativada." : "Etapa desativada." }
}

// Serviços ---------------------------------------------------------------------

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
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const dados = servicoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, obra_id, ...campos } = dados.data
  const supabase = await createClient()

  const { error } = id
    ? await supabase.from("servicos").update(campos).eq("id", id)
    : await supabase.from("servicos").insert({ ...campos, obra_id, ordem: await proximaOrdem(supabase, "servicos", campos.etapa_id) })
  if (error?.code === "23505") return { ok: false, erro: "Já existe um serviço com este código.", campos: { codigo: "Código em uso." } }
  if (error) return falha(error)
  revalidarObra(obra_id)
  return { ok: true, mensagem: id ? "Serviço atualizado." : "Serviço criado." }
}

export async function alternarServico(obraId: string, id: string, ativo: boolean): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.from("servicos").update({ ativo }).eq("id", id),
    mensagem: ativo ? "Serviço reativado." : "Serviço desativado.",
    revalidar: () => revalidarObra(obraId),
  })
}

// Ordem ------------------------------------------------------------------------

/**
 * Troca um item de posição com o vizinho e renumera a lista (1, 2, 3...).
 * Só grava as linhas cuja ordem mudou; em listas já contínuas, são duas.
 */
async function reordenar(tabela: "etapas" | "servicos", paiId: string, id: string, direcao: -1 | 1): Promise<string | null> {
  const supabase = await createClient()
  const { data: lista, error } = await irmaos(supabase, tabela, paiId).order("ordem").order("codigo")
  if (error || !lista) return mensagemDeErro(error)

  const i = lista.findIndex((x) => x.id === id)
  const j = i + direcao
  if (i < 0 || j < 0 || j >= lista.length) return null
  ;[lista[i], lista[j]] = [lista[j], lista[i]]

  const mudancas = lista.map((item, posicao) => ({ id: item.id, antes: item.ordem, depois: posicao + 1 })).filter((m) => m.antes !== m.depois)
  const resultados = await Promise.all(mudancas.map((m) => supabase.from(tabela).update({ ordem: m.depois }).eq("id", m.id)))
  const falhou = resultados.find((r) => r.error)
  return falhou ? mensagemDeErro(falhou.error) : null
}

export async function moverEtapa(obraId: string, id: string, direcao: -1 | 1): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const erro = await reordenar("etapas", obraId, id, direcao)
  if (erro) return { ok: false, erro }
  revalidarObra(obraId)
  return { ok: true }
}

export async function moverServico(obraId: string, etapaId: string, id: string, direcao: -1 | 1): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const erro = await reordenar("servicos", etapaId, id, direcao)
  if (erro) return { ok: false, erro }
  revalidarObra(obraId)
  return { ok: true }
}
