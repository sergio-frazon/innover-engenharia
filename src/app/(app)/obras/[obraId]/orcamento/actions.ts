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

export async function criarVersaoOrcamento(obraId: string, descricao: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("criar_revisao_orcamento", { p_obra: obraId, p_descricao: descricao || undefined })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, id: data, mensagem: "Rascunho criado." }
}

export async function aprovarOrcamento(obraId: string, versaoId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("aprovar_orcamento", { p_versao: versaoId })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Orçamento aprovado." }
}

export async function descartarRascunhoOrcamento(obraId: string, versaoId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.rpc("descartar_rascunho_orcamento", { p_versao: versaoId })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Rascunho descartado." }
}

const itemSchema = z.object({
  id: uuidOpcional,
  obra_id: uuid(),
  versao_id: uuid(),
  servico_id: uuid("Selecione o serviço."),
  natureza: z.enum(["material", "mao_de_obra", "equipamento", "outro"], { errorMap: () => ({ message: "Selecione a natureza." }) }),
  material_id: uuidOpcional,
  descricao: texto("Informe a descrição."),
  unidade: texto("Informe a unidade."),
  quantidade: numeroBR({ min: 0, mensagem: "Informe a quantidade." }),
  valor_unitario: numeroBR({ min: 0, mensagem: "Informe o valor unitário." }).refine(
    (v) => Math.round(v * 100) === v * 100 || Math.abs(Math.round(v * 100) - v * 100) < 1e-6,
    "Use no máximo 2 casas decimais (centavos).",
  ),
})

export async function salvarItemOrcamento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const dados = itemSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, obra_id, ...campos } = dados.data
  const supabase = await createClient()
  const { error } = id ? await supabase.from("orcamento_itens").update(campos).eq("id", id) : await supabase.from("orcamento_itens").insert(campos)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obra_id)
  return { ok: true, mensagem: id ? "Item atualizado." : "Item adicionado." }
}

export async function duplicarItemOrcamento(obraId: string, itemId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { data: item, error: e1 } = await supabase
    .from("orcamento_itens")
    .select("versao_id, servico_id, natureza, descricao, material_id, unidade, quantidade, valor_unitario, ordem")
    .eq("id", itemId)
    .single()
  if (e1 || !item) return { ok: false, erro: mensagemDeErro(e1) }
  const { error } = await supabase.from("orcamento_itens").insert({ ...item, descricao: `${item.descricao} (cópia)`, ordem: item.ordem + 1 })
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Item duplicado." }
}

export async function removerItemOrcamento(obraId: string, itemId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao("admin", "gestor"))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from("orcamento_itens").delete().eq("id", itemId)
  if (error) return { ok: false, erro: mensagemDeErro(error) }
  revalidar(obraId)
  return { ok: true, mensagem: "Item removido." }
}
