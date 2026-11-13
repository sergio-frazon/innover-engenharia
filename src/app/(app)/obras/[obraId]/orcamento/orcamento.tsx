"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Copy, Download, FilePlus2, Pencil, Plus, Printer, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { useAcao } from "@/components/comum/use-acao"
import { Confirmar } from "@/components/comum/confirmar"
import { EstadoVazio } from "@/components/comum/pagina"
import { lerNumero, moeda, numero, numeroParaInput } from "@/lib/format"
import { NATUREZA, STATUS_VERSAO, UNIDADES } from "@/lib/rotulos"
import type { Tables } from "@/lib/supabase/database.types"
import {
  aprovarOrcamento,
  criarVersaoOrcamento,
  descartarRascunhoOrcamento,
  duplicarItemOrcamento,
  removerItemOrcamento,
  salvarItemOrcamento,
} from "./actions"

type Item = Tables<"orcamento_itens">
export type EtapaOrc = { id: string; titulo: string; total: number; servicos: { id: string; titulo: string; detalhe: string; total: number; itens: Item[] }[] }
type Material = { id: string; descricao: string; unidade: string; custo_unitario: number | null }
type ServicoAtivo = { id: string; titulo: string; unidade: string; quantidade: number }

const classeSelect = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"

export function CriarPrimeiraVersao({ obraId }: { obraId: string }) {
  const router = useRouter()
  const [pendente, iniciar] = useTransition()
  return (
    <Button
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await criarVersaoOrcamento(obraId, "Orçamento inicial")
          if (r.ok) router.push(`/obras/${obraId}/orcamento?v=${r.id}`)
          else toast.error(r.erro)
        })
      }
    >
      <FilePlus2 /> Criar orçamento
    </Button>
  )
}

export function SeletorVersao({ base, atual, versoes }: { base: string; atual: string; versoes: { id: string; numero: number; status: string; descricao: string | null }[] }) {
  const router = useRouter()
  return (
    <select
      value={atual}
      onChange={(e) => router.push(`${base}?v=${e.target.value}`)}
      className="h-9 rounded-md border bg-white px-3 text-sm"
      aria-label="Versão do orçamento"
    >
      {versoes.map((v) => (
        <option key={v.id} value={v.id}>
          v{v.numero} — {STATUS_VERSAO[v.status]?.texto}
          {v.descricao ? ` (${v.descricao})` : ""}
        </option>
      ))}
    </select>
  )
}

export function AcoesVersao({
  obraId,
  versao,
  temRascunho,
  rascunhoId,
  podeEditar,
  csv,
}: {
  obraId: string
  versao: { id: string; numero: number; status: string }
  temRascunho: boolean
  rascunhoId?: string
  podeEditar: boolean
  csv: string
}) {
  const router = useRouter()
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" size="sm" asChild>
        <a href={csv}>
          <Download /> CSV
        </a>
      </Button>
      <Button variant="outline" size="sm" onClick={() => window.print()}>
        <Printer /> Imprimir
      </Button>
      {podeEditar && !temRascunho && versao.status !== "rascunho" && (
        <Confirmar
          gatilho={
            <Button size="sm">
              <FilePlus2 /> Criar revisão
            </Button>
          }
          titulo="Criar revisão do orçamento?"
          descricao="Será criado um rascunho com uma cópia dos itens da versão aprovada. A versão aprovada continua valendo até o rascunho ser aprovado."
          pedirMotivo
          rotuloMotivo="Motivo da revisão"
          textoConfirmar="Criar rascunho"
          acao={async (motivo) => {
            const r = await criarVersaoOrcamento(obraId, motivo)
            if (r.ok) router.push(`/obras/${obraId}/orcamento?v=${r.id}`)
            return r
          }}
        />
      )}
      {podeEditar && temRascunho && versao.status !== "rascunho" && (
        <Button size="sm" variant="secondary" onClick={() => router.push(`/obras/${obraId}/orcamento?v=${rascunhoId}`)}>
          <Pencil /> Abrir rascunho
        </Button>
      )}
      {podeEditar && versao.status === "rascunho" && (
        <>
          <Confirmar
            gatilho={
              <Button size="sm" variant="outline" className="text-red-700">
                <Trash2 /> Descartar rascunho
              </Button>
            }
            titulo={`Descartar o rascunho v${versao.numero}?`}
            descricao="Todos os itens deste rascunho serão apagados. A versão aprovada não muda."
            textoConfirmar="Descartar"
            destrutivo
            acao={async () => {
              const r = await descartarRascunhoOrcamento(obraId, versao.id)
              if (r.ok) router.push(`/obras/${obraId}/orcamento`)
              return r
            }}
          />
          <Confirmar
            gatilho={
              <Button size="sm">
                <CheckCircle2 /> Aprovar versão
              </Button>
            }
            titulo={`Aprovar o orçamento v${versao.numero}?`}
            descricao="Depois de aprovada, a versão não pode mais ser alterada. A versão aprovada anterior (se houver) passa a ser substituída, e os pesos do avanço da obra são recalculados."
            textoConfirmar="Aprovar"
            acao={() => aprovarOrcamento(obraId, versao.id)}
          />
        </>
      )}
    </div>
  )
}

