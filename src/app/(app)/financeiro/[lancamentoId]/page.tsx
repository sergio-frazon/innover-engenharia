import Link from "next/link"
import { notFound } from "next/navigation"
import { Cabecalho, Secao } from "@/components/comum/pagina"
import { StatusBadge, TomBadge } from "@/components/comum/status"
import { BaixarArquivo } from "@/components/comum/baixar-arquivo"
import { HistoricoRegistro } from "@/components/comum/historico-registro"
import { RegistrarPagamento } from "@/components/financeiro/registrar-pagamento"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { data, dataHora, moeda } from "@/lib/format"
import { FORMA_PAGAMENTO, NATUREZA, SITUACAO_PARCELA } from "@/lib/rotulos"
import { AcoesLancamento, EstornarBaixa } from "./acoes"

export async function generateMetadata({ params }: { params: Promise<{ lancamentoId: string }> }) {
  const { lancamentoId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(lancamentoId)) return {}
  // O RLS decide: quem não pode ver o lançamento recebe o título genérico
  const supabase = await createClient()
  const { data: l } = await supabase.from("lancamentos").select("descricao").eq("id", lancamentoId).maybeSingle()
  return l ? { title: l.descricao } : {}
}

export default async function DetalheLancamento({ params }: { params: Promise<{ lancamentoId: string }> }) {
  const { lancamentoId } = await params
  const usuario = await exigirPapel("admin", "financeiro", "gestor")
  if (!/^[0-9a-f-]{36}$/i.test(lancamentoId)) notFound()
  const supabase = await createClient()

  const { data: l } = await supabase
    .from("lancamentos")
    .select("*, categoria:categorias_financeiras(nome), obra:obras(id, codigo, nome), etapa:etapas(codigo, nome), pessoa:pessoas(nome)")
    .eq("id", lancamentoId)
    .maybeSingle()
  if (!l) notFound()

  const [{ data: parcelas }, { data: baixas }, { data: categorias }, { data: pessoas }, { data: etapas }] = await Promise.all([
    supabase.from("v_parcelas_situacao").select("*").eq("lancamento_id", l.id).order("numero"),
    supabase
      .from("baixas")
      .select("*, parcela:parcelas!inner(lancamento_id, numero), autor:perfis!baixas_criado_por_fkey(nome)")
      .eq("parcela.lancamento_id", l.id)
      .order("data_pagamento"),
    supabase.from("categorias_financeiras").select("id, nome, tipo").eq("ativo", true).order("nome"),
    supabase.from("pessoas").select("id, nome, eh_cliente, eh_fornecedor, eh_prestador").eq("ativo", true).order("nome"),
    l.obra_id ? supabase.from("etapas").select("id, codigo, nome").eq("obra_id", l.obra_id).order("ordem") : Promise.resolve({ data: [] }),
  ])

  const podeEditar = (usuario.papel === "admin" || usuario.papel === "financeiro") && !l.cancelado
  const temBaixaAtiva = (baixas ?? []).some((b) => !b.estornada)
  const totalPago = (parcelas ?? []).reduce((a, p) => a + Number(p.valor_pago), 0)
  const saldo = (parcelas ?? []).reduce((a, p) => a + Number(p.saldo), 0)

  return (
    <>
      <Cabecalho
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {l.descricao}
            {l.cancelado && <TomBadge tom="cinza">Cancelado</TomBadge>}
          </span>
        }
        descricao={`${l.tipo === "pagar" ? "Conta a pagar" : "Conta a receber"} · ${l.categoria?.nome ?? ""}`}
        trilha={[{ rotulo: "Financeiro", href: usuario.papel === "gestor" ? undefined : `/financeiro?tipo=${l.tipo}` }, { rotulo: "Lançamento" }]}
        acoes={
          <>
            <HistoricoRegistro tabela="lancamentos" registroId={l.id} titulo={l.descricao} />
            {podeEditar && (
              <AcoesLancamento
                lancamento={{ ...l, valor_total: Number(l.valor_total) }}
                parcelas={(parcelas ?? []).map((p) => ({ id: p.id!, numero: p.numero!, vencimento: p.vencimento!, valor: Number(p.valor), pago: Number(p.valor_pago) > 0 }))}
                temBaixaAtiva={temBaixaAtiva}
                categorias={categorias ?? []}
                pessoas={pessoas ?? []}
                etapas={etapas ?? []}
              />
            )}
          </>
        }
      />

      {l.cancelado && (
        <p className="mb-4 rounded-md border bg-slate-50 px-3 py-2 text-sm">Cancelado. Motivo: {l.motivo_cancelamento}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Secao titulo="Dados" className="lg:col-span-1">
          <dl className="grid gap-2 text-sm">
            {[
              ["Valor total", <span key="v" className="font-semibold">{moeda(l.valor_total)}</span>],
              ["Pago", moeda(totalPago)],
              ["Saldo", <span key="s" className="font-semibold">{moeda(saldo)}</span>],
              [l.tipo === "pagar" ? "Fornecedor" : "Cliente", l.pessoa?.nome ?? "—"],
              [
                "Obra",
                l.obra ? (
                  <Link key="o" href={`/obras/${l.obra.id}/financeiro`} className="text-blue-700 hover:underline">
                    {l.obra.codigo} — {l.obra.nome}
                  </Link>
                ) : (
                  "Sem obra (administrativo)"
                ),
              ],
              ["Etapa", l.etapa ? `${l.etapa.codigo}. ${l.etapa.nome}` : "—"],
              ["Natureza", l.natureza ? NATUREZA[l.natureza] : "—"],
              ["Documento", l.documento_numero ?? "—"],
              ["Competência", data(l.data_competencia)],
              ["Observação", l.observacao ?? "—"],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between gap-3 border-b pb-1.5 last:border-0">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </Secao>

        <div className="grid content-start gap-6 lg:col-span-2">
          <Secao titulo="Parcelas">
            <ul className="divide-y">
              {(parcelas ?? []).map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <p className="text-sm font-medium">
                      {p.numero}/{p.total_parcelas} · vence {data(p.vencimento)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {moeda(p.valor)} · pago {moeda(p.valor_pago)} · saldo {moeda(p.saldo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge mapa={SITUACAO_PARCELA} valor={p.situacao} />
                    {podeEditar && ["aberta", "parcial", "vencida"].includes(p.situacao!) && (
                      <RegistrarPagamento
                        compacto
                        parcela={{
                          id: p.id!,
                          descricao: l.descricao,
                          numero: p.numero!,
                          total_parcelas: Number(p.total_parcelas),
                          saldo: Number(p.saldo),
                          tipo: l.tipo,
                          obra_id: l.obra_id,
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Secao>

          <Secao titulo={l.tipo === "pagar" ? "Pagamentos" : "Recebimentos"}>
            {(baixas ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registrado.</p>
            ) : (
              <ul className="divide-y">
                {(baixas ?? []).map((b) => (
                  <li key={b.id} className={`flex flex-wrap items-center justify-between gap-2 py-2 ${b.estornada ? "opacity-60" : ""}`}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {data(b.data_pagamento)} · {moeda(b.valor)} · {FORMA_PAGAMENTO[b.forma]} · parcela {b.parcela.numero}
                        {b.estornada && <TomBadge tom="vermelho" className="ml-2">Estornado</TomBadge>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Number(b.juros_multa) > 0 && `Juros/multa ${moeda(b.juros_multa)} · `}
                        {Number(b.desconto) > 0 && `Desconto ${moeda(b.desconto)} · `}
                        Registrado por {b.autor?.nome ?? "—"} em {dataHora(b.criado_em)}
                        {b.observacao && ` · ${b.observacao}`}
                        {b.estornada && ` · Motivo do estorno: ${b.motivo_estorno}`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {b.comprovante_caminho && (usuario.papel !== "gestor") && <BaixarArquivo bucket="comprovantes" caminho={b.comprovante_caminho} rotulo="Comprovante" />}
                      {podeEditar && !b.estornada && <EstornarBaixa baixaId={b.id} />}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Secao>
        </div>
      </div>
    </>
  )
}
