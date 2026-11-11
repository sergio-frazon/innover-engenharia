import "server-only"
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"
import { mensagemDeErro, type ErroBanco } from "@/lib/erros"
import type { Resultado } from "@/lib/acoes"
import type { Papel } from "@/lib/rotulos"

// Peças comuns das Server Actions. A segurança de verdade está no banco (RLS, triggers, RPCs);
// a checagem de papel aqui só evita uma ida ao banco e devolve uma mensagem clara.

export type ClienteSupabase = Awaited<ReturnType<typeof createClient>>

// Grupos de papéis que se repetem nas permissões (docs/05-permissoes.md)
/** Planejamento, orçamento, cronograma e aprovações. */
export const GESTAO: Papel[] = ["admin", "gestor"]
/** Quem trabalha na obra: diário, medições e documentos. */
export const EQUIPE_DA_OBRA: Papel[] = ["admin", "gestor", "campo"]
/** Contas a pagar e receber. */
export const FINANCEIRO: Papel[] = ["admin", "financeiro"]

/** Resultado de falha a partir de um erro do Supabase/Postgres. */
export function falha(error: ErroBanco | null | undefined): Resultado {
  return { ok: false, erro: mensagemDeErro(error) }
}

/**
 * Atualiza as telas de uma obra (o layout cobre todas as abas).
 * `resumos` também atualiza o painel e os alertas, que somam dados de todas as obras.
 */
export function revalidarObra(obraId: string, { resumos = false } = {}) {
  revalidatePath(`/obras/${obraId}`, "layout")
  if (resumos) revalidarResumos()
}

/** Painel e alertas: mudam com diários, medições e contas. */
export function revalidarResumos() {
  revalidatePath("/painel")
  revalidatePath("/alertas")
}

type Operacao = (supabase: ClienteSupabase) => PromiseLike<{ data?: unknown; error: ErroBanco | null }>

/**
 * Ação de um passo só (aprovar, enviar, remover...): confere o papel, roda a operação com o
 * cliente do usuário logado, traduz o erro do banco e revalida as telas.
 * Se a operação devolver um texto (id criado por uma RPC), ele volta em `id`.
 */
export async function executar(opcoes: { papeis: Papel[]; operacao: Operacao; mensagem?: string; revalidar: () => void }): Promise<Resultado> {
  if (!(await usuarioDaAcao(...opcoes.papeis))) return SEM_PERMISSAO
  const { data, error } = await opcoes.operacao(await createClient())
  if (error) return falha(error)
  opcoes.revalidar()
  return { ok: true, mensagem: opcoes.mensagem, ...(typeof data === "string" ? { id: data } : {}) }
}
