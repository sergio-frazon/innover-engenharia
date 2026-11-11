import type { Metadata } from "next"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cabecalho, Indicador, Secao } from "@/components/comum/pagina"
import { GraficoFluxo } from "@/components/financeiro/grafico-fluxo"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { data as fmtData, hojeISO, moeda, somarDias } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Fluxo de caixa" }

type Agrupamento = "dia" | "semana" | "mes"

function chave(iso: string, g: Agrupamento) {
  if (g === "mes") return iso.slice(0, 7)
  if (g === "semana") {
    const [a, m, d] = iso.split("-").map(Number)
    const dow = (new Date(Date.UTC(a, m - 1, d)).getUTCDay() + 6) % 7
    return somarDias(iso, -dow)
  }
  return iso
}
function rotulo(k: string, g: Agrupamento) {
  if (g === "mes") {
    const [a, m] = k.split("-")
    return `${m}/${a}`
  }
  return g === "semana" ? `Sem. ${fmtData(k).slice(0, 5)}` : fmtData(k).slice(0, 5)
}

export default async function FluxoCaixa({ searchParams }: { searchParams: Promise<{ de?: string; ate?: string; obra?: string; g?: string }> }) {
  await exigirPapel("admin", "financeiro")
  const f = await searchParams
  const hoje = hojeISO()
  const de = f.de ?? `${hoje.slice(0, 7)}-01`
  const ate = f.ate ?? somarDias(de, 89)
  const g: Agrupamento = f.g === "dia" || f.g === "mes" ? f.g : "semana"
  const supabase = await createClient()

  let realizado = supabase.from("v_fluxo_caixa").select("*").gte("data", de).lte("data", ate)
  let previsto = supabase.from("v_parcelas_situacao").select("vencimento, tipo, saldo, obra_id").in("situacao", ["aberta", "parcial", "vencida"]).lte("vencimento", ate)
  let saldoAnterior = supabase.from("v_fluxo_caixa").select("entradas, saidas").lt("data", de)
  if (f.obra === "sem-obra") {
    realizado = realizado.is("obra_id", null)
    previsto = previsto.is("obra_id", null)
    saldoAnterior = saldoAnterior.is("obra_id", null)
  } else if (f.obra) {
    realizado = realizado.eq("obra_id", f.obra)
    previsto = previsto.eq("obra_id", f.obra)
    saldoAnterior = saldoAnterior.eq("obra_id", f.obra)
  }

  const [{ data: real }, { data: prev }, { data: anterior }, { data: obras }] = await Promise.all([
    realizado,
    previsto,
    saldoAnterior,
    supabase.from("obras").select("id, codigo, nome").order("codigo"),
  ])

  type Linha = { k: string; entradas: number; saidas: number; aReceber: number; aPagar: number }
  const mapa = new Map<string, Linha>()
  const linha = (k: string) => mapa.get(k) ?? (mapa.set(k, { k, entradas: 0, saidas: 0, aReceber: 0, aPagar: 0 }), mapa.get(k)!)
  for (const r of real ?? []) {
    const l = linha(chave(r.data!, g))
    l.entradas += Number(r.entradas ?? 0)
    l.saidas += Number(r.saidas ?? 0)
  }
  // Previsto: saldos em aberto por vencimento; vencidos antes do período entram no primeiro período
  for (const p of prev ?? []) {
    const l = linha(chave(p.vencimento! < de ? de : p.vencimento!, g))
    if (p.tipo === "receber") l.aReceber += Number(p.saldo)
    else l.aPagar += Number(p.saldo)
  }
  const linhas = [...mapa.values()].sort((a, b) => a.k.localeCompare(b.k))
  const inicial = (anterior ?? []).reduce((a, r) => a + Number(r.entradas ?? 0) - Number(r.saidas ?? 0), 0)
  let acumulado = inicial
  const grafico = linhas.map((l) => {
    acumulado += l.entradas - l.saidas
    return { periodo: rotulo(l.k, g), entradas: l.entradas, saidas: l.saidas, saldo: acumulado }
  })
  const tot = linhas.reduce((a, l) => ({ e: a.e + l.entradas, s: a.s + l.saidas, r: a.r + l.aReceber, p: a.p + l.aPagar }), { e: 0, s: 0, r: 0, p: 0 })
  const qs = (novo: Partial<{ g: string }>) => `?${new URLSearchParams({ de, ate, ...(f.obra ? { obra: f.obra } : {}), g, ...novo })}`

  return (
    <>
      <Cabecalho titulo="Fluxo de caixa" descricao="Realizado = pagamentos e recebimentos registrados. Previsto = saldos em aberto pelo vencimento." />

      <form className="mb-4 grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2 lg:grid-cols-5">
        <input type="hidden" name="g" value={g} />
        <Input type="date" name="de" defaultValue={de} aria-label="De" />
        <Input type="date" name="ate" defaultValue={ate} aria-label="Até" />
        <select name="obra" defaultValue={f.obra ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm lg:col-span-2" aria-label="Obra">
          <option value="">Todas as obras e administrativo</option>
          <option value="sem-obra">Só administrativo (sem obra)</option>
          {(obras ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.codigo} — {o.nome}
            </option>
          ))}
        </select>
        <Button type="submit" variant="secondary">
          Aplicar
        </Button>
      </form>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Entradas realizadas" valor={moeda(tot.e)} tom="verde" />
        <Indicador rotulo="Saídas realizadas" valor={moeda(tot.s)} tom="vermelho" />
        <Indicador rotulo="A receber (previsto)" valor={moeda(tot.r)} />
        <Indicador rotulo="A pagar (previsto)" valor={moeda(tot.p)} />
      </div>

      <Secao
        titulo="Realizado no período"
        acoes={
          <div className="flex rounded-md border p-0.5">
            {(["dia", "semana", "mes"] as const).map((x) => (
              <Link key={x} href={qs({ g: x })} className={cn("rounded px-3 py-1 text-sm", g === x ? "bg-slate-900 text-white" : "text-slate-600")}>
                {x === "dia" ? "Dia" : x === "semana" ? "Semana" : "Mês"}
              </Link>
            ))}
          </div>
        }
      >
        {grafico.length === 0 ? <p className="text-sm text-muted-foreground">Sem movimentação no período.</p> : <GraficoFluxo dados={grafico} />}
        <p className="mt-2 text-xs text-muted-foreground">Saldo inicial (antes de {fmtData(de)}): {moeda(inicial)}</p>
      </Secao>

      <Secao titulo="Detalhamento" className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-2 font-medium">Período</th>
                <th className="px-2 py-2 text-right font-medium">Entradas</th>
                <th className="px-2 py-2 text-right font-medium">Saídas</th>
                <th className="px-2 py-2 text-right font-medium">Saldo do período</th>
                <th className="px-2 py-2 text-right font-medium">A receber</th>
                <th className="py-2 pl-2 text-right font-medium">A pagar</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.k} className="border-b last:border-0">
                  <td className="py-2 pr-2">{rotulo(l.k, g)}</td>
                  <td className="px-2 py-2 text-right text-emerald-700 tabular-nums">{moeda(l.entradas)}</td>
                  <td className="px-2 py-2 text-right text-red-700 tabular-nums">{moeda(l.saidas)}</td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{moeda(l.entradas - l.saidas)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{moeda(l.aReceber)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums">{moeda(l.aPagar)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Secao>
    </>
  )
}
