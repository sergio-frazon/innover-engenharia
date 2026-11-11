import Link from "next/link"
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Secao } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { exigirPapel } from "@/lib/auth"
import { getObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { data as fmtData, hojeISO } from "@/lib/format"
import { STATUS_DIARIO } from "@/lib/rotulos"
import { cn } from "@/lib/utils"
import { irParaData } from "./actions"

const COR_DIA: Record<string, string> = {
  rascunho: "bg-slate-200 text-slate-800",
  enviado: "bg-amber-200 text-amber-900",
  correcao_solicitada: "bg-orange-200 text-orange-900",
  aprovado: "bg-emerald-200 text-emerald-900",
}
const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"]

function mesDe(iso: string) {
  return iso.slice(0, 7)
}
function mesVizinho(mes: string, delta: number) {
  const [a, m] = mes.split("-").map(Number)
  const d = new Date(Date.UTC(a, m - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

export default async function PaginaDiarios({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>
  searchParams: Promise<{ mes?: string }>
}) {
  const { obraId } = await params
  const f = await searchParams
  await exigirPapel("admin", "gestor", "campo")
  const obra = await getObra(obraId)
  const hoje = hojeISO()
  const mes = /^\d{4}-\d{2}$/.test(f.mes ?? "") ? f.mes! : mesDe(hoje)
  const [ano, m] = mes.split("-").map(Number)
  const primeiro = `${mes}-01`
  const ultimoDia = new Date(Date.UTC(ano, m, 0)).getUTCDate()
  const ultimo = `${mes}-${String(ultimoDia).padStart(2, "0")}`

  const supabase = await createClient()
  const [{ data: doMes }, { data: recentes }] = await Promise.all([
    supabase.from("diarios").select("id, data, status").eq("obra_id", obra.id).gte("data", primeiro).lte("data", ultimo),
    supabase
      .from("diarios")
      .select("id, data, status, atividades_resumo, comentario_revisao, autor:perfis!diarios_criado_por_fkey(nome)")
      .eq("obra_id", obra.id)
      .order("data", { ascending: false })
      .limit(15),
  ])
  const porDia = new Map((doMes ?? []).map((d) => [d.data, d.status]))
  const base = `/obras/${obra.id}/diario`
  const deslocamento = (new Date(Date.UTC(ano, m - 1, 1)).getUTCDay() + 6) % 7 // segunda = 0

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="grid content-start gap-4 lg:col-span-2">
        <Button asChild size="lg" className="min-h-12">
          <Link href={`${base}/hoje`}>
            <ClipboardList /> Diário de hoje
          </Link>
        </Button>
        <Secao
          titulo={`${MESES[m - 1]} de ${ano}`}
          acoes={
            <div className="flex gap-1">
              <Button asChild variant="ghost" size="icon-sm" aria-label="Mês anterior">
                <Link href={`${base}?mes=${mesVizinho(mes, -1)}`}>
                  <ChevronLeft />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon-sm" aria-label="Próximo mês">
                <Link href={`${base}?mes=${mesVizinho(mes, 1)}`}>
                  <ChevronRight />
                </Link>
              </Button>
            </div>
          }
        >
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {["S", "T", "Q", "Q", "S", "S", "D"].map((d, i) => (
              <span key={i} className="py-1 font-medium text-muted-foreground">
                {d}
              </span>
            ))}
            {Array.from({ length: deslocamento }).map((_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: ultimoDia }).map((_, i) => {
              const dia = `${mes}-${String(i + 1).padStart(2, "0")}`
              const status = porDia.get(dia)
              const futuro = dia > hoje
              return futuro ? (
                <span key={dia} className="flex aspect-square items-center justify-center rounded-md text-slate-300">
                  {i + 1}
                </span>
              ) : (
                <Link
                  key={dia}
                  href={`${base}/${dia}`}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-md text-sm transition-colors hover:ring-2 hover:ring-blue-300",
                    status ? COR_DIA[status] : "text-slate-700 hover:bg-slate-100",
                    dia === hoje && "ring-2 ring-blue-500",
                  )}
                  title={status ? STATUS_DIARIO[status].texto : "Sem diário"}
                >
                  {i + 1}
                </Link>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {Object.entries(STATUS_DIARIO).map(([k, v]) => (
              <span key={k} className="flex items-center gap-1">
                <span className={cn("size-3 rounded", COR_DIA[k])} /> {v.texto}
              </span>
            ))}
          </div>
          <form action={irParaData.bind(null, obra.id)} className="mt-4 flex gap-2">
            <Input type="date" name="data" max={hoje} required aria-label="Ir para a data" />
            <Button type="submit" variant="outline">
              Abrir
            </Button>
          </form>
        </Secao>
      </div>

      <Secao titulo="Últimos diários" className="lg:col-span-3">
        {(recentes ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum diário registrado ainda.</p>
        ) : (
          <ul className="divide-y">
            {(recentes ?? []).map((d) => (
              <li key={d.id}>
                <Link href={`${base}/${d.data}`} className="-mx-2 flex items-start gap-3 rounded-md px-2 py-3 hover:bg-slate-50">
                  <div className="w-24 shrink-0 text-sm font-medium tabular-nums">{fmtData(d.data)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm">{d.atividades_resumo || <span className="text-muted-foreground">Sem resumo</span>}</p>
                    {d.status === "correcao_solicitada" && d.comentario_revisao && <p className="mt-1 text-xs text-orange-700">Correção: {d.comentario_revisao}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">{d.autor?.nome}</p>
                  </div>
                  <StatusBadge mapa={STATUS_DIARIO} valor={d.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  )
}
