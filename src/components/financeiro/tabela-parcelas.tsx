import Link from "next/link"
import { StatusBadge } from "@/components/comum/status"
import { EstadoVazio } from "@/components/comum/pagina"
import { RegistrarPagamento } from "./registrar-pagamento"
import { data, moeda } from "@/lib/format"
import { SITUACAO_PARCELA } from "@/lib/rotulos"
import type { LinhaParcela } from "@/lib/financeiro"
import { cn } from "@/lib/utils"

export function TabelaParcelas({ linhas, podePagar, mostrarObra = true }: { linhas: LinhaParcela[]; podePagar: boolean; mostrarObra?: boolean }) {
  if (linhas.length === 0) return <EstadoVazio titulo="Nenhuma conta encontrada com esses filtros." />
  const total = linhas.reduce((a, l) => a + Math.round(l.valor * 100), 0) / 100
  const pago = linhas.reduce((a, l) => a + Math.round(l.valor_pago * 100), 0) / 100
  const saldo = linhas.reduce((a, l) => a + Math.round(l.saldo * 100), 0) / 100
  const atrasada = (l: LinhaParcela) => l.saldo > 0 && l.situacao !== "cancelada" && (l.dias_para_vencer ?? 0) < 0
  const pagavel = (l: LinhaParcela) => podePagar && ["aberta", "parcial", "vencida"].includes(l.situacao)

  return (
    <>
      <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground">
            <tr className="border-b">
              <th className="px-4 py-2 font-medium">Vencimento</th>
              <th className="px-2 py-2 font-medium">Descrição</th>
              <th className="px-2 py-2 font-medium">Pessoa</th>
              {mostrarObra && <th className="px-2 py-2 font-medium">Obra</th>}
              <th className="px-2 py-2 text-right font-medium">Valor</th>
              <th className="px-2 py-2 text-right font-medium">Pago</th>
              <th className="px-2 py-2 text-right font-medium">Saldo</th>
              <th className="px-2 py-2 font-medium">Situação</th>
              {podePagar && <th className="w-0" />}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.id} className="border-b last:border-0 hover:bg-slate-50">
                <td className={cn("px-4 py-2 whitespace-nowrap tabular-nums", atrasada(l) && "font-medium text-red-700")}>{data(l.vencimento)}</td>
                <td className="px-2 py-2">
                  <Link href={`/financeiro/${l.lancamento_id}`} className="font-medium hover:underline">
                    {l.descricao}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {" "}
                    {l.numero}/{l.total_parcelas}
                    {l.categoria && ` · ${l.categoria}`}
                  </span>
                </td>
                <td className="px-2 py-2">{l.pessoa ?? "—"}</td>
                {mostrarObra && <td className="px-2 py-2 font-mono text-xs whitespace-nowrap">{l.obra ?? "Sem obra"}</td>}
                <td className="px-2 py-2 text-right tabular-nums">{moeda(l.valor)}</td>
                <td className="px-2 py-2 text-right tabular-nums">{moeda(l.valor_pago)}</td>
                <td className="px-2 py-2 text-right font-medium tabular-nums">{moeda(l.saldo)}</td>
                <td className="px-2 py-2">
                  <StatusBadge mapa={SITUACAO_PARCELA} valor={l.situacao} />
                </td>
                {podePagar && <td className="px-2 py-2">{pagavel(l) && <RegistrarPagamento parcela={l} compacto />}</td>}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t bg-slate-50 font-semibold">
              <td className="px-4 py-2" colSpan={mostrarObra ? 4 : 3}>
                Total ({linhas.length} parcela{linhas.length === 1 ? "" : "s"})
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{moeda(total)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{moeda(pago)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{moeda(saldo)}</td>
              <td colSpan={podePagar ? 2 : 1} />
            </tr>
          </tfoot>
        </table>
      </div>

      <ul className="grid gap-2 md:hidden">
        {linhas.map((l) => (
          <li key={l.id} className="rounded-lg border bg-white p-3">
            <div className="flex items-start justify-between gap-2">
              <Link href={`/financeiro/${l.lancamento_id}`} className="min-w-0">
                <p className="font-medium">
                  {l.descricao} <span className="text-xs font-normal text-muted-foreground">{l.numero}/{l.total_parcelas}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.pessoa ?? "—"}
                  {mostrarObra && ` · ${l.obra ?? "Sem obra"}`}
                </p>
              </Link>
              <StatusBadge mapa={SITUACAO_PARCELA} valor={l.situacao} />
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="text-sm">
                <p className={cn("tabular-nums", atrasada(l) && "font-medium text-red-700")}>Vence {data(l.vencimento)}</p>
                <p className="font-semibold tabular-nums">Saldo {moeda(l.saldo)}</p>
              </div>
              {pagavel(l) && <RegistrarPagamento parcela={l} compacto />}
            </div>
          </li>
        ))}
        <li className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white">
          Saldo total: <span className="font-semibold">{moeda(saldo)}</span>
        </li>
      </ul>
    </>
  )
}
