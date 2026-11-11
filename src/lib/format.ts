// Formatação pt-BR. Datas de calendário chegam do banco como "aaaa-mm-dd" e
// NÃO podem passar por new Date(texto) (viraria UTC e mudaria o dia).

type Valor = number | string | null | undefined

/** Valores numéricos vêm do Postgres como number ou string (numeric). Vazio vira "—" na tela. */
const vazio = (valor: Valor): valor is null | undefined | "" => valor === null || valor === undefined || valor === ""

// Intl.NumberFormat é caro de criar: um por configuração, reaproveitado em todas as células
const formatadores = new Map<string, Intl.NumberFormat>()
function formatador(minCasas: number, maxCasas: number): Intl.NumberFormat {
  const chave = `${minCasas}-${maxCasas}`
  let fmt = formatadores.get(chave)
  if (!fmt) {
    fmt = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: minCasas, maximumFractionDigits: maxCasas })
    formatadores.set(chave, fmt)
  }
  return fmt
}

const moedaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })

/** R$ 1.234,56 */
export function moeda(valor: Valor): string {
  return vazio(valor) ? "—" : moedaFmt.format(Number(valor))
}

/** 1.234,5 — até `maxCasas` decimais, sem zeros à direita. */
export function numero(valor: Valor, maxCasas = 2): string {
  return vazio(valor) ? "—" : formatador(0, maxCasas).format(Number(valor))
}

/** Número com a unidade: "12,5 m²". */
export function quantidade(valor: Valor, unidade?: string | null): string {
  const n = numero(valor, 2)
  return unidade && n !== "—" ? `${n} ${unidade}` : n
}

/** 56,4% — sempre com `casas` decimais, para alinhar colunas. */
export function percentual(valor: Valor, casas = 1): string {
  return vazio(valor) ? "—" : formatador(casas, casas).format(Number(valor)) + "%"
}

/** "aaaa-mm-dd" → "dd/mm/aaaa" */
export function data(valor: string | null | undefined): string {
  if (!valor) return "—"
  const [a, m, d] = valor.slice(0, 10).split("-")
  if (!a || !m || !d) return "—"
  return `${d}/${m}/${a}`
}

/** timestamptz → "dd/mm/aaaa hh:mm" no fuso de São Paulo */
export function dataHora(valor: string | null | undefined): string {
  if (!valor) return "—"
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(valor))
}

/** "hh:mm:ss" → "hh:mm" */
export function hora(valor: string | null | undefined): string {
  return valor ? valor.slice(0, 5) : "—"
}

/** Hoje em São Paulo, "aaaa-mm-dd" */
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date())
}

/** Soma dias a uma data "aaaa-mm-dd" (sem fuso) */
export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split("-").map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d + dias))
  return dt.toISOString().slice(0, 10)
}

/** Diferença em dias entre duas datas "aaaa-mm-dd" (b − a) */
export function diferencaDias(a: string, b: string): number {
  const [a1, m1, d1] = a.split("-").map(Number)
  const [a2, m2, d2] = b.split("-").map(Number)
  return Math.round((Date.UTC(a2, m2 - 1, d2) - Date.UTC(a1, m1 - 1, d1)) / 86_400_000)
}

/**
 * Converte texto digitado no padrão brasileiro em número.
 * "1.234,56" → 1234.56 · "1234,5" → 1234.5 · "1234.5" → 1234.5 · "" → null
 */
export function lerNumero(texto: unknown): number | null {
  if (typeof texto === "number") return Number.isFinite(texto) ? texto : null
  if (typeof texto !== "string") return null
  let t = texto.trim().replace(/\s|R\$/g, "")
  if (t === "") return null
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".")
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, "")
  }
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

/** Número para preencher um input editável ("1234,5") */
export function numeroParaInput(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined || valor === "") return ""
  return String(Number(valor)).replace(".", ",")
}

/** Remove tudo que não é dígito (CPF, CNPJ, telefone). */
export function somenteDigitos(texto: string | null | undefined): string {
  return (texto ?? "").replace(/\D/g, "")
}

/** CPF (11 dígitos) ou CNPJ (14) com máscara; outro tamanho volta como veio. */
export function documentoFormatado(doc: string | null | undefined): string {
  const d = somenteDigitos(doc)
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
  return doc ?? "—"
}
