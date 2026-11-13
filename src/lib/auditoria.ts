// Apresentação dos registros de auditoria
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"
import { data, dataHora, moeda, numero } from "@/lib/format"

export const NOMES_TABELA: Record<string, string> = {
  obras: "Obra",
  obra_membros: "Membro da obra",
  etapas: "Etapa",
  servicos: "Serviço",
  documentos: "Documento",
  orcamento_versoes: "Versão do orçamento",
  orcamento_itens: "Item do orçamento",
  cronograma_versoes: "Versão do cronograma",
  cronograma_atividades: "Atividade do cronograma",
  cronograma_dependencias: "Dependência do cronograma",
  diarios: "Diário de obra",
  diario_equipe: "Equipe do diário",
  diario_materiais: "Material do diário",
  diario_equipamentos: "Equipamento do diário",
  diario_ocorrencias: "Ocorrência do diário",
  medicoes: "Medição",
  lancamentos: "Lançamento financeiro",
  parcelas: "Parcela",
  baixas: "Pagamento",
  perfis: "Usuário",
  pessoas: "Cliente/fornecedor",
}

export const ACOES: Record<string, string> = { INSERT: "Criou", UPDATE: "Alterou", DELETE: "Excluiu" }

const IGNORAR = new Set(["id", "atualizado_em", "criado_em", "criado_por", "obra_id", "versao_id", "diario_id"])

// Colunas com nome próprio na tela; as demais caem na regra genérica de `rotulo()`
const ROTULOS: Record<string, string> = {
  status: "situação",
  duracao_dias: "duração (dias)",
  data_competencia: "competência",
  data_pagamento: "data do pagamento",
  hora_inicio: "início do expediente",
  hora_fim: "fim do expediente",
  clima_manha: "clima de manhã",
  clima_tarde: "clima à tarde",
  atividades_resumo: "resumo das atividades",
  periodo_inicio: "período de",
  periodo_fim: "período até",
  justificativa_excesso: "justificativa do excesso",
  eh_cliente: "é cliente",
  eh_fornecedor: "é fornecedor",
  eh_prestador: "é prestador",
}

// Palavras que, sem acento, ficam erradas em português
const ACENTOS: Record<string, string> = {
  inicio: "início",
  duracao: "duração",
  codigo: "código",
  descricao: "descrição",
  observacao: "observação",
  observacoes: "observações",
  situacao: "situação",
  numero: "número",
  competencia: "competência",
  unitario: "unitário",
  revisao: "revisão",
  correcao: "correção",
  aprovacao: "aprovação",
  medicao: "medição",
  ocorrencia: "ocorrência",
  responsavel: "responsável",
  orcamento: "orçamento",
  funcao: "função",
  periodo: "período",
  versao: "versão",
  endereco: "endereço",
  titulo: "título",
  razao: "razão",
  previsao: "previsão",
  rejeicao: "rejeição",
  conferencia: "conferência",
  substituida: "substituída",
  concluida: "concluída",
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DATA = /^\d{4}-\d{2}-\d{2}$/
const DATA_HORA = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/
const DINHEIRO = /^(valor|juros|desconto|saldo|pago)/

/** Nome legível da coluna: "fim_previsto" → "fim previsto", "pessoa_id" → "pessoa". */
export function rotulo(coluna: string): string {
  if (ROTULOS[coluna]) return ROTULOS[coluna]
  return coluna
    .replace(/_id$/, "")
    .split("_")
    .map((p) => ACENTOS[p] ?? p)
    .join(" ")
}

/** Ids → nome, para mostrar "aprovada por: Ana" em vez do UUID. */
export type NomesReferenciados = Record<string, string>

function valorLegivel(coluna: string, v: unknown, nomes: NomesReferenciados): string {
  if (v === null || v === undefined || v === "") return "vazio"
  if (typeof v === "boolean") return v ? "sim" : "não"
  if (typeof v === "number") return DINHEIRO.test(coluna) ? moeda(v) : numero(v, 4)
  if (typeof v === "string") {
    if (UUID.test(v)) return nomes[v] ?? "outro registro"
    if (DATA.test(v)) return data(v)
    if (DATA_HORA.test(v)) return dataHora(v)
    // Valores de status em snake_case ("aguardando_conferencia") viram texto
    if (/^[a-z]+(_[a-z]+)*$/.test(v)) return v.split("_").map((p) => ACENTOS[p] ?? p).join(" ")
    return v
  }
  if (Array.isArray(v)) return v.map((x) => valorLegivel(coluna, x, nomes)).join(", ")
  return JSON.stringify(v)
}

/** Resumo legível das mudanças de um registro de auditoria */
export function resumoMudancas(acao: string, antes: unknown, depois: unknown, nomes: NomesReferenciados = {}): string[] {
  if (acao === "UPDATE" && depois && typeof depois === "object") {
    const a = (antes ?? {}) as Record<string, unknown>
    return Object.entries(depois as Record<string, unknown>)
      .filter(([k]) => !IGNORAR.has(k))
      .map(([k, v]) => `${rotulo(k)}: ${valorLegivel(k, a[k], nomes)} → ${valorLegivel(k, v, nomes)}`)
  }
  const linha = (acao === "DELETE" ? antes : depois) as Record<string, unknown> | null
  if (!linha) return []
  const destaque = ["codigo", "nome", "descricao", "titulo", "data", "status", "quantidade", "valor", "valor_total"]
  return destaque.filter((k) => k in linha && linha[k] !== null).map((k) => `${rotulo(k)}: ${valorLegivel(k, linha[k], nomes)}`)
}

/** Todos os UUIDs que aparecem nos valores (antes/depois) de uma lista de registros de auditoria. */
export function idsReferenciados(registros: { antes: unknown; depois: unknown }[]): string[] {
  const ids = new Set<string>()
  for (const r of registros) {
    for (const lado of [r.antes, r.depois]) {
      if (!lado || typeof lado !== "object") continue
      for (const [k, v] of Object.entries(lado as Record<string, unknown>)) {
        if (!IGNORAR.has(k) && typeof v === "string" && UUID.test(v)) ids.add(v)
      }
    }
  }
  return [...ids]
}

/**
 * Busca o nome de cada id referenciado (usuários, pessoas, etapas, serviços), respeitando o RLS de quem consulta.
 * O que não for encontrado aparece como "outro registro".
 */
export async function carregarNomes(supabase: SupabaseClient<Database>, ids: string[]): Promise<NomesReferenciados> {
  if (!ids.length) return {}
  const [perfis, pessoas, etapas, servicos] = await Promise.all([
    supabase.from("perfis").select("id, nome").in("id", ids),
    supabase.from("v_pessoas_basico").select("id, nome").in("id", ids),
    supabase.from("etapas").select("id, codigo, nome").in("id", ids),
    supabase.from("servicos").select("id, codigo, descricao").in("id", ids),
  ])
  const nomes: NomesReferenciados = {}
  for (const p of perfis.data ?? []) nomes[p.id] = p.nome
  for (const p of pessoas.data ?? []) if (p.id && p.nome) nomes[p.id] = p.nome
  for (const e of etapas.data ?? []) nomes[e.id] = `${e.codigo}. ${e.nome}`
  for (const s of servicos.data ?? []) nomes[s.id] = `${s.codigo} ${s.descricao}`
  return nomes
}
