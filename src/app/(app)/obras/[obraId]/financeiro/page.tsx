import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Indicador, Secao } from "@/components/comum/pagina"
import { TabelaParcelas } from "@/components/financeiro/tabela-parcelas"
import { exigirPapel } from "@/lib/auth"
import { getObra } from "@/lib/obras"
import { buscarParcelas } from "@/lib/financeiro"
import { createClient } from "@/lib/supabase/server"
import { moeda, percentual } from "@/lib/format"
import { NATUREZA } from "@/lib/rotulos"
import { cn } from "@/lib/utils"

export default async function FinanceiroObra({ params, searchParams }: { params: Promise<{ obraId: string }>; searchParams: Promise<{ situacao?: string; tipo?: string }> }) {
  const { obraId } = await params
  const f = await searchParams
  const usuario = await exigirPapel("admin", "gestor", "financeiro")
  const obra = await getObra(obraId)
  const supabase = await createClient()
  const [{ linhas }, { data: custo }, { data: porNatureza }] = await Promise.all([
    buscarParcelas({ situacao: f.situacao ?? "todas", tipo: f.tipo }, { obraFixa: obra.id }),
    supabase.from("v_custo_obra").select("*").eq("obra_id", obra.id).maybeSingle(),
    supabase.from("v_custo_previsto_realizado").select("natureza, previsto, realizado").eq("obra_id", obra.id),
  ])

  const naturezas = Object.keys(NATUREZA).map((n) => {
    const linhasN = (porNatureza ?? []).filter((x) => x.natureza === n)
    const previsto = linhasN.reduce((a, x) => a + Number(x.previsto), 0)
    const realizado = linhasN.reduce((a, x) => a + Number(x.realizado), 0)
    return { n, previsto, realizado, pct: previsto ? (realizado / previsto) * 100 : null }
  })
  const receber = linhas.filter((l) => l.tipo === "receber" && l.situacao !== "cancelada")
  const recebido = receber.reduce((a, l) => a + l.valor_pago, 0)
  const aReceber = receber.reduce((a, l) => a + l.saldo, 0)
  const base = `/obras/${obra.id}/financeiro`

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Orçado (aprovado)" valor={moeda(custo?.valor_orcado ?? 0)} />
        <Indicador
          rotulo="Custo realizado"
          valor={moeda(custo?.custo_realizado ?? 0)}
          tom={Number(custo?.diferenca ?? 0) > 0 ? "vermelho" : undefined}
          detalhe={custo?.diferenca_pct !== null && custo?.diferenca_pct !== undefined ? `${Number(custo.diferenca_pct) > 0 ? "+" : ""}${percentual(custo.diferenca_pct)} sobre o orçado` : undefined}
        />
        <Indicador rotulo="Recebido do cliente" valor={moeda(recebido)} tom="verde" />
        <Indicador rotulo="A receber" valor={moeda(aReceber)} />
      </div>

      <Secao titulo="Custo por natureza" acoes={<Link href={`/obras/${obra.id}/orcamento?aba=comparar`} className="text-sm text-blue-700 hover:underline">Detalhar por etapa</Link>}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {naturezas.map((x) => (
            <div key={x.n} className="rounded-md border p-3">
              <p className="text-sm font-medium">{NATUREZA[x.n]}</p>
              <p className="text-xs text-muted-foreground">
                {moeda(x.realizado)} de {moeda(x.previsto)}
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={cn("h-full rounded-full", x.pct !== null && x.pct > 100 ? "bg-red-600" : "bg-blue-600")}
                  style={{ width: `${Math.min(100, x.pct ?? (x.realizado > 0 ? 100 : 0))}%` }}
                />
              </div>
              <p className="mt-1 text-xs">{x.pct === null ? (x.realizado > 0 ? "Sem previsão no orçamento" : "—") : percentual(x.pct)}</p>
            </div>
          ))}
        </div>
      </Secao>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="flex flex-wrap gap-1">
          {[
            { tipo: "", rotulo: "Tudo" },
            { tipo: "pagar", rotulo: "A pagar" },
            { tipo: "receber", rotulo: "A receber" },
          ].map((a) => (
            <Link
              key={a.tipo}
              href={`${base}${a.tipo ? `?tipo=${a.tipo}` : ""}`}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium", (f.tipo ?? "") === a.tipo ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              {a.rotulo}
            </Link>
          ))}
        </nav>
        {(usuario.papel === "admin" || usuario.papel === "financeiro") && (
          <Button asChild>
            <Link href={`/financeiro/novo?obra=${obra.id}`}>
              <Plus /> Novo lançamento
            </Link>
          </Button>
        )}
      </div>
      <TabelaParcelas linhas={linhas} podePagar={usuario.papel === "admin" || usuario.papel === "financeiro"} mostrarObra={false} />
    </div>
  )
}
