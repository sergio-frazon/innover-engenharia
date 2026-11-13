"use client"

import Link from "next/link"
import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { AlertTriangle, CheckCircle2, Cloud, CloudDrizzle, CloudRain, Pencil, Plus, Printer, Send, Sun, Trash2, Undo2, XCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { useAcao } from "@/components/comum/use-acao"
import { Confirmar } from "@/components/comum/confirmar"
import { StatusBadge } from "@/components/comum/status"
import { data as fmtData, dataHora, hora, lerNumero, numeroParaInput, quantidade } from "@/lib/format"
import { CLIMA, STATUS_DIARIO, TIPO_OCORRENCIA, UNIDADES } from "@/lib/rotulos"
import { cn } from "@/lib/utils"
import type { Resultado } from "@/lib/acoes"
import type { Tables } from "@/lib/supabase/database.types"
import {
  adicionarLinhaDiario,
  aprovarDiario,
  criarDiario,
  enviarDiario,
  excluirDiario,
  removerLinhaDiario,
  removerMedicaoDiario,
  salvarCabecalhoDiario,
  salvarMedicaoDiario,
  solicitarCorrecaoDiario,
} from "../actions"

type Servico = { id: string; titulo: string; unidade: string; prevista: number; aprovada: number; pendente: number }
export type DadosDiario = {
  diario: Tables<"diarios"> & { autor: string | null; enviador: string | null; revisor: string | null }
  equipe: (Tables<"diario_equipe"> & { profissional: string | null })[]
  materiais: (Tables<"diario_materiais"> & { servico: string | null })[]
  equipamentos: Tables<"diario_equipamentos">[]
  ocorrencias: Tables<"diario_ocorrencias">[]
  medicoes: (Tables<"medicoes"> & { servico: string; unidade: string })[]
  profissionais: { id: string; nome: string; funcao: string }[]
  catMateriais: { id: string; descricao: string; unidade: string }[]
  catEquipamentos: { id: string; descricao: string; identificacao: string | null }[]
  servicos: Servico[]
}

const classeSelect = "h-11 w-full rounded-md border border-input bg-white px-3 text-base shadow-xs sm:h-9 sm:text-sm"
const ICONE_CLIMA: Record<string, React.ComponentType<{ className?: string }>> = {
  bom: Sun,
  nublado: Cloud,
  chuva_fraca: CloudDrizzle,
  chuva_forte: CloudRain,
  impraticavel: XCircle,
}

// ---------------------------------------------------------------------------

export function CriarDiario({ obraId, data, hoje }: { obraId: string; data: string; hoje: boolean }) {
  const [pendente, iniciar] = useTransition()
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-white px-6 py-12 text-center">
      <p className="font-medium">{hoje ? "O diário de hoje ainda não foi aberto." : `Não há diário em ${fmtData(data)}.`}</p>
      <p className="max-w-md text-sm text-muted-foreground">A equipe e os horários do último diário serão copiados para agilizar. Você ajusta o que mudou.</p>
      <Button
        size="lg"
        className="min-h-12"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            const r = await criarDiario(obraId, data)
            if (r && !r.ok) toast.error(r.erro)
          })
        }
      >
        <Plus /> Abrir diário de {fmtData(data)}
      </Button>
    </div>
  )
}