function FormItem({
  obraId,
  versaoId,
  servicos,
  materiais,
  item,
  servicoId,
  aoConcluir,
}: {
  obraId: string
  versaoId: string
  servicos: ServicoAtivo[]
  materiais: Material[]
  item?: Item
  servicoId?: string
  aoConcluir: () => void
}) {
  const [estado, acao] = useActionState(salvarItemOrcamento, null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  const [descricao, setDescricao] = useState(item?.descricao ?? "")
  const [unidade, setUnidade] = useState(item?.unidade ?? "")
  const [qtd, setQtd] = useState(numeroParaInput(item?.quantidade))
  const [vu, setVu] = useState(numeroParaInput(item?.valor_unitario))
  const [materialId, setMaterialId] = useState(item?.material_id ?? "")
  const [natureza, setNatureza] = useState(item?.natureza ?? "material")
  const e = (c: string) => erroCampo(estado, c)

  function escolherMaterial(id: string) {
    setMaterialId(id)
    const m = materiais.find((x) => x.id === id)
    if (m) {
      setDescricao(m.descricao)
      setUnidade(m.unidade)
      if (m.custo_unitario !== null) setVu(numeroParaInput(m.custo_unitario))
      setNatureza("material")
    }
  }

  const total = (lerNumero(qtd) ?? 0) * (lerNumero(vu) ?? 0)

  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <ErroFormulario estado={estado} />
      </div>
      <input type="hidden" name="obra_id" value={obraId} />
      <input type="hidden" name="versao_id" value={versaoId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <Campo rotulo="Serviço" nome="servico_id" erro={e("servico_id")} obrigatorio className="sm:col-span-4">
        <select id="servico_id" name="servico_id" defaultValue={item?.servico_id ?? servicoId ?? ""} className={classeSelect} required>
          <option value="" disabled>
            Selecione…
          </option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.titulo}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Natureza" nome="natureza" obrigatorio>
        <select id="natureza" name="natureza" value={natureza} onChange={(ev) => setNatureza(ev.target.value)} className={classeSelect}>
          {Object.entries(NATUREZA).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Material do catálogo" nome="material_id" className="sm:col-span-3" ajuda="Opcional: preenche descrição, unidade e custo.">
        <select id="material_id" name="material_id" value={materialId} onChange={(ev) => escolherMaterial(ev.target.value)} className={classeSelect}>
          <option value="">Nenhum</option>
          {materiais.map((m) => (
            <option key={m.id} value={m.id}>
              {m.descricao} ({m.unidade})
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Descrição" nome="descricao" erro={e("descricao")} obrigatorio className="sm:col-span-4">
        <Input id="descricao" name="descricao" value={descricao} onChange={(ev) => setDescricao(ev.target.value)} required />
      </Campo>
      <Campo rotulo="Unidade" nome="unidade" erro={e("unidade")} obrigatorio>
        <Input id="unidade" name="unidade" value={unidade} onChange={(ev) => setUnidade(ev.target.value)} list="unidades-orc" required />
        <datalist id="unidades-orc">
          {UNIDADES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </Campo>
      <Campo rotulo="Quantidade" nome="quantidade" erro={e("quantidade")} obrigatorio>
        <Input id="quantidade" name="quantidade" inputMode="decimal" value={qtd} onChange={(ev) => setQtd(ev.target.value)} required />
      </Campo>
      <Campo rotulo="Valor unitário (R$)" nome="valor_unitario" erro={e("valor_unitario")} obrigatorio>
        <Input id="valor_unitario" name="valor_unitario" inputMode="decimal" value={vu} onChange={(ev) => setVu(ev.target.value)} required />
      </Campo>
      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Total</span>
        <p className="flex h-9 items-center text-sm font-semibold tabular-nums">{moeda(Math.round(total * 100) / 100)}</p>
      </div>
      <div className="sm:col-span-4">
        <BotaoEnviar>Salvar item</BotaoEnviar>
      </div>
    </Formulario>
  )
}

export function ItensOrcamento({
  obraId,
  versaoId,
  editavel,
  etapas,
  servicosAtivos,
  materiais,
  totalGeral,
}: {
  obraId: string
  versaoId: string
  editavel: boolean
  etapas: EtapaOrc[]
  servicosAtivos: ServicoAtivo[]
  materiais: Material[]
  totalGeral: number
}) {
  const [dialogo, setDialogo] = useState<{ item?: Item; servicoId?: string } | null>(null)
  const { pendente, executar } = useAcao()

  if (etapas.length === 0) {
    return (
      <EstadoVazio
        titulo="Nenhum serviço planejado."
        descricao="Cadastre etapas e serviços na aba Planejamento antes de montar o orçamento."
      />
    )
  }

  return (
    <div className="grid gap-4">
      {editavel && (
        <div className="flex justify-end print:hidden">
          <Button onClick={() => setDialogo({})}>
            <Plus /> Adicionar item
          </Button>
        </div>
      )}
      {etapas.map((e) => (
        <section key={e.id} className="rounded-lg border bg-white print:break-inside-avoid">
          <header className="flex items-center justify-between gap-2 border-b bg-slate-50 px-4 py-2">
            <h2 className="font-semibold">{e.titulo}</h2>
            <span className="font-semibold tabular-nums">{moeda(e.total)}</span>
          </header>
          {e.servicos.map((s) => (
            <div key={s.id} className="border-b last:border-0">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                <p className="text-sm font-medium">
                  {s.titulo} <span className="font-normal text-muted-foreground">· {s.detalhe}</span>
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium tabular-nums">{moeda(s.total)}</span>
                  {editavel && (
                    <Button variant="ghost" size="icon-sm" aria-label="Adicionar item ao serviço" onClick={() => setDialogo({ servicoId: s.id })} className="print:hidden">
                      <Plus />
                    </Button>
                  )}
                </div>
              </div>
              {s.itens.length === 0 ? (
                <p className="px-4 pb-2 text-xs text-amber-700">Sem itens: este serviço terá peso zero no avanço.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-1 font-medium">Natureza</th>
                        <th className="px-2 py-1 font-medium">Descrição</th>
                        <th className="px-2 py-1 text-right font-medium">Qtd.</th>
                        <th className="px-2 py-1 text-right font-medium">Unitário</th>
                        <th className="px-2 py-1 text-right font-medium">Total</th>
                        {editavel && <th className="w-0 print:hidden" />}
                      </tr>
                    </thead>
                    <tbody>
                      {s.itens.map((i) => (
                        <tr key={i.id} className="border-t border-slate-100">
                          <td className="px-4 py-1.5 whitespace-nowrap text-muted-foreground">{NATUREZA[i.natureza]}</td>
                          <td className="px-2 py-1.5">{i.descricao}</td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap tabular-nums">
                            {numero(i.quantidade, 4)} {i.unidade}
                          </td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{moeda(i.valor_unitario)}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{moeda(i.valor_total)}</td>
                          {editavel && (
                            <td className="px-2 py-1 print:hidden">
                              <div className="flex justify-end gap-0.5">
                                <Button variant="ghost" size="icon-sm" aria-label="Editar item" onClick={() => setDialogo({ item: i })}>
                                  <Pencil />
                                </Button>
                                <Button variant="ghost" size="icon-sm" aria-label="Duplicar item" disabled={pendente} onClick={() => executar(duplicarItemOrcamento(obraId, i.id))}>
                                  <Copy />
                                </Button>
                                <Confirmar
                                  gatilho={
                                    <Button variant="ghost" size="icon-sm" aria-label="Remover item">
                                      <Trash2 />
                                    </Button>
                                  }
                                  titulo="Remover item?"
                                  descricao={i.descricao}
                                  textoConfirmar="Remover"
                                  destrutivo
                                  acao={() => removerItemOrcamento(obraId, i.id)}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </section>
      ))}
      <div className="flex items-center justify-between rounded-lg border bg-slate-900 px-4 py-3 text-white">
        <span className="font-semibold">Total do orçamento</span>
        <span className="text-lg font-semibold tabular-nums">{moeda(totalGeral)}</span>
      </div>

      <Dialog open={dialogo !== null} onOpenChange={(a) => !a && setDialogo(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{dialogo?.item ? "Editar item" : "Novo item"}</DialogTitle>
          </DialogHeader>
          {dialogo && (
            <FormItem
              key={dialogo.item?.id ?? dialogo.servicoId ?? "novo"}
              obraId={obraId}
              versaoId={versaoId}
              servicos={servicosAtivos}
              materiais={materiais}
              item={dialogo.item}
              servicoId={dialogo.servicoId}
              aoConcluir={() => setDialogo(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
