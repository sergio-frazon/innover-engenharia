"use client"

import { useActionState, useState, useTransition } from "react"
import { Ban, CalendarClock, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { Confirmar } from "@/components/comum/confirmar"
import { lerNumero, moeda, numeroParaInput } from "@/lib/format"
import { somaParcelas } from "@/lib/parcelas"
import { NATUREZA } from "@/lib/rotulos"
import type { Tables } from "@/lib/supabase/database.types"
import { atualizarParcelas, cancelarLancamento, editarLancamento, estornarBaixa } from "../actions"

const classeSelect = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"

export function EstornarBaixa({ baixaId }: { baixaId: string }) {
  return (
    <Confirmar
      gatilho={
        <Button variant="ghost" size="sm" className="text-red-700">
          <RotateCcw /> Estornar
        </Button>
      }
      titulo="Estornar este pagamento?"
      descricao="O pagamento continua no histórico, marcado como estornado, e o saldo da parcela volta a ficar em aberto."
      pedirMotivo
      rotuloMotivo="Motivo do estorno"
      textoConfirmar="Estornar"
      destrutivo
      acao={(motivo) => estornarBaixa(baixaId, motivo)}
    />
  )
}

type Parcela = { id: string; numero: number; vencimento: string; valor: number; pago: boolean }

export function AcoesLancamento({
  lancamento,
  parcelas,
  temBaixaAtiva,
  categorias,
  pessoas,
  etapas,
}: {
  lancamento: Tables<"lancamentos"> & { valor_total: number }
  parcelas: Parcela[]
  temBaixaAtiva: boolean
  categorias: { id: string; nome: string; tipo: string }[]
  pessoas: { id: string; nome: string; eh_cliente: boolean; eh_fornecedor: boolean; eh_prestador: boolean }[]
  etapas: { id: string; codigo: string; nome: string }[]
}) {
  const [dialogo, setDialogo] = useState<"editar" | "parcelas" | null>(null)
  return (
    <>
      <Button variant="outline" onClick={() => setDialogo("editar")}>
        <Pencil /> Editar
      </Button>
      {parcelas.some((p) => !p.pago) && (
        <Button variant="outline" onClick={() => setDialogo("parcelas")}>
          <CalendarClock /> Alterar parcelas
        </Button>
      )}
      {!temBaixaAtiva && (
        <Confirmar
          gatilho={
            <Button variant="outline" className="text-red-700">
              <Ban /> Cancelar lançamento
            </Button>
          }
          titulo="Cancelar este lançamento?"
          descricao="O lançamento sai das contas em aberto e do custo realizado, mas continua no histórico."
          pedirMotivo
          rotuloMotivo="Motivo do cancelamento"
          textoConfirmar="Cancelar lançamento"
          destrutivo
          acao={(m) => cancelarLancamento(lancamento.id, m)}
        />
      )}

      <Dialog open={dialogo === "editar"} onOpenChange={(a) => !a && setDialogo(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar lançamento</DialogTitle>
            <DialogDescription>Valor e parcelas são alterados em “Alterar parcelas”.</DialogDescription>
          </DialogHeader>
          {dialogo === "editar" && <FormEdicao lancamento={lancamento} categorias={categorias} pessoas={pessoas} etapas={etapas} aoConcluir={() => setDialogo(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogo === "parcelas"} onOpenChange={(a) => !a && setDialogo(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Alterar parcelas</DialogTitle>
            <DialogDescription>Parcelas com pagamento registrado não mudam. O valor total passa a ser a soma de todas.</DialogDescription>
          </DialogHeader>
          {dialogo === "parcelas" && <FormParcelas lancamentoId={lancamento.id} parcelas={parcelas} aoConcluir={() => setDialogo(null)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FormEdicao({
  lancamento: l,
  categorias,
  pessoas,
  etapas,
  aoConcluir,
}: {
  lancamento: Tables<"lancamentos">
  categorias: { id: string; nome: string; tipo: string }[]
  pessoas: { id: string; nome: string; eh_cliente: boolean; eh_fornecedor: boolean; eh_prestador: boolean }[]
  etapas: { id: string; codigo: string; nome: string }[]
  aoConcluir: () => void
}) {
  const [estado, acao] = useActionState(editarLancamento, null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  const e = (c: string) => erroCampo(estado, c)
  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ErroFormulario estado={estado} />
      </div>
      <input type="hidden" name="id" value={l.id} />
      <Campo rotulo="Descrição" nome="descricao" erro={e("descricao")} obrigatorio className="sm:col-span-2">
        <Input id="descricao" name="descricao" defaultValue={l.descricao} required />
      </Campo>
      <Campo rotulo="Categoria" nome="categoria_id" obrigatorio>
        <select id="categoria_id" name="categoria_id" defaultValue={l.categoria_id} className={classeSelect}>
          {categorias
            .filter((c) => c.tipo === (l.tipo === "pagar" ? "despesa" : "receita"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>
      </Campo>
      <Campo rotulo={l.tipo === "pagar" ? "Fornecedor" : "Cliente"} nome="pessoa_id">
        <select id="pessoa_id" name="pessoa_id" defaultValue={l.pessoa_id ?? ""} className={classeSelect}>
          <option value="">Não informado</option>
          {pessoas
            .filter((p) => (l.tipo === "pagar" ? p.eh_fornecedor || p.eh_prestador : p.eh_cliente))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
        </select>
      </Campo>
      {l.obra_id && (
        <>
          <Campo rotulo="Etapa" nome="etapa_id">
            <select id="etapa_id" name="etapa_id" defaultValue={l.etapa_id ?? ""} className={classeSelect}>
              <option value="">Sem etapa</option>
              {etapas.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.codigo}. {x.nome}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Natureza" nome="natureza" erro={e("natureza")}>
            <select id="natureza" name="natureza" defaultValue={l.natureza ?? ""} className={classeSelect}>
              {l.tipo !== "pagar" && <option value="">—</option>}
              {Object.entries(NATUREZA).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Campo>
        </>
      )}
      <Campo rotulo="Nº do documento" nome="documento_numero">
        <Input id="documento_numero" name="documento_numero" defaultValue={l.documento_numero ?? ""} />
      </Campo>
      <Campo rotulo="Competência" nome="data_competencia" erro={e("data_competencia")} obrigatorio>
        <Input id="data_competencia" name="data_competencia" type="date" defaultValue={l.data_competencia} required />
      </Campo>
      <Campo rotulo="Observação" nome="observacao" className="sm:col-span-2">
        <Textarea id="observacao" name="observacao" defaultValue={l.observacao ?? ""} rows={2} />
      </Campo>
      <div className="sm:col-span-2">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </Formulario>
  )
}

function FormParcelas({ lancamentoId, parcelas, aoConcluir }: { lancamentoId: string; parcelas: Parcela[]; aoConcluir: () => void }) {
  const pagas = parcelas.filter((p) => p.pago)
  const [linhas, setLinhas] = useState(parcelas.filter((p) => !p.pago).map((p) => ({ vencimento: p.vencimento, valor: numeroParaInput(p.valor) })))
  const [pendente, iniciar] = useTransition()
  const novas = linhas.map((l) => ({ vencimento: l.vencimento, valor: lerNumero(l.valor) ?? 0 }))
  const total = somaParcelas([...pagas, ...novas])

  return (
    <div className="grid gap-3">
      {pagas.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {pagas.length} parcela(s) com pagamento mantida(s): {moeda(somaParcelas(pagas))}
        </p>
      )}
      <ul className="grid gap-2">
        {linhas.map((l, i) => (
          <li key={i} className="flex items-center gap-2">
            <Input type="date" value={l.vencimento} onChange={(ev) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, vencimento: ev.target.value } : x)))} aria-label="Vencimento" />
            <Input inputMode="decimal" value={l.valor} onChange={(ev) => setLinhas((ls) => ls.map((x, j) => (j === i ? { ...x, valor: ev.target.value } : x)))} aria-label="Valor" className="w-36" />
            <Button variant="ghost" size="icon-sm" aria-label="Remover parcela" onClick={() => setLinhas((ls) => ls.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <Button variant="outline" size="sm" className="w-fit" onClick={() => setLinhas((ls) => [...ls, { vencimento: ls.at(-1)?.vencimento ?? new Date().toISOString().slice(0, 10), valor: "" }])}>
        <Plus /> Parcela
      </Button>
      <p className="text-sm">
        Novo valor total: <span className="font-semibold">{moeda(total)}</span>
      </p>
      <Button
        disabled={pendente || novas.length === 0}
        onClick={() =>
          iniciar(async () => {
            const r = await atualizarParcelas(lancamentoId, novas)
            if (r.ok) {
              toast.success(r.mensagem)
              aoConcluir()
            } else toast.error(r.erro)
          })
        }
      >
        Salvar parcelas
      </Button>
    </div>
  )
}
