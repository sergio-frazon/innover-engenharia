import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, BellOff, ChevronRight } from "lucide-react"
import { Cabecalho, EstadoVazio } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { exigirUsuario } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { data } from "@/lib/format"
import { GRAVIDADE } from "@/lib/rotulos"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Alertas" }

const TIPOS: Record<string, string> = {
  servico_atrasado: "Serviço atrasado",
  servico_em_risco: "Serviço em risco",
  diario_pendente: "Diário aguardando conferência",
  medicao_pendente: "Medição aguardando aprovação",
  diario_correcao: "Diário para corrigir",
  diario_ausente: "Diário não registrado",
  conta_vencida: "Conta vencida",
  conta_a_vencer: "Conta a vencer",
}
const ORDEM: Record<string, number> = { alta: 0, media: 1, baixa: 2 }

export default async function Alertas() {
  await exigirUsuario()
  const supabase = await createClient()
  const [{ data: alertas }, { data: obras }] = await Promise.all([
    supabase.from("v_alertas").select("*"),
    supabase.from("obras").select("id, codigo, nome"),
  ])
  const lista = (alertas ?? []).sort((a, b) => ORDEM[a.gravidade!] - ORDEM[b.gravidade!] || (a.data_referencia ?? "").localeCompare(b.data_referencia ?? ""))

  // Contas: o alerta aponta para a parcela; o link vai para o lançamento
  const idsParcelas = lista.filter((a) => a.tipo?.startsWith("conta_")).map((a) => a.referencia_id!)
  const { data: parcelas } = idsParcelas.length ? await supabase.from("parcelas").select("id, lancamento_id").in("id", idsParcelas) : { data: [] }
  const lancamento = new Map((parcelas ?? []).map((p) => [p.id, p.lancamento_id]))
  const obra = new Map((obras ?? []).map((o) => [o.id, o]))

  function link(a: (typeof lista)[number]) {
    const base = `/obras/${a.obra_id}`
    switch (a.tipo) {
      case "servico_atrasado":
      case "servico_em_risco":
        return `${base}/cronograma`
      case "diario_pendente":
      case "diario_correcao":
      case "diario_ausente":
        return `${base}/diario/${a.data_referencia}`
      case "medicao_pendente":
        return `${base}/medicoes`
      default:
        return lancamento.get(a.referencia_id!) ? `/financeiro/${lancamento.get(a.referencia_id!)}` : "/financeiro"
    }
  }

  return (
    <>
      <Cabecalho titulo="Alertas" descricao="Atrasos, pendências de revisão e contas que pedem atenção." />
      {lista.length === 0 ? (
        <EstadoVazio icone={<BellOff className="size-8" />} titulo="Nenhum alerta no momento." />
      ) : (
        <ul className="grid gap-2">
          {lista.map((a, i) => {
            const o = a.obra_id ? obra.get(a.obra_id) : null
            return (
              <li key={i}>
                <Link href={link(a)} className="flex items-center gap-3 rounded-lg border bg-white p-3 hover:border-blue-300">
                  <AlertTriangle className={cn("size-5 shrink-0", a.gravidade === "alta" ? "text-red-600" : a.gravidade === "media" ? "text-amber-600" : "text-slate-400")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">
                      {TIPOS[a.tipo!] ?? a.tipo}
                      {o && ` · ${o.codigo} ${o.nome}`}
                      {!o && a.tipo?.startsWith("conta_") && " · Sem obra"}
                    </p>
                    <p className="font-medium">{a.titulo}</p>
                    {a.data_referencia && <p className="text-xs text-muted-foreground">{a.tipo?.startsWith("conta_") ? "Vencimento" : "Data"}: {data(a.data_referencia)}</p>}
                  </div>
                  <StatusBadge mapa={GRAVIDADE} valor={a.gravidade} />
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
