"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { booleano, falhaValidacao, numeroOpcional, texto, textoOpcional, uuidOpcional, type Resultado } from "@/lib/acoes"
import { falha } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"
import { cnpjValido, cpfValido } from "@/lib/documentos-br"
import { somenteDigitos } from "@/lib/format"
import type { Papel } from "@/lib/rotulos"

// Cadastros básicos: todos seguem o mesmo fluxo (validar → gravar → atualizar a lista)
// e nunca são apagados, só desativados (regra 3 do CLAUDE.md).

type Tabela = "pessoas" | "profissionais" | "materiais" | "equipamentos" | "categorias_financeiras"

const ROTA: Record<Tabela, string> = {
  pessoas: "/cadastros/pessoas",
  profissionais: "/cadastros/profissionais",
  materiais: "/cadastros/materiais",
  equipamentos: "/cadastros/equipamentos",
  categorias_financeiras: "/cadastros/categorias",
}

const PAPEIS_EDICAO: Record<Tabela, Papel[]> = {
  pessoas: ["admin", "gestor", "financeiro"],
  profissionais: ["admin", "gestor"],
  materiais: ["admin", "gestor"],
  equipamentos: ["admin", "gestor"],
  categorias_financeiras: ["admin", "financeiro"],
}

/** Grava o cadastro em nome do usuário logado; o RLS confirma a permissão no banco. */
async function gravar(tabela: Tabela, id: string | null, dados: Record<string, unknown>): Promise<Resultado> {
  if (!(await usuarioDaAcao(...PAPEIS_EDICAO[tabela]))) return SEM_PERMISSAO
  const supabase = await createClient()
  // Tipagem das tabelas é garantida pelos schemas zod de cada cadastro.
  const consulta = id
    ? supabase.from(tabela).update(dados as never).eq("id", id)
    : supabase.from(tabela).insert(dados as never)
  const { error } = await consulta
  if (error) {
    if (error.code === "23505") {
      return { ok: false, erro: tabela === "pessoas" ? "Já existe um cadastro com este CPF/CNPJ." : "Já existe um cadastro com esta descrição." }
    }
    return falha(error)
  }
  revalidatePath(ROTA[tabela])
  return { ok: true }
}

async function alternar(tabela: Tabela, id: string, ativo: boolean): Promise<Resultado> {
  if (!(await usuarioDaAcao(...PAPEIS_EDICAO[tabela]))) return SEM_PERMISSAO
  const supabase = await createClient()
  const { error } = await supabase.from(tabela).update({ ativo } as never).eq("id", id)
  if (error) return falha(error)
  revalidatePath(ROTA[tabela])
  return { ok: true }
}

const idSchema = z.object({ id: uuidOpcional })

/** Valida o formulário com o schema do cadastro e grava (insert sem `id`, update com `id`). */
function salvar(tabela: Tabela, schema: z.ZodType<Record<string, unknown>>, formData: FormData): Promise<Resultado> | Resultado {
  const obj = Object.fromEntries(formData)
  const dados = schema.safeParse(obj)
  if (!dados.success) return falhaValidacao(dados.error)
  return gravar(tabela, idSchema.parse(obj).id, dados.data)
}

// Pessoas -------------------------------------------------------------------

const pessoaSchema = z
  .object({
    nome: texto("Informe o nome."),
    tipo_pessoa: z.enum(["fisica", "juridica"], { error: "Selecione o tipo." }),
    documento: textoOpcional.transform((v) => (v ? somenteDigitos(v) : null)),
    eh_cliente: booleano,
    eh_fornecedor: booleano,
    eh_prestador: booleano,
    email: textoOpcional,
    telefone: textoOpcional,
    endereco: textoOpcional,
    observacao: textoOpcional,
  })
  .superRefine((d, ctx) => {
    if (!d.eh_cliente && !d.eh_fornecedor && !d.eh_prestador) {
      ctx.addIssue({ code: "custom", path: ["tipos"], message: "Marque pelo menos um: cliente, fornecedor ou prestador." })
    }
    if (d.documento) {
      if (d.tipo_pessoa === "fisica" && !cpfValido(d.documento)) ctx.addIssue({ code: "custom", path: ["documento"], message: "CPF inválido." })
      if (d.tipo_pessoa === "juridica" && !cnpjValido(d.documento)) ctx.addIssue({ code: "custom", path: ["documento"], message: "CNPJ inválido." })
    }
    if (d.email && !z.string().email().safeParse(d.email).success) ctx.addIssue({ code: "custom", path: ["email"], message: "E-mail inválido." })
  })

export async function salvarPessoa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  return salvar("pessoas", pessoaSchema, formData)
}
export async function alternarPessoa(id: string, ativo: boolean) {
  return alternar("pessoas", id, ativo)
}

// Profissionais ---------------------------------------------------------------

const profissionalSchema = z
  .object({
    nome: texto("Informe o nome."),
    funcao: texto("Informe a função."),
    vinculo: z.enum(["proprio", "terceirizado"], { error: "Selecione o vínculo." }),
    empresa_id: uuidOpcional,
    telefone: textoOpcional,
  })
  .superRefine((d, ctx) => {
    if (d.vinculo === "terceirizado" && !d.empresa_id) {
      ctx.addIssue({ code: "custom", path: ["empresa_id"], message: "Informe a empresa do profissional terceirizado." })
    }
  })
  .transform((d) => ({ ...d, empresa_id: d.vinculo === "proprio" ? null : d.empresa_id }))

export async function salvarProfissional(_: Resultado | null, formData: FormData): Promise<Resultado> {
  return salvar("profissionais", profissionalSchema, formData)
}
export async function alternarProfissional(id: string, ativo: boolean) {
  return alternar("profissionais", id, ativo)
}

// Materiais -------------------------------------------------------------------

const materialSchema = z.object({
  descricao: texto("Informe a descrição."),
  unidade: texto("Informe a unidade."),
  custo_unitario: numeroOpcional.refine((v) => v === null || v >= 0, "O custo não pode ser negativo."),
})

export async function salvarMaterial(_: Resultado | null, formData: FormData): Promise<Resultado> {
  return salvar("materiais", materialSchema, formData)
}
export async function alternarMaterial(id: string, ativo: boolean) {
  return alternar("materiais", id, ativo)
}

// Equipamentos ------------------------------------------------------------------

const equipamentoSchema = z.object({
  descricao: texto("Informe a descrição."),
  propriedade: z.enum(["proprio", "alugado"], { error: "Selecione." }),
  identificacao: textoOpcional,
})

export async function salvarEquipamento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  return salvar("equipamentos", equipamentoSchema, formData)
}
export async function alternarEquipamento(id: string, ativo: boolean) {
  return alternar("equipamentos", id, ativo)
}

// Categorias financeiras ----------------------------------------------------------

const categoriaSchema = z.object({
  nome: texto("Informe o nome."),
  tipo: z.enum(["despesa", "receita"], { error: "Selecione o tipo." }),
})

export async function salvarCategoria(_: Resultado | null, formData: FormData): Promise<Resultado> {
  return salvar("categorias_financeiras", categoriaSchema, formData)
}
export async function alternarCategoria(id: string, ativo: boolean) {
  return alternar("categorias_financeiras", id, ativo)
}