function Bloco({ titulo, contagem, acao, children }: { titulo: string; contagem?: number; acao?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border bg-white">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-semibold">
          {titulo}
          {contagem !== undefined && contagem > 0 && <span className="ml-1.5 text-sm font-normal text-muted-foreground">({contagem})</span>}
        </h2>
        {acao}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function BotaoRemover({ rotulo, onClick, disabled }: { rotulo: string; onClick: () => void; disabled?: boolean }) {
  return (
    <Button variant="ghost" size="icon" className="shrink-0 text-slate-500 hover:text-red-700" aria-label={rotulo} onClick={onClick} disabled={disabled}>
      <Trash2 />
    </Button>
  )
}

/** Formulário de "adicionar linha" que limpa após salvar */
function FormLinha({ acao, children, rotulo = "Adicionar" }: { acao: (p: Resultado | null, f: FormData) => Promise<Resultado>; children: (estado: Resultado | null) => React.ReactNode; rotulo?: string }) {
  const ref = useRef<HTMLFormElement>(null)
  const [estado, enviar] = useActionState(acao, null)
  useRetornoAcao(estado, { onSucesso: () => ref.current?.reset() })
  return (
    <Formulario ref={ref} acao={enviar} estado={estado} className="mt-3 grid gap-3 rounded-md border border-dashed bg-slate-50/60 p-3 sm:grid-cols-6">
      <div className="sm:col-span-6">
        <ErroFormulario estado={estado && !estado.ok && estado.campos ? estado : null} />
      </div>
      {children(estado)}
      <div className="sm:col-span-6">
        <BotaoEnviar variant="secondary" className="w-full sm:w-auto">
          <Plus /> {rotulo}
        </BotaoEnviar>
      </div>
    </Formulario>
  )
}

// ---------------------------------------------------------------------------

export function DiarioEditor({
  obraId,
  dados,
  podeEditar,
  gestor,
  meuId,
  editadoAposAprovacao,
}: {
  obraId: string
  dados: DadosDiario
  podeEditar: boolean
  gestor: boolean
  meuId: string
  editadoAposAprovacao: { quem: string; quando: string } | null
}) {
  const d = dados.diario
  const { pendente, executar } = useAcao()
  const podeEnviar = podeEditar && (d.status === "rascunho" || d.status === "correcao_solicitada")
  const podeExcluir = d.status === "rascunho" && (gestor || d.criado_por === meuId)

  return (
    <div className="grid gap-4 pb-20 sm:pb-0">
      {/* Situação */}
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-semibold">
            Diário de {fmtData(d.data)} <StatusBadge mapa={STATUS_DIARIO} valor={d.status} />
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Aberto por {d.autor ?? "—"}
            {d.enviado_em && ` · enviado por ${d.enviador ?? "—"} em ${dataHora(d.enviado_em)}`}
            {d.revisado_em && d.status === "aprovado" && ` · aprovado por ${d.revisor ?? "—"} em ${dataHora(d.revisado_em)}`}
          </p>
          {editadoAposAprovacao && (
            <p className="mt-1 text-xs text-amber-800">
              Editado após aprovação por {editadoAposAprovacao.quem} em {dataHora(editadoAposAprovacao.quando)} ·{" "}
              <Link href={`/obras/${obraId}/historico?tabela=diarios`} className="underline">
                ver histórico
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild variant="outline" size="sm">
            <Link href={`/obras/${obraId}/diario/${d.data}/imprimir`} target="_blank">
              <Printer /> Imprimir
            </Link>
          </Button>
          {podeExcluir && (
            <Confirmar
              gatilho={
                <Button variant="outline" size="sm" className="text-red-700">
                  <Trash2 /> Excluir
                </Button>
              }
              titulo="Excluir este diário?"
              descricao="O rascunho e tudo o que foi lançado nele serão apagados."
              textoConfirmar="Excluir"
              destrutivo
              acao={() => excluirDiario(obraId, d.id)}
            />
          )}
          {gestor && d.status === "enviado" && (
            <>
              <Confirmar
                gatilho={
                  <Button variant="outline" size="sm">
                    <Undo2 /> Solicitar correção
                  </Button>
                }
                titulo="Devolver para correção"
                descricao="O diário volta para quem lançou, com o seu comentário em destaque."
                pedirMotivo
                rotuloMotivo="O que precisa ser corrigido"
                textoConfirmar="Devolver"
                acao={(c) => solicitarCorrecaoDiario(obraId, d.id, c)}
              />
              <Confirmar
                gatilho={
                  <Button size="sm">
                    <CheckCircle2 /> Aprovar
                  </Button>
                }
                titulo="Aprovar o diário?"
                descricao="Os serviços executados lançados neste diário passam a contar no avanço da obra."
                textoConfirmar="Aprovar"
                acao={() => aprovarDiario(obraId, d.id)}
              />
            </>
          )}
        </div>
      </div>

      {d.status === "correcao_solicitada" && d.comentario_revisao && (
        <Alert className="border-orange-300 bg-orange-50 text-orange-900">
          <AlertTriangle className="size-4" />
          <AlertTitle>Correção solicitada por {d.revisor ?? "gestor"}</AlertTitle>
          <AlertDescription className="text-orange-900">{d.comentario_revisao}</AlertDescription>
        </Alert>
      )}
      {!podeEditar && d.status === "enviado" && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">Diário enviado para conferência. Só o gestor pode alterar agora.</p>
      )}

      <Cabecalho obraId={obraId} diario={d} podeEditar={podeEditar} />

      <ServicosExecutados obraId={obraId} dados={dados} podeEditar={podeEditar} />

      <Bloco titulo="Equipe" contagem={dados.equipe.reduce((a, e) => a + e.quantidade, 0)}>
        {dados.equipe.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ninguém registrado.</p>
        ) : (
          <ul className="divide-y">
            {dados.equipe.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {e.quantidade > 1 && `${e.quantidade} × `}
                    {e.profissional ?? e.nome ?? e.funcao}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {e.funcao}
                    {e.horas && ` · ${quantidade(e.horas)} h`}
                  </p>
                </div>
                {podeEditar && <BotaoRemover rotulo="Remover da equipe" disabled={pendente} onClick={() => executar(removerLinhaDiario("diario_equipe", obraId, e.id))} />}
              </li>
            ))}
          </ul>
        )}
        {podeEditar && <FormEquipe obraId={obraId} diarioId={d.id} profissionais={dados.profissionais} />}
      </Bloco>

      <Bloco titulo="Materiais aplicados" contagem={dados.materiais.length}>
        {dados.materiais.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum material registrado.</p>
        ) : (
          <ul className="divide-y">
            {dados.materiais.map((m) => (
              <li key={m.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{m.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {quantidade(m.quantidade, m.unidade)}
                    {m.servico && ` · serviço ${m.servico}`}
                  </p>
                </div>
                {podeEditar && <BotaoRemover rotulo="Remover material" disabled={pendente} onClick={() => executar(removerLinhaDiario("diario_materiais", obraId, m.id))} />}
              </li>
            ))}
          </ul>
        )}
        {podeEditar && <FormMaterial obraId={obraId} diarioId={d.id} materiais={dados.catMateriais} servicos={dados.servicos} />}
      </Bloco>

      <Bloco titulo="Equipamentos" contagem={dados.equipamentos.length}>
        {dados.equipamentos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum equipamento registrado.</p>
        ) : (
          <ul className="divide-y">
            {dados.equipamentos.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{e.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.horas ? `${quantidade(e.horas)} h` : "Horas não informadas"}
                    {e.observacao && ` · ${e.observacao}`}
                  </p>
                </div>
                {podeEditar && <BotaoRemover rotulo="Remover equipamento" disabled={pendente} onClick={() => executar(removerLinhaDiario("diario_equipamentos", obraId, e.id))} />}
              </li>
            ))}
          </ul>
        )}
        {podeEditar && <FormEquipamento obraId={obraId} diarioId={d.id} equipamentos={dados.catEquipamentos} />}
      </Bloco>

      <Bloco titulo="Ocorrências" contagem={dados.ocorrencias.length}>
        {dados.ocorrencias.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma ocorrência.</p>
        ) : (
          <ul className="divide-y">
            {dados.ocorrencias.map((o) => (
              <li key={o.id} className="flex items-start gap-2 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{TIPO_OCORRENCIA[o.tipo]}</span>
                    {o.hora && <span className="text-muted-foreground"> às {hora(o.hora)}</span>}
                  </p>
                  <p className="text-sm whitespace-pre-line text-slate-700">{o.descricao}</p>
                </div>
                {podeEditar && <BotaoRemover rotulo="Remover ocorrência" disabled={pendente} onClick={() => executar(removerLinhaDiario("diario_ocorrencias", obraId, o.id))} />}
              </li>
            ))}
          </ul>
        )}
        {podeEditar && <FormOcorrencia obraId={obraId} diarioId={d.id} />}
      </Bloco>

      {podeEnviar && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t bg-white p-3 sm:static sm:rounded-lg sm:border sm:p-4 lg:bottom-0 print:hidden">
          <Confirmar
            gatilho={
              <Button size="lg" className="min-h-12 w-full sm:w-auto">
                <Send /> Enviar para conferência
              </Button>
            }
            titulo="Enviar o diário para conferência?"
            descricao="Depois de enviado, só o gestor pode alterar. Confira se salvou o resumo do dia."
            textoConfirmar="Enviar"
            acao={() => enviarDiario(obraId, d.id)}
          />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Cabeçalho (horários, clima, textos) — salvo por botão; avisa se sair sem salvar
// ---------------------------------------------------------------------------

function SeletorClima({ nome, valor, onChange, disabled }: { nome: string; valor: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-1" role="radiogroup" aria-label={nome}>
      {Object.entries(CLIMA).map(([k, rotulo]) => {
        const Icone = ICONE_CLIMA[k]
        const sel = valor === k
        return (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={sel}
            disabled={disabled}
            onClick={() => onChange(sel ? "" : k)}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-md border px-1 text-[11px] leading-tight transition-colors disabled:opacity-60",
              sel ? "border-blue-500 bg-blue-50 text-blue-800" : "bg-white text-slate-600 hover:bg-slate-50",
            )}
          >
            <Icone className="size-5" />
            {rotulo}
          </button>
        )
      })}
    </div>
  )
}

