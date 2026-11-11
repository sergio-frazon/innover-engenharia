// Divisão de valor em parcelas mensais (R-FIN-01): trabalha em centavos;
// a diferença de arredondamento vai na última parcela.

export type ParcelaPlano = { vencimento: string; valor: number }

function somarMeses(iso: string, meses: number): string {
  const [a, m, d] = iso.split("-").map(Number)
  const alvo = new Date(Date.UTC(a, m - 1 + meses, 1))
  const ultimoDia = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate()
  alvo.setUTCDate(Math.min(d, ultimoDia))
  return alvo.toISOString().slice(0, 10)
}

export function dividirParcelas(total: number, quantidade: number, primeiroVencimento: string, intervaloMeses = 1): ParcelaPlano[] {
  if (!Number.isFinite(total) || total <= 0) return []
  const n = Math.max(1, Math.floor(quantidade))
  const totalCentavos = Math.round(total * 100)
  const base = Math.floor(totalCentavos / n)
  return Array.from({ length: n }, (_, i) => ({
    vencimento: somarMeses(primeiroVencimento, i * intervaloMeses),
    valor: (i === n - 1 ? totalCentavos - base * (n - 1) : base) / 100,
  }))
}

export function somaParcelas(parcelas: { valor: number }[]): number {
  return parcelas.reduce((acc, p) => acc + Math.round(p.valor * 100), 0) / 100
}
