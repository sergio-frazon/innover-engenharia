"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { CheckCircle2, Pencil, Plus, RotateCcw, Send, Trash2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { useAcao } from "@/components/comum/use-acao"
import { Confirmar } from "@/components/comum/confirmar"
import { EstadoVazio } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { data as fmtData, dataHora, hojeISO, lerNumero, numeroParaInput, quantidade } from "@/lib/format"
import { STATUS_MEDICAO } from "@/lib/rotulos"
import type { Tables } from "@/lib/supabase/database.types"
import { aprovarMedicoes, enviarMedicao, excluirMedicao, reabrirMedicao, rejeitarMedicao, salvarMedicaoAvulsa } from "./actions"

type Servico = { id: string; titulo: string; unidade: string; prevista: number; aprovada: number; pendente: number }
export type LinhaMedicao = Omit<Tables<"medicoes">, never> & {
  servico: string
  unidade: string
  diario_data: string | null
  diario_status: string | null
  autor: string | null
  revisor: string | null
  aprovavel: boolean
}

const classeSelect = "h-11 w-full rounded-md border border-input bg-white px-3 text-base shadow-xs sm:h-9 sm:text-sm"

function FormAvulsa({ obraId, servicos, medicao, hoje, aoConcluir }: { obraId: string; servicos: Servico[]; medicao?: LinhaMedicao; hoje: string; aoConcluir: () => void }) {
  const [estado, acao] = useActionState(salvarMedicaoAvulsa, null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  const [servicoId, setServicoId] = useState(medicao?.servico_id ?? "")
  const [qtd, setQtd] = useState(numeroParaInput(medicao?.quantidade))
  const s = servicos.find((x) => x.id === servicoId)
  const outras = s ? s.aprovada + s.pendente - (medicao?.status === "enviada" ? Number(medicao.quantidade) : 0) : 0
  const excede = !!s && outras + (lerNumero(qtd) ?? 0) > s.prevista
  const e = (c: string) => erroCampo(estado, c)

  return (
    <form action={acao} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ErroFormulario estado={estado} />
      </div>
      <input type="hidden" name="obra_id" value={obraId} />
      {medicao && <input type="hidden" name="id" value={medicao.id} />}
      <Campo rotulo="Serviço" nome="servico_id" erro={e("servico_id")} obrigatorio className="sm:col-span-2">
        {medicao ? (
          <>
            <input type="hidden" name="servico_id" value={medicao.servico_id} />
            <p className="text-sm font-medium">{medicao.servico}</p>
          </>
        ) : (
          <select id="servico_id" name="servico_id" value={servicoId} onChange={(ev) => setServicoId(ev.target.value)} className={classeSelect} required>
            <option value="" disabled>
              Selecione…
            </option>
            {servicos.map((x) => (
              <option key={x.id} value={x.id}>
                {x.titulo}
              </option>
            ))}
          </select>
        )}
      </Campo>
      {s && (
        <p className="-mt-2 text-xs text-muted-foreground sm:col-span-2">
          Previsto {quantidade(s.prevista, s.unidade)} · executado {quantidade(s.aprovada, s.unidade)}
          {s.pendente > 0 && ` (+${quantidade(s.pendente)} pendente)`}
        </p>
      )}
      <Campo rotulo="Período de" nome="periodo_inicio" erro={e("periodo_inicio")} obrigatorio>
        <Input id="periodo_inicio" name="periodo_inicio" type="date" max={hoje} defaultValue={medicao?.periodo_inicio ?? hoje} required />
      </Campo>
      <Campo rotulo="até" nome="periodo_fim" erro={e("periodo_fim")} obrigatorio>
        <Input id="periodo_fim" name="periodo_fim" type="date" max={hoje} defaultValue={medicao?.periodo_fim ?? hoje} required />
      </Campo>
      <Campo rotulo={`Quantidade${s ? ` (${s.unidade})` : ""}`} nome="quantidade" erro={e("quantidade")} obrigatorio>
        <Input id="quantidade" name="quantidade" inputMode="decimal" value={qtd} onChange={(ev) => setQtd(ev.target.value)} required />
      </Campo>
      <Campo rotulo="Local" nome="local">
        <Input id="local" name="local" defaultValue={medicao?.local ?? ""} />
      </Campo>
      {excede && (
        <Campo rotulo="Justificativa do excesso" nome="justificativa_excesso" obrigatorio className="sm:col-span-2" ajuda="A quantidade acumulada passa do previsto para o serviço.">
          <Textarea id="justificativa_excesso" name="justificativa_excesso" defaultValue={medicao?.justificativa_excesso ?? ""} rows={2} required />
        </Campo>
      )}
      <Campo rotulo="Observação" nome="observacao" className="sm:col-span-2">
        <Textarea id="observacao" name="observacao" defaultValue={medicao?.observacao ?? ""} rows={2} />
      </Campo>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <Checkbox name="enviar" defaultChecked={!medicao || medicao.status === "rascunho"} disabled={medicao?.status === "enviada"} /> Enviar para aprovação ao salvar
      </label>
      <div className="sm:col-span-2">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </form>
  )
}

export function NovaMedicao({ obraId, servicos, hoje }: { obraId: string; servicos: Servico[]; hoje: string }) {
  const [aberto, setAberto] = useState(false)
  return (
    <>
      <Button onClick={() => setAberto(true)}>
        <Plus /> Medição avulsa
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Medição avulsa</DialogTitle>
            <DialogDescription>Para medir um período (ex.: medição quinzenal). Serviços do dia a dia são lançados pelo diário.</DialogDescription>
          </DialogHeader>
          <FormAvulsa obraId={obraId} servicos={servicos} hoje={hoje} aoConcluir={() => setAberto(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export function ListaMedicoes({
  obraId,
  linhas,
  gestor,
  meuId,
  servicos,
  pendentes,
}: {
  obraId: string
  linhas: LinhaMedicao[]
  gestor: boolean
  meuId: string
  servicos: Servico[]
  pendentes: boolean
}) {
  const [selecionadas, setSelecionadas] = useState<string[]>([])
  const [editando, setEditando] = useState<LinhaMedicao | null>(null)
  const { pendente, executar } = useAcao()
  const aprovaveis = linhas.filter((l) => l.aprovavel)
  const aprovar = (ids: string[]) => executar(aprovarMedicoes(obraId, ids), () => setSelecionadas([]))

  if (linhas.length === 0) {
    return <EstadoVazio titulo={pendentes ? "Nenhuma medição aguardando aprovação." : "Nenhuma medição encontrada."} />
  }

  return (
    <div className="grid gap-3">
      {gestor && aprovaveis.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white px-4 py-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={selecionadas.length === aprovaveis.length ? true : selecionadas.length ? "indeterminate" : false}
              onCheckedChange={(v) => setSelecionadas(v === true ? aprovaveis.map((a) => a.id) : [])}
            />
            Selecionar todas ({aprovaveis.length})
          </label>
          <Button size="sm" disabled={!selecionadas.length || pendente} onClick={() => aprovar(selecionadas)}>
            <CheckCircle2 /> Aprovar selecionadas ({selecionadas.length})
          </Button>
        </div>
      )}

      <ul className="grid gap-2">
        {linhas.map((m) => {
          const excesso = !!m.justificativa_excesso
          const podeEditar = (m.status === "rascunho" && (gestor || m.criado_por === meuId) && !m.diario_id) || (m.status === "enviada" && gestor && !m.diario_id)
          return (
            <li key={m.id} className="flex gap-3 rounded-lg border bg-white p-3">
              {gestor && m.aprovavel && (
                <Checkbox
                  className="mt-1"
                  aria-label="Selecionar medição"
                  checked={selecionadas.includes(m.id)}
                  onCheckedChange={(v) => setSelecionadas((s) => (v === true ? [...s, m.id] : s.filter((x) => x !== m.id)))}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{m.servico}</p>
                    <p className="text-sm">
                      <span className="font-semibold tabular-nums">{quantidade(m.quantidade, m.unidade)}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {m.periodo_inicio === m.periodo_fim ? fmtData(m.periodo_inicio) : `${fmtData(m.periodo_inicio)} a ${fmtData(m.periodo_fim)}`}
                        {m.local && ` · ${m.local}`}
                      </span>
                    </p>
                  </div>
                  <StatusBadge mapa={STATUS_MEDICAO} valor={m.status} />
                </div>
                {excesso && <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">Acima do previsto — justificativa: {m.justificativa_excesso}</p>}
                {m.observacao && <p className="mt-1 text-xs text-muted-foreground">{m.observacao}</p>}
                {m.comentario_revisao && (m.status === "rejeitada" || m.status === "enviada") && (
                  <p className="mt-1 text-xs text-red-800">
                    {m.status === "rejeitada" ? "Motivo da rejeição" : "Reaberta"}: {m.comentario_revisao}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.diario_id ? (
                    <Link href={`/obras/${obraId}/diario/${m.diario_data}`} className="text-blue-700 hover:underline">
                      Diário de {fmtData(m.diario_data)}
                    </Link>
                  ) : (
                    "Avulsa"
                  )}
                  {" · "}lançada por {m.autor ?? "—"}
                  {m.revisado_em && m.revisor && ` · revisada por ${m.revisor} em ${dataHora(m.revisado_em)}`}
                </p>
                {m.status === "enviada" && m.diario_id && m.diario_status !== "aprovado" && (
                  <p className="mt-1 text-xs text-amber-800">Aprovada junto com o diário.</p>
                )}

                <div className="mt-2 flex flex-wrap gap-1">
                  {podeEditar && (
                    <Button variant="outline" size="sm" onClick={() => setEditando(m)}>
                      <Pencil /> Editar
                    </Button>
                  )}
                  {m.status === "rascunho" && !m.diario_id && (gestor || m.criado_por === meuId) && (
                    <>
                      <Button variant="outline" size="sm" disabled={pendente} onClick={() => executar(enviarMedicao(obraId, m.id))}>
                        <Send /> Enviar
                      </Button>
                      <Confirmar
                        gatilho={
                          <Button variant="outline" size="sm" className="text-red-700">
                            <Trash2 /> Excluir
                          </Button>
                        }
                        titulo="Excluir esta medição?"
                        textoConfirmar="Excluir"
                        destrutivo
                        acao={() => excluirMedicao(obraId, m.id)}
                      />
                    </>
                  )}
                  {gestor && m.aprovavel && (
                    <>
                      <Button size="sm" disabled={pendente} onClick={() => aprovar([m.id])}>
                        <CheckCircle2 /> Aprovar
                      </Button>
                      <Confirmar
                        gatilho={
                          <Button variant="outline" size="sm" className="text-red-700">
                            <XCircle /> Rejeitar
                          </Button>
                        }
                        titulo="Rejeitar a medição?"
                        descricao="A medição rejeitada não conta no avanço e não pode ser reaproveitada; será preciso lançar outra."
                        pedirMotivo
                        rotuloMotivo="Motivo da rejeição"
                        textoConfirmar="Rejeitar"
                        destrutivo
                        acao={(motivo) => rejeitarMedicao(obraId, m.id, motivo)}
                      />
                    </>
                  )}
                  {gestor && m.status === "aprovada" && (
                    <Confirmar
                      gatilho={
                        <Button variant="ghost" size="sm">
                          <RotateCcw /> Reabrir
                        </Button>
                      }
                      titulo="Reabrir a medição aprovada?"
                      descricao="Ela deixa de contar no avanço e volta a aguardar aprovação, para correção."
                      pedirMotivo
                      rotuloMotivo="Motivo"
                      textoConfirmar="Reabrir"
                      acao={(motivo) => reabrirMedicao(obraId, m.id, motivo)}
                    />
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>

      <Dialog open={!!editando} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar medição</DialogTitle>
          </DialogHeader>
          {editando && (
            <FormAvulsa
              key={editando.id}
              obraId={obraId}
              servicos={servicos}
              medicao={editando}
              hoje={hojeISO()}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
