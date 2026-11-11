"use client"

import Link from "next/link"
import { useActionState, useEffect, useMemo, useState } from "react"
import { AlertTriangle, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { data as fmtData, lerNumero, moeda, numeroParaInput } from "@/lib/format"
import { dividirParcelas, somaParcelas } from "@/lib/parcelas"
import { NATUREZA } from "@/lib/rotulos"
import { criarLancamento, verificarDuplicidade } from "../actions"

type Pessoa = { id: string; nome: string; eh_cliente: boolean; eh_fornecedor: boolean; eh_prestador: boolean }
type Props = {
  tipoInicial: "pagar" | "receber"
  obraInicial: string
  categorias: { id: string; nome: string; tipo: string }[]
  pessoas: Pessoa[]
  obras: { id: string; codigo: string; nome: string }[]
  etapas: { id: string; obra_id: string; codigo: string; nome: string }[]
  hoje: string
}

const classeSelect = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"

export function FormLancamento({ tipoInicial, obraInicial, categorias, pessoas, obras, etapas, hoje }: Props) {
  const [estado, acao] = useActionState(criarLancamento, null)
  useRetornoAcao(estado)
  const e = (c: string) => erroCampo(estado, c)

  const [tipo, setTipo] = useState(tipoInicial)
  const [obraId, setObraId] = useState(obraInicial)
  const [pessoaId, setPessoaId] = useState("")
  const [documento, setDocumento] = useState("")
  const [competencia, setCompetencia] = useState(hoje)
  const [valorTexto, setValorTexto] = useState("")
  const [modo, setModo] = useState<"vista" | "parcelado">("vista")
  const [qtd, setQtd] = useState("2")
  const [primeiro, setPrimeiro] = useState(hoje)
  const [parcelas, setParcelas] = useState<{ vencimento: string; valor: string }[]>([{ vencimento: hoje, valor: "" }])
  const [duplicados, setDuplicados] = useState<Awaited<ReturnType<typeof verificarDuplicidade>>>([])

  const valor = lerNumero(valorTexto)
  const pessoasFiltradas = pessoas.filter((p) => (tipo === "pagar" ? p.eh_fornecedor || p.eh_prestador : p.eh_cliente))
  const etapasObra = etapas.filter((x) => x.obra_id === obraId)

  // Gera as parcelas automaticamente quando valor/modo/quantidade/1º vencimento mudam
  useEffect(() => {
    if (!valor || valor <= 0) return
    const n = modo === "vista" ? 1 : Math.max(2, Math.min(120, Math.floor(lerNumero(qtd) ?? 2)))
    setParcelas(dividirParcelas(valor, n, primeiro).map((p) => ({ vencimento: p.vencimento, valor: numeroParaInput(p.valor) })))
  }, [valor, modo, qtd, primeiro])

  // R-FIN-09: aviso de possível duplicidade (não bloqueia)
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!valor && !(pessoaId && documento)) return setDuplicados([])
      setDuplicados(await verificarDuplicidade({ tipo, pessoa_id: pessoaId || null, documento_numero: documento || null, valor_total: valor, data_competencia: competencia || null }))
    }, 600)
    return () => clearTimeout(t)
  }, [tipo, pessoaId, documento, valor, competencia])

  const lista = useMemo(() => parcelas.map((p) => ({ vencimento: p.vencimento, valor: lerNumero(p.valor) ?? 0 })), [parcelas])
  const soma = somaParcelas(lista)
  const diferenca = valor ? Math.round((valor - soma) * 100) / 100 : 0

  return (
    <form action={acao} className="grid gap-5">
      <ErroFormulario estado={estado} />
      <input type="hidden" name="parcelas" value={JSON.stringify(lista)} />

      <fieldset className="flex gap-2">
        <legend className="sr-only">Tipo</legend>
        {(["pagar", "receber"] as const).map((t) => (
          <label key={t} className={`flex min-h-10 flex-1 cursor-pointer items-center justify-center rounded-md border px-4 text-sm font-medium sm:flex-none ${tipo === t ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>
            <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => (setTipo(t), setPessoaId(""))} className="sr-only" />
            {t === "pagar" ? "Conta a pagar" : "Conta a receber"}
          </label>
        ))}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo rotulo="Descrição" nome="descricao" erro={e("descricao")} obrigatorio className="sm:col-span-2">
          <Input id="descricao" name="descricao" required />
        </Campo>
        <Campo rotulo="Categoria" nome="categoria_id" erro={e("categoria_id")} obrigatorio>
          <select id="categoria_id" name="categoria_id" key={tipo} defaultValue="" className={classeSelect} required>
            <option value="" disabled>
              Selecione…
            </option>
            {categorias
              .filter((c) => c.tipo === (tipo === "pagar" ? "despesa" : "receita"))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
          </select>
        </Campo>
        <Campo rotulo={tipo === "pagar" ? "Fornecedor / prestador" : "Cliente"} nome="pessoa_id" erro={e("pessoa_id")}>
          <select id="pessoa_id" name="pessoa_id" value={pessoaId} onChange={(ev) => setPessoaId(ev.target.value)} className={classeSelect}>
            <option value="">Não informado</option>
            {pessoasFiltradas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo rotulo="Obra" nome="obra_id" className="sm:col-span-2" ajuda={tipo === "pagar" ? "Despesa de obra entra no custo realizado do orçamento." : undefined}>
          <select id="obra_id" name="obra_id" value={obraId} onChange={(ev) => setObraId(ev.target.value)} className={classeSelect}>
            <option value="">Sem obra (administrativo)</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.codigo} — {o.nome}
              </option>
            ))}
          </select>
        </Campo>
        {obraId && (
          <>
            <Campo rotulo="Etapa" nome="etapa_id">
              <select id="etapa_id" name="etapa_id" key={obraId} defaultValue="" className={classeSelect}>
                <option value="">Sem etapa</option>
                {etapasObra.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codigo}. {x.nome}
                  </option>
                ))}
              </select>
            </Campo>
            {tipo === "pagar" && (
              <Campo rotulo="Natureza do custo" nome="natureza" erro={e("natureza")} obrigatorio>
                <select id="natureza" name="natureza" defaultValue="" className={classeSelect} required>
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {Object.entries(NATUREZA).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Campo>
            )}
          </>
        )}
        <Campo rotulo="Nº do documento" nome="documento_numero" ajuda="NF, contrato, recibo">
          <Input id="documento_numero" name="documento_numero" value={documento} onChange={(ev) => setDocumento(ev.target.value)} />
        </Campo>
        <Campo rotulo="Competência" nome="data_competencia" erro={e("data_competencia")} obrigatorio ajuda="Data do fato (compra, serviço).">
          <Input id="data_competencia" name="data_competencia" type="date" value={competencia} onChange={(ev) => setCompetencia(ev.target.value)} required />
        </Campo>
        <Campo rotulo="Valor total (R$)" nome="valor_total" erro={e("valor_total")} obrigatorio>
          <Input id="valor_total" name="valor_total" inputMode="decimal" value={valorTexto} onChange={(ev) => setValorTexto(ev.target.value)} required />
        </Campo>
        <Campo rotulo="Observação" nome="observacao" className="sm:col-span-2 lg:col-span-4">
          <Textarea id="observacao" name="observacao" rows={2} />
        </Campo>
      </div>

      {duplicados.length > 0 && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <p className="flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" /> Possível lançamento duplicado
          </p>
          <ul className="mt-1 list-disc pl-6">
            {duplicados.map((d) => (
              <li key={d.id}>
                <Link href={`/financeiro/${d.id}`} target="_blank" className="underline">
                  {d.descricao}
                </Link>{" "}
                — {moeda(d.valor_total)}, competência {fmtData(d.data_competencia)}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">Confira antes de salvar. Se não for duplicado, pode continuar.</p>
        </div>
      )}

      <fieldset className="grid gap-3 rounded-lg border p-4">
        <legend className="px-1 text-sm font-semibold">Parcelas</legend>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex rounded-md border p-0.5">
            {(["vista", "parcelado"] as const).map((m) => (
              <button key={m} type="button" onClick={() => setModo(m)} className={`rounded px-3 py-1.5 text-sm ${modo === m ? "bg-slate-900 text-white" : ""}`}>
                {m === "vista" ? "À vista" : "Parcelado"}
              </button>
            ))}
          </div>
          {modo === "parcelado" && (
            <div className="w-28">
              <Campo rotulo="Nº de parcelas" nome="qtd_parcelas">
                <Input id="qtd_parcelas" inputMode="numeric" value={qtd} onChange={(ev) => setQtd(ev.target.value)} />
              </Campo>
            </div>
          )}
          <div className="w-44">
            <Campo rotulo={modo === "vista" ? "Vencimento" : "1º vencimento (mensal)"} nome="primeiro_vencimento">
              <Input id="primeiro_vencimento" type="date" value={primeiro} onChange={(ev) => setPrimeiro(ev.target.value)} />
            </Campo>
          </div>
        </div>

        <ul className="grid gap-2">
          {parcelas.map((p, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="w-8 text-sm text-muted-foreground">{i + 1}.</span>
              <Input
                type="date"
                value={p.vencimento}
                aria-label={`Vencimento da parcela ${i + 1}`}
                onChange={(ev) => setParcelas((ps) => ps.map((x, j) => (j === i ? { ...x, vencimento: ev.target.value } : x)))}
                className="w-44"
              />
              <Input
                inputMode="decimal"
                value={p.valor}
                aria-label={`Valor da parcela ${i + 1}`}
                onChange={(ev) => setParcelas((ps) => ps.map((x, j) => (j === i ? { ...x, valor: ev.target.value } : x)))}
                className="w-36"
              />
              {parcelas.length > 1 && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label="Remover parcela" onClick={() => setParcelas((ps) => ps.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setParcelas((ps) => [...ps, { vencimento: ps.at(-1)?.vencimento ?? hoje, valor: "" }])}>
            <Plus /> Parcela
          </Button>
          <p className={`text-sm ${diferenca !== 0 ? "font-medium text-red-700" : "text-muted-foreground"}`}>
            Soma {moeda(soma)}
            {diferenca !== 0 && ` · faltam ${moeda(diferenca)} para fechar o total`}
          </p>
        </div>
        {e("parcelas") && <p className="text-xs font-medium text-red-600">{e("parcelas")}</p>}
      </fieldset>

      <div>
        <BotaoEnviar>Salvar lançamento</BotaoEnviar>
      </div>
    </form>
  )
}
