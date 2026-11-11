import type { Metadata } from "next"
import Link from "next/link"
import { AlertTriangle, ClipboardList, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Cabecalho, EstadoVazio, Indicador, Secao } from "@/components/comum/pagina"
import { BarraProgresso, StatusBadge } from "@/components/comum/status"
import { exigirUsuario, temPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { data, hojeISO, moeda, percentual } from "@/lib/format"
import { GRAVIDADE, STATUS_DIARIO } from "@/lib/rotulos"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Painel" }

function saudacao() {
  const h = Number(new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date()))
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite"
}

export default async function Painel() {
  const usuario = await exigirUsuario()
  const supabase = await createClient()
  const hoje = hojeISO()
  const veCusto = temPapel(usuario, "admin", "gestor", "financeiro")
  const veFinanceiro = temPapel(usuario, "admin", "financeiro")
  const veObra = temPapel(usuario, "admin", "gestor", "campo")

  const [{ data: obras }, { data: progresso }, custos, parcelas, diariosHoje, { data: alertas }] = await Promise.all([
    supabase.from("obras").select("id, codigo, nome, situacao, data_fim_prevista, responsavel:perfis!obras_responsavel_id_fkey(nome)").eq("situacao", "em_andamento").order("nome"),
    supabase.rpc("progresso_obras"),
    veCusto ? supabase.from("v_custo_obra").select("*") : Promise.resolve({ data: [] as { obra_id: string | null; valor_orcado: number | null; custo_realizado: number | null; diferenca_pct: number | null }[] }),
    veFinanceiro
      ? supabase.from("v_parcelas_situacao").select("tipo, saldo, dias_para_vencer, situacao").in("situacao", ["aberta", "parcial", "vencida"]).lte("dias_para_vencer", 7)
      : Promise.resolve({ data: [] as { tipo: string | null; saldo: number | null; dias_para_vencer: number | null; situacao: string | null }[] }),
    veObra ? supabase.from("diarios").select("obra_id, status").eq("data", hoje) : Promise.resolve({ data: [] as { obra_id: string; status: string }[] }),
    supabase.from("v_alertas").select("*").in("gravidade", ["alta", "media"]).order("gravidade").limit(6),
  ])

  const prog = new Map((progresso ?? []).map((p) => [p.obra_id, p]))
  const custo = new Map((custos.data ?? []).map((c) => [c.obra_id, c]))
  const diarioHoje = new Map((diariosHoje.data ?? []).map((d) => [d.obra_id, d.status]))
  const lista = obras ?? []
  const atrasados = lista.reduce((a, o) => a + (prog.get(o.id)?.servicos_atrasados ?? 0), 0)
  const pendencias = lista.reduce((a, o) => a + (prog.get(o.id)?.diarios_pendentes ?? 0) + (prog.get(o.id)?.medicoes_pendentes ?? 0), 0)
  const contas = parcelas.data ?? []
  const soma = (f: (p: (typeof contas)[number]) => boolean) => contas.filter(f).reduce((a, p) => a + Number(p.saldo), 0)
  const vencidasPagar = soma((p) => p.tipo === "pagar" && (p.dias_para_vencer ?? 0) < 0)
  const aVencerPagar = soma((p) => p.tipo === "pagar" && (p.dias_para_vencer ?? 0) >= 0)
  const vencidasReceber = soma((p) => p.tipo === "receber" && (p.dias_para_vencer ?? 0) < 0)

  return (
    <>
      <Cabecalho
        titulo={`${saudacao()}, ${usuario.nome.split(" ")[0]}`}
        descricao={new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeZone: "America/Sao_Paulo" }).format(new Date())}
        acoes={
          temPapel(usuario, "admin", "gestor") && (
            <Button asChild variant="outline">
              <Link href="/obras/nova">
                <Plus /> Nova obra
              </Link>
            </Button>
          )
        }
      />

      {usuario.papel === "campo" && (
        <Secao titulo="Diário de hoje" className="mb-6">
          {lista.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma obra em andamento para você.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {lista.map((o) => (
                <li key={o.id}>
                  <Link href={`/obras/${o.id}/diario/${hoje}`} className="flex min-h-16 items-center gap-3 rounded-lg border bg-blue-50 p-4 hover:border-blue-400">
                    <ClipboardList className="size-6 shrink-0 text-blue-700" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{o.nome}</p>
                      <p className="text-xs text-muted-foreground">{o.codigo}</p>
                    </div>
                    {diarioHoje.has(o.id) ? <StatusBadge mapa={STATUS_DIARIO} valor={diarioHoje.get(o.id)} /> : <span className="text-sm font-medium text-blue-700">Começar</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Secao>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Obras em andamento" valor={lista.length} href="/obras?situacao=em_andamento" />
        {veObra && <Indicador rotulo="Serviços atrasados" valor={atrasados} tom={atrasados > 0 ? "vermelho" : undefined} href="/alertas" />}
        {temPapel(usuario, "admin", "gestor") && (
          <Indicador rotulo="Aguardando sua revisão" valor={pendencias} tom={pendencias > 0 ? "ambar" : undefined} detalhe="Diários e medições" href="/alertas" />
        )}
        {veFinanceiro && (
          <>
            <Indicador
              rotulo="A pagar vencido"
              valor={moeda(vencidasPagar)}
              tom={vencidasPagar > 0 ? "vermelho" : undefined}
              detalhe={`${moeda(aVencerPagar)} vencem em até 7 dias`}
              href="/financeiro?tipo=pagar&situacao=vencida"
            />
            <Indicador rotulo="A receber vencido" valor={moeda(vencidasReceber)} tom={vencidasReceber > 0 ? "ambar" : undefined} href="/financeiro?tipo=receber&situacao=vencida" />
          </>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Secao titulo="Obras em andamento" className="xl:col-span-2">
          {lista.length === 0 ? (
            <EstadoVazio titulo="Nenhuma obra em andamento." />
          ) : (
            <ul className="divide-y">
              {lista.map((o) => {
                const p = prog.get(o.id)
                const c = custo.get(o.id)
                const atr = p?.servicos_atrasados ?? 0
                const pend = (p?.diarios_pendentes ?? 0) + (p?.medicoes_pendentes ?? 0)
                return (
                  <li key={o.id}>
                    <Link href={`/obras/${o.id}`} className="-mx-2 grid gap-2 rounded-md px-2 py-3 hover:bg-slate-50 sm:grid-cols-5 sm:items-center">
                      <div className="min-w-0 sm:col-span-2">
                        <p className="truncate font-medium">{o.nome}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.codigo} · {o.responsavel?.nome} · término {data(o.data_fim_prevista)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:col-span-2">
                        <BarraProgresso valor={Number(p?.avanco_fisico ?? 0)} tom={atr > 0 ? "ambar" : "azul"} />
                        <span className="w-14 text-right text-sm font-medium tabular-nums">{percentual(p?.avanco_fisico ?? 0)}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 text-xs sm:justify-end">
                        {atr > 0 && <span className="font-medium text-red-700">{atr} atrasado(s)</span>}
                        {pend > 0 && temPapel(usuario, "admin", "gestor") && <span className="text-amber-700">{pend} pendente(s)</span>}
                        {veCusto && c && Number(c.valor_orcado) > 0 && (
                          <span className={cn(Number(c.diferenca_pct) > 0 ? "text-red-700" : "text-muted-foreground")}>
                            {moeda(c.custo_realizado)} / {moeda(c.valor_orcado)}
                          </span>
                        )}
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Secao>

        <Secao titulo="Alertas" acoes={<Link href="/alertas" className="text-sm text-blue-700 hover:underline">Ver todos</Link>}>
          {(alertas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Tudo em dia.</p>
          ) : (
            <ul className="grid gap-2">
              {(alertas ?? []).map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className={cn("mt-0.5 size-4 shrink-0", a.gravidade === "alta" ? "text-red-600" : "text-amber-600")} />
                  <span className="min-w-0 flex-1">{a.titulo}</span>
                  <StatusBadge mapa={GRAVIDADE} valor={a.gravidade} />
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>
    </>
  )
}