function Cabecalho({ obraId, diario, podeEditar }: { obraId: string; diario: DadosDiario["diario"]; podeEditar: boolean }) {
  const [estado, acao] = useActionState(salvarCabecalhoDiario, null)
  const [sujo, setSujo] = useState(false)
  const [manha, setManha] = useState(diario.clima_manha ?? "")
  const [tarde, setTarde] = useState(diario.clima_tarde ?? "")
  useRetornoAcao(estado, { onSucesso: () => setSujo(false) })

  useEffect(() => {
    if (!sujo) return
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener("beforeunload", aviso)
    return () => window.removeEventListener("beforeunload", aviso)
  }, [sujo])

  return (
    <Formulario acao={acao} estado={estado} limparAoSalvar={false} onChange={() => setSujo(true)} className="rounded-lg border bg-white">
      <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
        <h2 className="font-semibold">Dia de trabalho</h2>
        {sujo && <span className="text-xs font-medium text-amber-700">Alterações não salvas</span>}
      </header>
      <fieldset disabled={!podeEditar} className="grid gap-4 p-4 sm:grid-cols-2">
        <ErroFormulario estado={estado && !estado.ok ? estado : null} />
        <input type="hidden" name="id" value={diario.id} />
        <input type="hidden" name="obra_id" value={obraId} />
        <input type="hidden" name="clima_manha" value={manha} />
        <input type="hidden" name="clima_tarde" value={tarde} />
        <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:max-w-sm">
          <Campo rotulo="Início" nome="hora_inicio" erro={erroCampo(estado, "hora_inicio")}>
            <Input id="hora_inicio" name="hora_inicio" type="time" defaultValue={diario.hora_inicio?.slice(0, 5) ?? ""} className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Término" nome="hora_fim" erro={erroCampo(estado, "hora_fim")}>
            <Input id="hora_fim" name="hora_fim" type="time" defaultValue={diario.hora_fim?.slice(0, 5) ?? ""} className="h-11 sm:h-9" />
          </Campo>
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Clima pela manhã</span>
          <SeletorClima nome="Clima pela manhã" valor={manha} disabled={!podeEditar} onChange={(v) => (setManha(v), setSujo(true))} />
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Clima à tarde</span>
          <SeletorClima nome="Clima à tarde" valor={tarde} disabled={!podeEditar} onChange={(v) => (setTarde(v), setSujo(true))} />
        </div>
        <Campo rotulo="Resumo das atividades" nome="atividades_resumo" className="sm:col-span-2" ajuda="O que foi feito hoje, em poucas linhas.">
          <Textarea id="atividades_resumo" name="atividades_resumo" defaultValue={diario.atividades_resumo ?? ""} rows={3} className="text-base sm:text-sm" />
        </Campo>
        <Campo rotulo="Impedimentos" nome="impedimentos" ajuda="Condições que atrapalharam a execução.">
          <Textarea id="impedimentos" name="impedimentos" defaultValue={diario.impedimentos ?? ""} rows={2} className="text-base sm:text-sm" />
        </Campo>
        <Campo rotulo="Observações" nome="observacoes">
          <Textarea id="observacoes" name="observacoes" defaultValue={diario.observacoes ?? ""} rows={2} className="text-base sm:text-sm" />
        </Campo>
        {podeEditar && (
          <div className="sm:col-span-2">
            <BotaoEnviar className="w-full sm:w-auto">Salvar</BotaoEnviar>
          </div>
        )}
      </fieldset>
    </Formulario>
  )
}

