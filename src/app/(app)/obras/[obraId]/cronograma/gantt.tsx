"use client"

import { useActionState, useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { BarChart3, CheckCircle2, FilePlus2, List, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { Confirmar } from "@/components/comum/confirmar"
import { StatusBadge } from "@/components/comum/status"
import { data as fmtData, diferencaDias, percentual, somarDias } from "@/lib/format"
import { criaCiclo } from "@/lib/cronograma"
import { SITUACAO_PRAZO, STATUS_VERSAO } from "@/lib/rotulos"
import { cn } from "@/lib/utils"
import { aprovarCronograma, criarVersaoCronograma, descartarRascunhoCronograma, removerAtividade, salvarAtividade } from "./actions"

export type LinhaGantt =
  | { tipo: "etapa"; id: string; titulo: string }
  | {
      tipo: "servico"
      id: string
      etapaId: string
      codigo: string
      titulo: string
      inicio: string | null
      fim: string | null
      duracao: number | null
      baselineInicio: string | null
      baselineFim: string | null
      inicioReal: string | null
      fimReal: string | null
      percentual: number
      situacao: string | null
      predecessores: string[]
      dependeDe: string
    }
type LinhaServico = Extract<LinhaGantt, { tipo: "servico" }>

const COR_SITUACAO: Record<string, string> = {
  atrasado: "bg-red-500",
  inicio_atrasado: "bg-red-500",
  em_risco: "bg-amber-500",
  no_prazo: "bg-blue-500",
  concluido: "bg-emerald-500",
  a_iniciar: "bg-slate-400",
}
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"]

// ---------------------------------------------------------------------------
// Versões
// ---------------------------------------------------------------------------

export function CriarPrimeiroCronograma({ obraId }: { obraId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <Button
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await criarVersaoCronograma(obraId, "Cronograma inicial")
          if (r.ok) router.push(`/obras/${obraId}/cronograma?v=${r.id}`)
          else toast.error(r.erro)
        })
      }
    >
      <FilePlus2 /> Criar cronograma
    </Button>
  )
}

export function SeletorVersaoCronograma({
  base,
  atual,
  versoes,
}: {
  base: string
  atual: string
  versoes: { id: string; numero: number; status: string; descricao: string | null }[]
}) {
  const router = useRouter()
  return (
    <select value={atual} onChange={(e) => router.push(`${base}?v=${e.target.value}`)} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Versão do cronograma">
      {versoes.map((v) => (
        <option key={v.id} value={v.id}>
          v{v.numero} — {STATUS_VERSAO[v.status]?.texto}
          {v.descricao ? ` (${v.descricao})` : ""}
        </option>
      ))}
    </select>
  )
}

