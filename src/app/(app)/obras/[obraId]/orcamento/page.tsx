import Link from "next/link"
import { Calculator } from "lucide-react"
import { EstadoVazio, Secao } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { exigirPapel } from "@/lib/auth"
import { getObra, podeGerirObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { dataHora, moeda, percentual } from "@/lib/format"
import { NATUREZA, STATUS_VERSAO } from "@/lib/rotulos"
import { cn } from "@/lib/utils"
import { AcoesVersao, CriarPrimeiraVersao, ItensOrcamento, SeletorVersao, type EtapaOrc } from "./orcamento"

function Dif({ valor, pct }: { valor: number; pct?: number | null }) {
  const cor = valor > 0 ? "text-red-700" : valor < 0 ? "text-emerald-700" : "text-muted-foreground"
  return (
    <span className={cn("tabular-nums", cor)}>
      {valor > 0 ? "+" : ""}
      {moeda(valor)}
      {pct !== null && pct !== undefined && ` (${pct > 0 ? "+" : ""}${percentual(pct)})`}
    </span>
  )
}

export default async function PaginaOrcamento({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>
  searchParams: Promise<{ v?: string; aba?: string }>
}) {
  const { obraId } = await params
  const f = await searchParams
  const usuario = await exigirPapel("admin", "gestor", "financeiro")
  const obra = await getObra(obraId)
  const supabase = await createClient()
  const podeEditar = podeGerirObra(usuario.papel, obra.situacao) && usuario.papel !== "financeiro"

  const { data: versoes } = await supabase
    .from("orcamento_versoes")
    .select("*, aprovador:perfis!orcamento_versoes_aprovada_por_fkey(nome)")
    .eq("obra_id", obra.id)
    .order("numero", { ascending: false })

  if (!versoes || versoes.length === 0) {
    return (
      <EstadoVazio
        icone={<Calculator className="size-8" />}
        titulo="Esta obra ainda não tem orçamento."
        descricao="O orçamento é montado por serviço (materiais, mão de obra, equipamentos) e, depois de aprovado, define o peso de cada serviço no avanço da obra."
        acao={podeEditar && <CriarPrimeiraVersao obraId={obra.id} />}
      />
    )
  }

  const aprovada = versoes.find((v) => v.status === "aprovada")
  const rascunho = versoes.find((v) => v.status === "rascunho")
  const versao = versoes.find((v) => v.id === f.v) ?? aprovada ?? rascunho ?? versoes[0]
  const aba = f.aba === "comparar" ? "comparar" : "itens"
  const base = `/obras/${obra.id}/orcamento`

  const [{ data: itens }, { data: etapas }, { data: servicos }, { data: materiais }, { data: totServ }, { data: totEtapa }] = await Promise.all([
    supabase.from("orcamento_itens").select("*").eq("versao_id", versao.id).order("ordem").order("criado_em"),
    supabase.from("etapas").select("id, codigo, nome, ordem").eq("obra_id", obra.id).order("ordem").order("codigo"),
    supabase.from("servicos").select("id, etapa_id, codigo, descricao, unidade, quantidade_prevista, ordem, ativo").eq("obra_id", obra.id).order("ordem").order("codigo"),
    supabase.from("materiais").select("id, descricao, unidade, custo_unitario").eq("ativo", true).order("descricao"),
    supabase.from("v_orcamento_totais_servico").select("*").in("versao_id", [versao.id, ...(aprovada && rascunho ? [aprovada.id, rascunho.id] : [])]),
    supabase.from("v_orcamento_totais_etapa").select("*").eq("versao_id", versao.id),
  ])

  const editavel = podeEditar && versao.status === "rascunho"
  const totalServico = new Map((totServ ?? []).filter((t) => t.versao_id === versao.id).map((t) => [t.servico_id, Number(t.total)]))
  const totalEtapa = new Map((totEtapa ?? []).map((t) => [t.etapa_id, Number(t.total)]))
  const totalGeral = (totEtapa ?? []).reduce((a, t) => a + Number(t.total), 0)

  const estrutura: EtapaOrc[] = (etapas ?? [])
    .map((e) => ({
      id: e.id,
      titulo: `${e.codigo}. ${e.nome}`,
      total: totalEtapa.get(e.id) ?? 0,
      servicos: (servicos ?? [])
        .filter((s) => s.etapa_id === e.id && (s.ativo || (itens ?? []).some((i) => i.servico_id === s.id)))
        .map((s) => ({
          id: s.id,
          titulo: `${s.codigo} ${s.descricao}`,
          detalhe: `${Number(s.quantidade_prevista).toLocaleString("pt-BR")} ${s.unidade}`,
          total: totalServico.get(s.id) ?? 0,
          itens: (itens ?? []).filter((i) => i.servico_id === s.id),
        })),
    }))
    .filter((e) => e.servicos.length > 0)

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-center lg:justify-between print:hidden">
        <div className="flex flex-wrap items-center gap-2">
          <SeletorVersao base={base} atual={versao.id} versoes={versoes.map((v) => ({ id: v.id, numero: v.numero, status: v.status, descricao: v.descricao }))} />
          <StatusBadge mapa={STATUS_VERSAO} valor={versao.status} />
          {versao.aprovada_em && (
            <span className="text-sm text-muted-foreground">
              Aprovada em {dataHora(versao.aprovada_em)} por {versao.aprovador?.nome ?? "—"}
            </span>
          )}
        </div>
        <AcoesVersao
          obraId={obra.id}
          versao={{ id: versao.id, numero: versao.numero, status: versao.status }}
          temRascunho={!!rascunho}
          rascunhoId={rascunho?.id}
          podeEditar={podeEditar}
          csv={`${base}/csv?v=${versao.id}`}
        />
      </div>

      <nav className="flex gap-1 print:hidden">
        {[
          { id: "itens", rotulo: "Itens" },
          { id: "comparar", rotulo: "Comparar" },
        ].map((a) => (
          <Link
            key={a.id}
            href={`${base}?v=${versao.id}&aba=${a.id}`}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", aba === a.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      <div className="hidden print:block">
        <h2 className="text-lg font-semibold">
          Orçamento {obra.codigo} — {obra.nome} — versão {versao.numero} ({STATUS_VERSAO[versao.status].texto})
        </h2>
      </div>

      {aba === "itens" ? (
        <ItensOrcamento
          obraId={obra.id}
          versaoId={versao.id}
          editavel={editavel}
          etapas={estrutura}
          servicosAtivos={(servicos ?? []).filter((s) => s.ativo).map((s) => ({ id: s.id, titulo: `${s.codigo} ${s.descricao}`, unidade: s.unidade, quantidade: Number(s.quantidade_prevista) }))}
          materiais={(materiais ?? []).map((m) => ({ ...m, custo_unitario: m.custo_unitario === null ? null : Number(m.custo_unitario) }))}
          totalGeral={totalGeral}
        />
      ) : (
        <Comparacao obraId={obra.id} aprovadaId={aprovada?.id} rascunhoId={rascunho?.id} totServ={totServ ?? []} servicos={servicos ?? []} etapas={etapas ?? []} />
      )}
    </div>
  )
}

async function Comparacao({
  obraId,
  aprovadaId,
  rascunhoId,
  totServ,
  servicos,
  etapas,
}: {
  obraId: string
  aprovadaId?: string
  rascunhoId?: string
  totServ: { versao_id: string | null; servico_id: string | null; total: number | null }[]
  servicos: { id: string; codigo: string; descricao: string }[]
  etapas: { id: string; codigo: string; nome: string }[]
}) {
  const supabase = await createClient()
  const { data: custo } = await supabase.from("v_custo_previsto_realizado").select("*").eq("obra_id", obraId)
  const nomeEtapa = new Map(etapas.map((e) => [e.id, `${e.codigo}. ${e.nome}`]))

  const linhasRevisao =
    aprovadaId && rascunhoId
      ? servicos
          .map((s) => {
            const a = Number(totServ.find((t) => t.versao_id === aprovadaId && t.servico_id === s.id)?.total ?? 0)
            const r = Number(totServ.find((t) => t.versao_id === rascunhoId && t.servico_id === s.id)?.total ?? 0)
            return { s, a, r, d: r - a }
          })
          .filter((l) => l.a !== 0 || l.r !== 0)
      : []

  const somaPrev = (custo ?? []).reduce((a, c) => a + Number(c.previsto), 0)
  const somaReal = (custo ?? []).reduce((a, c) => a + Number(c.realizado), 0)

  return (
    <div className="grid gap-6">
      <Secao titulo="Rascunho × versão aprovada">
        {linhasRevisao.length === 0 ? (
          <p className="text-sm text-muted-foreground">Disponível quando existe um rascunho de revisão e uma versão aprovada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-2 font-medium">Serviço</th>
                  <th className="px-2 py-2 text-right font-medium">Aprovada</th>
                  <th className="px-2 py-2 text-right font-medium">Rascunho</th>
                  <th className="py-2 pl-2 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {linhasRevisao.map(({ s, a, r, d }) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      {s.codigo} {s.descricao}
                    </td>
                    <td className="px-2 py-2 text-right tabular-nums">{moeda(a)}</td>
                    <td className="px-2 py-2 text-right tabular-nums">{moeda(r)}</td>
                    <td className="py-2 pl-2 text-right">
                      <Dif valor={d} pct={a ? (d / a) * 100 : null} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      <Secao titulo="Orçado (versão aprovada) × realizado">
        {(custo ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem orçamento aprovado nem despesas lançadas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-2 pr-2 font-medium">Etapa</th>
                  <th className="px-2 py-2 font-medium">Natureza</th>
                  <th className="px-2 py-2 text-right font-medium">Orçado</th>
                  <th className="px-2 py-2 text-right font-medium">Realizado</th>
                  <th className="py-2 pl-2 text-right font-medium">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {(custo ?? [])
                  .sort((x, y) => (nomeEtapa.get(x.etapa_id ?? "") ?? "zz").localeCompare(nomeEtapa.get(y.etapa_id ?? "") ?? "zz") || (x.natureza ?? "").localeCompare(y.natureza ?? ""))
                  .map((c, i) => (
                    <tr key={i} className="border-b last:border-0">
                      <td className="py-2 pr-2">{c.etapa_id ? nomeEtapa.get(c.etapa_id) : "Sem etapa"}</td>
                      <td className="px-2 py-2">{NATUREZA[c.natureza ?? "outro"]}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{moeda(c.previsto)}</td>
                      <td className="px-2 py-2 text-right tabular-nums">{moeda(c.realizado)}</td>
                      <td className="py-2 pl-2 text-right">
                        <Dif valor={Number(c.diferenca)} pct={c.diferenca_pct === null ? null : Number(c.diferenca_pct)} />
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot>
                <tr className="border-t font-semibold">
                  <td className="py-2 pr-2" colSpan={2}>
                    Total
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums">{moeda(somaPrev)}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{moeda(somaReal)}</td>
                  <td className="py-2 pl-2 text-right">
                    <Dif valor={somaReal - somaPrev} pct={somaPrev ? ((somaReal - somaPrev) / somaPrev) * 100 : null} />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Realizado = despesas lançadas no financeiro para a obra, pela data de competência (não pela data de pagamento).</p>
      </Secao>
    </div>
  )
}