// ---------------------------------------------------------------------------
// Serviços executados (medições do diário) — com aviso de excesso (R-MED-03)
// ---------------------------------------------------------------------------

function ServicosExecutados({ obraId, dados, podeEditar }: { obraId: string; dados: DadosDiario; podeEditar: boolean }) {
  const [editando, setEditando] = useState<DadosDiario["medicoes"][number] | "novo" | null>(null)
  const { pendente, executar } = useAcao()
  const lancados = new Set(dados.medicoes.map((m) => m.servico_id))

  return (
    <Bloco
      titulo="Serviços executados"
      contagem={dados.medicoes.length}
      acao={
        podeEditar && (
          <Button size="sm" onClick={() => setEditando("novo")}>
            <Plus /> Lançar
          </Button>
        )
      }
    >
      {dados.medicoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum serviço lançado. Os serviços lançados aqui viram medições e, quando o diário for aprovado, contam no avanço da obra.</p>
      ) : (
        <ul className="divide-y">
          {dados.medicoes.map((m) => (
            <li key={m.id} className="flex items-start gap-2 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{m.servico}</p>
                <p className="text-sm">
                  <span className="font-semibold tabular-nums">{quantidade(m.quantidade, m.unidade)}</span>
                  {m.local && <span className="text-muted-foreground"> · {m.local}</span>}
                </p>
                {m.justificativa_excesso && <p className="text-xs text-amber-800">Acima do previsto: {m.justificativa_excesso}</p>}
                {m.observacao && <p className="text-xs text-muted-foreground">{m.observacao}</p>}
              </div>
              {podeEditar && m.status !== "aprovada" && (
                <div className="flex shrink-0">
                  <Button variant="ghost" size="icon" aria-label="Editar lançamento" onClick={() => setEditando(m)}>
                    <Pencil />
                  </Button>
                  {m.status === "rascunho" && <BotaoRemover rotulo="Remover lançamento" disabled={pendente} onClick={() => executar(removerMedicaoDiario(obraId, m.id))} />}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editando !== null} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando === "novo" ? "Lançar serviço executado" : "Editar lançamento"}</DialogTitle>
            <DialogDescription>Quantidade executada neste dia.</DialogDescription>
          </DialogHeader>
          {editando && (
            <FormMedicao
              key={editando === "novo" ? "novo" : editando.id}
              obraId={obraId}
              diarioId={dados.diario.id}
              servicos={dados.servicos.filter((s) => (editando === "novo" ? !lancados.has(s.id) : s.id === editando.servico_id))}
              medicao={editando === "novo" ? undefined : editando}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Bloco>
  )
}

function FormMedicao({
  obraId,
  diarioId,
  servicos,
  medicao,
  aoConcluir,
}: {
  obraId: string
  diarioId: string
  servicos: Servico[]
  medicao?: DadosDiario["medicoes"][number]
  aoConcluir: () => void
}) {
  const [estado, acao] = useActionState(salvarMedicaoDiario.bind(null, obraId), null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  const [servicoId, setServicoId] = useState(medicao?.servico_id ?? "")
  const [qtd, setQtd] = useState(numeroParaInput(medicao?.quantidade))
  const s = servicos.find((x) => x.id === servicoId)
  const q = lerNumero(qtd) ?? 0
  // Acumulado sem contar esta própria medição (se estiver editando)
  const outras = s ? s.aprovada + s.pendente - (medicao && medicao.status === "enviada" ? Number(medicao.quantidade) : 0) : 0
  const excede = !!s && outras + q > s.prevista

  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4">
      <ErroFormulario estado={estado} />
      {medicao && <input type="hidden" name="id" value={medicao.id} />}
      <input type="hidden" name="diario_id" value={diarioId} />
      <Campo rotulo="Serviço" nome="servico_id" erro={erroCampo(estado, "servico_id")} obrigatorio>
        {medicao ? (
          <>
            <input type="hidden" name="servico_id" value={medicao.servico_id} />
            <p className="text-sm font-medium">{medicao.servico}</p>
          </>
        ) : (
          <select id="servico_id" name="servico_id" value={servicoId} onChange={(e) => setServicoId(e.target.value)} className={classeSelect} required>
            <option value="" disabled>
              Selecione o serviço…
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
        <p className="-mt-2 text-xs text-muted-foreground">
          Previsto {quantidade(s.prevista, s.unidade)} · já executado {quantidade(s.aprovada, s.unidade)}
          {s.pendente > 0 && ` (+${quantidade(s.pendente)} aguardando aprovação)`} · saldo {quantidade(Math.max(0, s.prevista - outras), s.unidade)}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Campo rotulo={`Quantidade${s ? ` (${s.unidade})` : ""}`} nome="quantidade" erro={erroCampo(estado, "quantidade")} obrigatorio>
          <Input id="quantidade" name="quantidade" inputMode="decimal" value={qtd} onChange={(e) => setQtd(e.target.value)} className="h-11 text-base sm:h-9 sm:text-sm" required />
        </Campo>
        <Campo rotulo="Local" nome="local" ajuda="Ex.: térreo, bloco B">
          <Input id="local" name="local" defaultValue={medicao?.local ?? ""} className="h-11 text-base sm:h-9 sm:text-sm" />
        </Campo>
      </div>
      {excede && (
        <div className="grid gap-2 rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm text-amber-900">
            Com este lançamento, o acumulado ({quantidade(outras + q, s!.unidade)}) passa do previsto ({quantidade(s!.prevista, s!.unidade)}). Explique o motivo para o gestor.
          </p>
          <Campo rotulo="Justificativa do excesso" nome="justificativa_excesso" obrigatorio>
            <Textarea id="justificativa_excesso" name="justificativa_excesso" defaultValue={medicao?.justificativa_excesso ?? ""} rows={2} required className="bg-white" />
          </Campo>
        </div>
      )}
      <Campo rotulo="Observação" nome="observacao">
        <Textarea id="observacao" name="observacao" defaultValue={medicao?.observacao ?? ""} rows={2} />
      </Campo>
      <BotaoEnviar className="w-full sm:w-auto">Salvar</BotaoEnviar>
    </Formulario>
  )
}

// ---------------------------------------------------------------------------
// Formulários de linhas
// ---------------------------------------------------------------------------

function FormEquipe({ obraId, diarioId, profissionais }: { obraId: string; diarioId: string; profissionais: DadosDiario["profissionais"] }) {
  const [funcao, setFuncao] = useState("")
  return (
    <FormLinha acao={adicionarLinhaDiario.bind(null, "diario_equipe", obraId)} rotulo="Adicionar à equipe">
      {(estado) => (
        <>
          <input type="hidden" name="diario_id" value={diarioId} />
          <Campo rotulo="Profissional" nome="profissional_id" className="sm:col-span-3">
            <select
              id="profissional_id"
              name="profissional_id"
              className={classeSelect}
              onChange={(e) => setFuncao(profissionais.find((p) => p.id === e.target.value)?.funcao ?? funcao)}
            >
              <option value="">Não cadastrado / grupo</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome} — {p.funcao}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Nome (se não cadastrado)" nome="nome" className="sm:col-span-3">
            <Input id="nome" name="nome" placeholder="Ex.: serventes diaristas" className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Função" nome="funcao" erro={erroCampo(estado, "funcao")} obrigatorio className="sm:col-span-2">
            <Input id="funcao" name="funcao" value={funcao} onChange={(e) => setFuncao(e.target.value)} required className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Quantidade" nome="quantidade" erro={erroCampo(estado, "quantidade")} className="sm:col-span-2">
            <Input id="quantidade" name="quantidade" inputMode="numeric" defaultValue="1" className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Horas" nome="horas" erro={erroCampo(estado, "horas")} className="sm:col-span-2">
            <Input id="horas" name="horas" inputMode="decimal" placeholder="8" className="h-11 sm:h-9" />
          </Campo>
        </>
      )}
    </FormLinha>
  )
}

function FormMaterial({ obraId, diarioId, materiais, servicos }: { obraId: string; diarioId: string; materiais: DadosDiario["catMateriais"]; servicos: Servico[] }) {
  const [descricao, setDescricao] = useState("")
  const [unidade, setUnidade] = useState("")
  return (
    <FormLinha acao={adicionarLinhaDiario.bind(null, "diario_materiais", obraId)} rotulo="Adicionar material">
      {(estado) => (
        <>
          <input type="hidden" name="diario_id" value={diarioId} />
          <Campo rotulo="Material do catálogo" nome="material_id" className="sm:col-span-3">
            <select
              id="material_id"
              name="material_id"
              className={classeSelect}
              onChange={(e) => {
                const m = materiais.find((x) => x.id === e.target.value)
                if (m) {
                  setDescricao(m.descricao)
                  setUnidade(m.unidade)
                }
              }}
            >
              <option value="">Outro</option>
              {materiais.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.descricao}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Serviço (opcional)" nome="servico_id" className="sm:col-span-3">
            <select id="servico_id" name="servico_id" className={classeSelect}>
              <option value="">—</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titulo}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Descrição" nome="descricao" erro={erroCampo(estado, "descricao")} obrigatorio className="sm:col-span-3">
            <Input id="descricao" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Quantidade" nome="quantidade" erro={erroCampo(estado, "quantidade")} obrigatorio className="sm:col-span-2">
            <Input id="quantidade" name="quantidade" inputMode="decimal" required className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Unidade" nome="unidade" erro={erroCampo(estado, "unidade")} obrigatorio className="sm:col-span-1">
            <Input id="unidade" name="unidade" value={unidade} onChange={(e) => setUnidade(e.target.value)} list="unidades-diario" required className="h-11 sm:h-9" />
            <datalist id="unidades-diario">
              {UNIDADES.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </Campo>
        </>
      )}
    </FormLinha>
  )
}

function FormEquipamento({ obraId, diarioId, equipamentos }: { obraId: string; diarioId: string; equipamentos: DadosDiario["catEquipamentos"] }) {
  const [descricao, setDescricao] = useState("")
  return (
    <FormLinha acao={adicionarLinhaDiario.bind(null, "diario_equipamentos", obraId)} rotulo="Adicionar equipamento">
      {(estado) => (
        <>
          <input type="hidden" name="diario_id" value={diarioId} />
          <Campo rotulo="Equipamento do catálogo" nome="equipamento_id" className="sm:col-span-3">
            <select
              id="equipamento_id"
              name="equipamento_id"
              className={classeSelect}
              onChange={(e) => setDescricao(equipamentos.find((x) => x.id === e.target.value)?.descricao ?? descricao)}
            >
              <option value="">Outro</option>
              {equipamentos.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.descricao}
                  {x.identificacao ? ` (${x.identificacao})` : ""}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Descrição" nome="descricao" erro={erroCampo(estado, "descricao")} obrigatorio className="sm:col-span-3">
            <Input id="descricao" name="descricao" value={descricao} onChange={(e) => setDescricao(e.target.value)} required className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Horas de uso" nome="horas" erro={erroCampo(estado, "horas")} className="sm:col-span-2">
            <Input id="horas" name="horas" inputMode="decimal" className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Observação" nome="observacao" className="sm:col-span-4">
            <Input id="observacao" name="observacao" className="h-11 sm:h-9" />
          </Campo>
        </>
      )}
    </FormLinha>
  )
}

function FormOcorrencia({ obraId, diarioId }: { obraId: string; diarioId: string }) {
  return (
    <FormLinha acao={adicionarLinhaDiario.bind(null, "diario_ocorrencias", obraId)} rotulo="Adicionar ocorrência">
      {(estado) => (
        <>
          <input type="hidden" name="diario_id" value={diarioId} />
          <Campo rotulo="Tipo" nome="tipo" className="sm:col-span-3">
            <select id="tipo" name="tipo" defaultValue="ocorrencia" className={classeSelect}>
              {Object.entries(TIPO_OCORRENCIA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Hora" nome="hora" erro={erroCampo(estado, "hora")} className="sm:col-span-3">
            <Input id="hora" name="hora" type="time" className="h-11 sm:h-9" />
          </Campo>
          <Campo rotulo="Descrição" nome="descricao" erro={erroCampo(estado, "descricao")} obrigatorio className="sm:col-span-6">
            <Textarea id="descricao" name="descricao" rows={2} required className="text-base sm:text-sm" />
          </Campo>
        </>
      )}
    </FormLinha>
  )
}
