"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { dataOpcional, falhaValidacao, texto, textoOpcional, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { falha, GESTAO, revalidarObra } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

const CODIGO_EM_USO: Resultado = { ok: false, erro: "Já existe uma obra com este código.", campos: { codigo: "Código em uso." } }

const obraSchema = z
  .object({
    codigo: textoOpcional,
    nome: texto("Informe o nome da obra."),
    cliente_id: uuidOpcional,
    endereco: textoOpcional,
    cidade: textoOpcional,
    uf: textoOpcional.transform((v) => (v ? v.toUpperCase() : null)).refine((v) => !v || /^[A-Z]{2}$/.test(v), "UF com 2 letras."),
    responsavel_id: uuid("Selecione o responsável."),
    data_inicio_prevista: dataOpcional,
    data_fim_prevista: dataOpcional,
    descricao: textoOpcional,
  })
  .refine((d) => !d.data_inicio_prevista || !d.data_fim_prevista || d.data_fim_prevista >= d.data_inicio_prevista, {
    message: "O término previsto deve ser depois do início.",
    path: ["data_fim_prevista"],
  })

const edicaoSchema = obraSchema.and(
  z
    .object({
      id: uuid(),
      situacao: z.enum(["planejamento", "em_andamento", "paralisada", "concluida", "cancelada"]),
      data_inicio_real: dataOpcional,
      data_fim_real: dataOpcional,
    })
    .refine((d) => !d.data_inicio_real || !d.data_fim_real || d.data_fim_real >= d.data_inicio_real, {
      message: "O término real deve ser depois do início real.",
      path: ["data_fim_real"],
    }),
)

export async function criarObra(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const dados = obraSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const supabase = await createClient()
  // Sem código, o banco gera o próximo OB-AAAA-NNN (R-OBR-01)
  const { codigo, ...resto } = dados.data
  const { data, error } = await supabase
    .from("obras")
    .insert({ ...resto, codigo: codigo ?? "" })
    .select("id")
    .single()
  if (error?.code === "23505") return CODIGO_EM_USO
  if (error) return falha(error)
  revalidatePath("/obras")
  redirect(`/obras/${data.id}`)
}

export async function editarObra(_: Resultado | null, formData: FormData): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const dados = edicaoSchema.safeParse(Object.fromEntries(formData))
  if (!dados.success) return falhaValidacao(dados.error)

  const { id, codigo, ...resto } = dados.data
  const supabase = await createClient()
  const { error } = await supabase
    .from("obras")
    .update({ ...resto, ...(codigo ? { codigo } : {}) })
    .eq("id", id)
  if (error?.code === "23505") return CODIGO_EM_USO
  if (error) return falha(error)
  revalidarObra(id)
  revalidatePath("/obras")
  return { ok: true, mensagem: "Obra atualizada." }
}

export async function adicionarMembro(obraId: string, perfilId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from("obra_membros").insert({ obra_id: obraId, perfil_id: perfilId })
  if (error?.code === "23505") return { ok: false, erro: "Esta pessoa já é membro da obra." }
  if (error) return falha(error)
  revalidarObra(obraId)
  return { ok: true, mensagem: "Membro adicionado." }
}

export async function removerMembro(obraId: string, perfilId: string): Promise<Resultado> {
  if (!(await usuarioDaAcao(...GESTAO))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error, count } = await supabase
    .from("obra_membros")
    .delete({ count: "exact" })
    .eq("obra_id", obraId)
    .eq("perfil_id", perfilId)
  if (error) return falha(error)
  // O RLS filtra em silêncio: 0 linhas = sem permissão para remover este membro
  if (!count) return { ok: false, erro: "Não foi possível remover este membro." }
  revalidarObra(obraId)
  return { ok: true, mensagem: "Membro removido." }
}

/** Histórico (auditoria) de um registro, para a gaveta "Histórico". */
export async function historicoDoRegistro(tabela: string, registroId: string) {
  const usuario = await usuarioDaAcao("admin", "gestor", "financeiro")
  if (!usuario) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from("auditoria")
    .select("id, acao, antes, depois, em, usuario_id")
    .eq("tabela", tabela)
    .eq("registro_id", registroId)
    .order("em", { ascending: false })
    .limit(100)
  const ids = [...new Set((data ?? []).map((a) => a.usuario_id).filter(Boolean))] as string[]
  const { data: perfis } = ids.length ? await supabase.from("perfis").select("id, nome").in("id", ids) : { data: [] }
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]))
  return (data ?? []).map((a) => ({ ...a, usuario: a.usuario_id ? (nomes.get(a.usuario_id) ?? "Usuário") : "Sistema" }))
}
