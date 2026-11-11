"use server"

import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { falhaValidacao, numeroBR, texto, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { executar, falha, GESTAO, revalidarObra } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

// Versões (R-ORC): rascunho → aprovada → substituída. As regras ficam nas RPCs do banco.

export async function criarVersaoOrcamento(obraId: string, descricao: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("criar_revisao_orcamento", { p_obra: obraId, p_descricao: descricao || undefined }),
    mensagem: "Rascunho criado.",
    revalidar: () => revalidarObra(obraId),
  })
}

export async function aprovarOrcamento(obraId: string, versaoId: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("aprovar_orcamento", { p_versao: versaoId }),
    mensagem: "Orçamento aprovado.",
    revalidar: () => revalidarObra(obraId),
  })
}

export async function descartarRascunhoOrcamento(obraId: string, versaoId: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.rpc("descartar_rascunho_orcamento", { p_versao: versaoId }),
    mensagem: "Rascunho descartado.",
    revalidar: () => revalidarObra(obraId),
  })
}

// Itens ------------------------------------------------------------------------

const itemSchema = z.object({
  id: uuidOpcional,
  obra_id: uuid(),
  versao_id: uuid(),
  servico_id: uuid("Selecione o serviço."),
  natureza: z.enum(["material", "mao_de_obra", "equipamento", "outro"], { error: "Selecione a natureza." }),
  material_id: uuidOpcional,
  descricao: texto("Informe a descrição."),
  unidade: texto("Informe a unidade."),
  quantidade: numeroBR({ min: 0, mensagem: "Informe a quantidade." }),
  // Dinheiro é numeric(14,2): rejeita frações de centavo em vez de arredondar sem avisar
  valor_unitario: numeroBR({ min: 0, mensagem: "Informe o valor unitário." }).refine(
    (v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6,
    "Use no máximo 2 casas decimais (centavos).",
  ),
})

export async function salvarItemOrcamento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const dados = itemSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)
  const { id, obra_id, ...campos } = dados.data
  const supabase = await createClient()
  const { error } = id ? await supabase.from("orcamento_itens").update(campos).eq("id", id) : await supabase.from("orcamento_itens").insert(campos)
  if (error) return falha(error)
  revalidarObra(obra_id)
  return { ok: true, mensagem: id ? "Item atualizado." : "Item adicionado." }
}

export async function duplicarItemOrcamento(obraId: string, itemId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { data: item, error: erroLeitura } = await supabase
    .from("orcamento_itens")
    .select("versao_id, servico_id, natureza, descricao, material_id, unidade, quantidade, valor_unitario, ordem")
    .eq("id", itemId)
    .single()
  if (erroLeitura || !item) return falha(erroLeitura)
  const { error } = await supabase.from("orcamento_itens").insert({ ...item, descricao: `${item.descricao} (cópia)`, ordem: item.ordem + 1 })
  if (error) return falha(error)
  revalidarObra(obraId)
  return { ok: true, mensagem: "Item duplicado." }
}

export async function removerItemOrcamento(obraId: string, itemId: string): Promise<Resultado> {
  return executar({
    papeis: GESTAO,
    operacao: (sb) => sb.from("orcamento_itens").delete().eq("id", itemId),
    mensagem: "Item removido.",
    revalidar: () => revalidarObra(obraId),
  })
}
