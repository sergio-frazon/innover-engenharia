// Apresentação dos registros de auditoria

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

function valorLegivel(v: unknown): string {
  if (v === null || v === undefined || v === "") return "vazio"
  if (typeof v === "boolean") return v ? "sim" : "não"
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v.split("-").reverse().join("/")
  return String(v)
}

/** Resumo legível das mudanças de um registro de auditoria */
export function resumoMudancas(acao: string, antes: unknown, depois: unknown): string[] {
  if (acao === "UPDATE" && depois && typeof depois === "object") {
    const a = (antes ?? {}) as Record<string, unknown>
    return Object.entries(depois as Record<string, unknown>)
      .filter(([k]) => !IGNORAR.has(k))
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${valorLegivel(a[k])} → ${valorLegivel(v)}`)
  }
  const linha = (acao === "DELETE" ? antes : depois) as Record<string, unknown> | null
  if (!linha) return []
  const destaque = ["codigo", "nome", "descricao", "titulo", "data", "status", "quantidade", "valor", "valor_total"]
  return destaque.filter((k) => k in linha && linha[k] !== null).map((k) => `${k.replace(/_/g, " ")}: ${valorLegivel(linha[k])}`)
}