export function BotoesCronograma({
  obraId,
  versao,
  rascunhoId,
  podeEditar,
}: {
  obraId: string
  versao: { id: string; numero: number; status: string }
  rascunhoId?: string
  podeEditar: boolean
}) {
  const router = useRouter()
  if (!podeEditar) return null
  if (versao.status !== "rascunho") {
    return rascunhoId ? (
      <Button size="sm" variant="secondary" onClick={() => router.push(`/obras/${obraId}/cronograma?v=${rascunhoId}`)}>
        <Pencil /> Abrir rascunho
      </Button>
    ) : (
      <Confirmar
        gatilho={
          <Button size="sm">
            <FilePlus2 /> Criar revisão
          </Button>
        }
        titulo="Criar revisão do cronograma?"
        descricao="Será criado um rascunho com as datas e dependências da versão aprovada. Os atrasos continuam sendo medidos pela versão aprovada até o rascunho ser aprovado."
        pedirMotivo
        rotuloMotivo="Motivo da revisão"
        textoConfirmar="Criar rascunho"
        acao={async (motivo) => {
          const r = await criarVersaoCronograma(obraId, motivo)
          if (r.ok) router.push(`/obras/${obraId}/cronograma?v=${r.id}`)
          return r
        }}
      />
    )
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Confirmar
        gatilho={
          <Button size="sm" variant="outline" className="text-red-700">
            <Trash2 /> Descartar rascunho
          </Button>
        }
        titulo={`Descartar o rascunho v${versao.numero}?`}
        descricao="As datas deste rascunho serão apagadas. A versão aprovada não muda."
        textoConfirmar="Descartar"
        destrutivo
        acao={async () => {
          const r = await descartarRascunhoCronograma(obraId, versao.id)
          if (r.ok) router.push(`/obras/${obraId}/cronograma`)
          return r
        }}
      />
      <Confirmar
        gatilho={
          <Button size="sm">
            <CheckCircle2 /> Aprovar cronograma
          </Button>
        }
        titulo={`Aprovar o cronograma v${versao.numero}?`}
        descricao="Todos os serviços ativos precisam ter datas. Depois de aprovado, vira a referência para atrasos e não pode ser alterado."
        textoConfirmar="Aprovar"
        acao={() => aprovarCronograma(obraId, versao.id)}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edição de atividade
// ---------------------------------------------------------------------------

function FormAtividade({
  obraId,
  versaoId,
  servico,
  servicos,
  aoConcluir,
}: {
  obraId: string
  versaoId: string
  servico: LinhaServico
  servicos: LinhaServico[]
  aoConcluir: () => void
}) {
  const [estado, acao] = useActionState(salvarAtividade, null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  const [inicio, setInicio] = useState(servico.inicio ?? "")
  const [fim, setFim] = useState(servico.fim ?? "")
  const [pendente, iniciar] = useTransition()

  const deps = useMemo(() => servicos.flatMap((s) => s.predecessores.map((p) => ({ servico_id: s.id, predecessor_id: p }))), [servicos])
  const outros = servicos.filter((s) => s.id !== servico.id)
  const duracao = inicio && fim && fim >= inicio ? diferencaDias(inicio, fim) + 1 : null

  return (
    <form action={acao} className="grid gap-4">
      <ErroFormulario estado={estado} />
      <input type="hidden" name="obra_id" value={obraId} />
      <input type="hidden" name="versao_id" value={versaoId} />
      <input type="hidden" name="servico_id" value={servico.id} />
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo rotulo="Início previsto" nome="inicio" erro={erroCampo(estado, "inicio")} obrigatorio>
          <Input id="inicio" name="inicio" type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} required />
        </Campo>
        <Campo rotulo="Término previsto" nome="fim" erro={erroCampo(estado, "fim")} obrigatorio>
          <Input id="fim" name="fim" type="date" value={fim} min={inicio || undefined} onChange={(e) => setFim(e.target.value)} required />
        </Campo>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Duração</span>
          <p className="flex h-9 items-center text-sm">{duracao ? `${duracao} dia(s) corrido(s)` : "—"}</p>
        </div>
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Depende do término de</legend>
        {outros.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum outro serviço.</p>
        ) : (
          <div className="grid max-h-52 gap-1.5 overflow-y-auto rounded-md border p-3">
            {outros.map((o) => {
              const ciclo = criaCiclo(deps.filter((d) => d.servico_id !== servico.id), servico.id, o.id)
              const semData = !o.fim
              return (
                <label key={o.id} className={cn("flex items-center gap-2 text-sm", (ciclo || semData) && "opacity-50")}>
                  <Checkbox name="predecessores" value={o.id} defaultChecked={servico.predecessores.includes(o.id)} disabled={ciclo || semData} />
                  <span className="font-mono text-xs">{o.codigo}</span> {o.titulo}
                  <span className="text-xs text-muted-foreground">{semData ? "(sem datas)" : ciclo ? "(criaria ciclo)" : `até ${fmtData(o.fim)}`}</span>
                </label>
              )
            })}
          </div>
        )}
      </fieldset>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="empurrar" defaultChecked className="mt-0.5" />
        <span>
          <span className="font-medium">Empurrar sucessores</span>
          <span className="block text-xs text-muted-foreground">Se este serviço terminar depois do início de um serviço que depende dele, desloca o sucessor (e a cadeia) mantendo a duração.</span>
        </span>
      </label>
      <div className="flex flex-wrap gap-2">
        <BotaoEnviar>Salvar datas</BotaoEnviar>
        {servico.inicio && (
          <Button
            type="button"
            variant="outline"
            className="text-red-700"
            disabled={pendente}
            onClick={() =>
              iniciar(async () => {
                const r = await removerAtividade(obraId, versaoId, servico.id)
                if (r.ok) {
                  toast.success(r.mensagem)
                  aoConcluir()
                } else toast.error(r.erro)
              })
            }
          >
            <Trash2 /> Remover datas
          </Button>
        )}
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Gantt
// ---------------------------------------------------------------------------

function segundaAnterior(iso: string) {
  const [a, m, d] = iso.split("-").map(Number)
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay() // 0 = domingo
  return somarDias(iso, -((dia + 6) % 7))
}

export function Gantt({
  obraId,
  versaoId,
  linhas,
  editavel,
  hoje,
  mostrarReal,
}: {
  obraId: string
  versaoId: string
  linhas: LinhaGantt[]
  editavel: boolean
  hoje: string
  mostrarReal: boolean
}) {
  const [modo, setModo] = useState<"gantt" | "lista">("gantt")
  const [editando, setEditando] = useState<LinhaServico | null>(null)
  useEffect(() => {
    if (window.matchMedia("(max-width: 767px)").matches) setModo("lista")
  }, [])

  const servicos = linhas.filter((l): l is LinhaServico => l.tipo === "servico")
  const datas = servicos.flatMap((s) => [s.inicio, s.fim, s.baselineInicio, s.baselineFim, s.inicioReal, s.fimReal]).filter((d): d is string => !!d)
  const semDatas = datas.length === 0

  const inicioEscala = segundaAnterior(somarDias([...datas, hoje].sort()[0], -3))
  const fimEscala = somarDias([...datas, hoje].sort().at(-1)!, 10)
  const totalDias = diferencaDias(inicioEscala, fimEscala) + 1
  const pxDia = totalDias > 300 ? 4 : totalDias > 150 ? 6 : 10
  const largura = totalDias * pxDia
  const x = (iso: string) => diferencaDias(inicioEscala, iso) * pxDia

  const semanas: string[] = []
  for (let d = inicioEscala; d <= fimEscala; d = somarDias(d, 7)) semanas.push(d)
  const meses: { rotulo: string; x: number; w: number }[] = []
  {
    let d = inicioEscala
    while (d <= fimEscala) {
      const [a, m] = d.split("-").map(Number)
      const proximo = `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`
      const fimMes = proximo > fimEscala ? somarDias(fimEscala, 1) : proximo
      meses.push({ rotulo: `${MESES[m - 1]}/${String(a).slice(2)}`, x: x(d), w: diferencaDias(d, fimMes) * pxDia })
      d = proximo
    }
  }

  const resumoEtapa = (etapaId: string) => {
    const s = servicos.filter((x) => x.etapaId === etapaId && x.inicio && x.fim)
    if (!s.length) return null
    const ini = s.map((x) => x.inicio!).sort()[0]
    const fim = s.map((x) => x.fim!).sort().at(-1)!
    return { ini, fim }
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {mostrarReal ? (
            <>
              <Legenda cor="bg-blue-500" texto="No prazo" />
              <Legenda cor="bg-amber-500" texto="Em risco" />
              <Legenda cor="bg-red-500" texto="Atrasado" />
              <Legenda cor="bg-emerald-500" texto="Concluído" />
              <Legenda cor="bg-slate-400" texto="A iniciar" />
              <Legenda cor="bg-slate-800" texto="Execução real" fina />
            </>
          ) : (
            <Legenda cor="bg-blue-500" texto="Previsto (rascunho)" />
          )}
        </div>
        <div className="flex rounded-md border bg-white p-0.5">
          <Button variant={modo === "gantt" ? "secondary" : "ghost"} size="sm" onClick={() => setModo("gantt")}>
            <BarChart3 /> Gantt
          </Button>
          <Button variant={modo === "lista" ? "secondary" : "ghost"} size="sm" onClick={() => setModo("lista")}>
            <List /> Lista
          </Button>
        </div>
      </div>

      {modo === "gantt" ? (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <div className="relative" style={{ width: 300 + largura }}>
            {/* Cabeçalho */}
            <div className="sticky top-0 z-20 flex border-b bg-slate-50 text-xs">
              <div className="sticky left-0 z-30 w-[300px] shrink-0 border-r bg-slate-50 px-3 py-2 font-medium">Serviço</div>
              <div className="relative" style={{ width: largura, height: 44 }}>
                {meses.map((m, i) => (
                  <div key={i} className="absolute top-0 h-5 border-l px-1 font-medium text-slate-700" style={{ left: m.x, width: m.w }}>
                    {m.rotulo}
                  </div>
                ))}
                {semanas.map((s) => (
                  <div key={s} className="absolute top-5 h-6 border-l border-slate-200 pl-0.5 text-[10px] text-slate-500" style={{ left: x(s) }}>
                    {pxDia >= 6 ? s.slice(8, 10) : ""}
                  </div>
                ))}
              </div>
            </div>

            {/* Linhas */}
            {semDatas && (
              <p className="px-4 py-6 text-sm text-muted-foreground">
                Nenhuma data definida ainda.{editavel && " Clique em um serviço para definir início e término."}
              </p>
            )}
            {linhas.map((l) => {
              if (l.tipo === "etapa") {
                const r = resumoEtapa(l.id)
                return (
                  <div key={l.id} className="flex border-b bg-slate-50/60">
                    <div className="sticky left-0 z-10 w-[300px] shrink-0 border-r bg-slate-50 px-3 py-1.5 text-sm font-semibold">{l.titulo}</div>
                    <div className="relative" style={{ width: largura }}>
                      {r && <div className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded bg-slate-700" style={{ left: x(r.ini), width: (diferencaDias(r.ini, r.fim) + 1) * pxDia }} />}
                    </div>
                  </div>
                )
              }
              const cor = mostrarReal ? (COR_SITUACAO[l.situacao ?? ""] ?? "bg-blue-500") : "bg-blue-500"
              const fimReal = l.inicioReal ? (l.fimReal ?? (hoje >= l.inicioReal ? hoje : l.inicioReal)) : null
              return (
                <div
                  key={l.id}
                  className={cn("group flex border-b last:border-0", editavel && "cursor-pointer hover:bg-blue-50/40")}
                  onClick={editavel ? () => setEditando(l) : undefined}
                  role={editavel ? "button" : undefined}
                  tabIndex={editavel ? 0 : undefined}
                  onKeyDown={editavel ? (e) => (e.key === "Enter" || e.key === " ") && setEditando(l) : undefined}
                  aria-label={editavel ? `Editar datas de ${l.codigo} ${l.titulo}` : undefined}
                >
                  <div className="sticky left-0 z-10 w-[300px] shrink-0 border-r bg-white px-3 py-1.5 group-hover:bg-blue-50">
                    <p className="truncate text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span> {l.titulo}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {l.inicio ? `${fmtData(l.inicio)} – ${fmtData(l.fim)} · ${l.duracao} d` : "Sem datas"}
                      {l.dependeDe && ` · após ${l.dependeDe}`}
                    </p>
                  </div>
                  <div className="relative" style={{ width: largura, height: 44 }}>
                    {semanas.map((s) => (
                      <div key={s} className="absolute inset-y-0 border-l border-slate-100" style={{ left: x(s) }} />
                    ))}
                    {l.baselineInicio && l.baselineFim && (
                      <div
                        className="absolute top-2 h-4 rounded border border-dashed border-slate-500"
                        style={{ left: x(l.baselineInicio), width: (diferencaDias(l.baselineInicio, l.baselineFim) + 1) * pxDia }}
                        title={`Aprovado: ${fmtData(l.baselineInicio)} – ${fmtData(l.baselineFim)}`}
                      />
                    )}
                    {l.inicio && l.fim && (
                      <div
                        className={cn("absolute top-2 h-4 overflow-hidden rounded", cor, "bg-opacity-40")}
                        style={{ left: x(l.inicio), width: (diferencaDias(l.inicio, l.fim) + 1) * pxDia }}
                        title={`${l.codigo} ${l.titulo}: ${fmtData(l.inicio)} – ${fmtData(l.fim)} · ${percentual(l.percentual)}`}
                      >
                        <div className="absolute inset-0 bg-white/50" />
                        <div className={cn("absolute inset-y-0 left-0", cor)} style={{ width: `${Math.min(100, l.percentual)}%` }} />
                      </div>
                    )}
                    {mostrarReal && l.inicioReal && fimReal && (
                      <div
                        className="absolute top-7 h-1.5 rounded bg-slate-800"
                        style={{ left: x(l.inicioReal), width: Math.max(pxDia, (diferencaDias(l.inicioReal, fimReal) + 1) * pxDia) }}
                        title={`Real: ${fmtData(l.inicioReal)} – ${l.fimReal ? fmtData(l.fimReal) : "em andamento"}`}
                      />
                    )}
                  </div>
                </div>
              )
            })}
            {/* Hoje */}
            {hoje >= inicioEscala && hoje <= fimEscala && (
              <div className="pointer-events-none absolute top-0 bottom-0 z-[5] w-px bg-red-500" style={{ left: 300 + x(hoje) + pxDia / 2 }}>
                <span className="absolute top-0 -translate-x-1/2 rounded bg-red-500 px-1 text-[10px] text-white">hoje</span>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="px-3 py-2 font-medium">Serviço</th>
                <th className="px-2 py-2 font-medium">Previsto</th>
                {mostrarReal && <th className="px-2 py-2 font-medium">Real</th>}
                <th className="px-2 py-2 font-medium">Depende de</th>
                <th className="px-2 py-2 text-right font-medium">%</th>
                {mostrarReal && <th className="px-2 py-2 font-medium">Situação</th>}
                {editavel && <th className="w-0" />}
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) =>
                l.tipo === "etapa" ? (
                  <tr key={l.id} className="border-b bg-slate-50">
                    <td colSpan={7} className="px-3 py-1.5 font-semibold">
                      {l.titulo}
                    </td>
                  </tr>
                ) : (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <span className="font-mono text-xs text-muted-foreground">{l.codigo}</span> {l.titulo}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">{l.inicio ? `${fmtData(l.inicio)} – ${fmtData(l.fim)}` : "—"}</td>
                    {mostrarReal && <td className="px-2 py-2 whitespace-nowrap">{l.inicioReal ? `${fmtData(l.inicioReal)} – ${l.fimReal ? fmtData(l.fimReal) : "…"}` : "—"}</td>}
                    <td className="px-2 py-2">{l.dependeDe || "—"}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{percentual(l.percentual)}</td>
                    {mostrarReal && <td className="px-2 py-2">{l.situacao && <StatusBadge mapa={SITUACAO_PRAZO} valor={l.situacao} />}</td>}
                    {editavel && (
                      <td className="px-2 py-2">
                        <Button variant="ghost" size="icon-sm" aria-label="Editar datas" onClick={() => setEditando(l)}>
                          <Pencil />
                        </Button>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editando?.codigo} {editando?.titulo}
            </DialogTitle>
            <DialogDescription>Datas previstas neste rascunho (dias corridos).</DialogDescription>
          </DialogHeader>
          {editando && <FormAtividade key={editando.id} obraId={obraId} versaoId={versaoId} servico={editando} servicos={servicos} aoConcluir={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Legenda({ cor, texto, fina }: { cor: string; texto: string; fina?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block w-4 rounded", fina ? "h-1.5" : "h-3", cor)} />
      {texto}
    </span>
  )
}
