import Link from "next/link"
import { AlertTriangle, ClipboardList } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Indicador, Secao } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { GraficoEtapas } from "@/components/obras/grafico-etapas"
import { exigirUsuario, temPapel } from "@/lib/auth"
import { getObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { data, moeda, percentual } from "@/lib/format"
import { SITUACAO_PRAZO } from "@/lib/rotulos"

export default async function PainelObra({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const usuario = await exigirUsuario()
  const obra = await getObra(obraId)
  const supabase = await createClient()
  const veCusto = temPapel(usuario, "admin", "gestor", "financeiro")

  const [{ data: servicos }, { data: etapas }, { data: resumo }, custo] = await Promise.all([
    supabase.rpc("progresso_servicos", { p_obra: obra.id }),
    supabase.rpc("progresso_etapas", { p_obra: obra.id }),
    supabase.rpc("progresso_obras").eq("obra_id", obra.id).maybeSingle(),
    veCusto ? supabase.from("v_custo_obra").select("*").eq("obra_id", obra.id).maybeSingle() : Promise.resolve({ data: null }),
  ])

  const lista = servicos ?? []
  const atencao = lista.filter((s) => ["atrasado", "inicio_atrasado", "em_risco"].includes(s.situacao_prazo))
  const semItem = lista.filter((s) => s.sem_item_orcamento)
  const pesosIguais = lista.length > 0 && !lista.some((s) => s.peso_pelo_orcamento)
  const c = custo.data
  const difPositiva = Number(c?.diferenca ?? 0) > 0
  const pendencias = (resumo?.diarios_pendentes ?? 0) + (resumo?.medicoes_pendentes ?? 0)

  return (
    <div className="grid gap-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador rotulo="Avanço físico" valor={percentual(resumo?.avanco_fisico ?? 0)} detalhe={`${lista.length} serviço(s) ativo(s)`} />
        <Indicador
          rotulo="Serviços atrasados"
          valor={resumo?.servicos_atrasados ?? 0}
          tom={(resumo?.servicos_atrasados ?? 0) > 0 ? "vermelho" : undefined}
          detalhe={(resumo?.servicos_em_risco ?? 0) > 0 ? `${resumo?.servicos_em_risco} em risco` : "Pelo cronograma aprovado"}
          href={`/obras/${obra.id}/cronograma`}
        />
        {veCusto ? (
          <Indicador
            rotulo="Realizado × orçado"
            valor={moeda(c?.custo_realizado ?? 0)}
            tom={difPositiva ? "vermelho" : undefined}
            detalhe={
              <>
                Orçado {moeda(c?.valor_orcado ?? 0)}
                {c?.diferenca_pct !== null && c?.diferenca_pct !== undefined && (
                  <span className={difPositiva ? "font-medium text-red-700" : "text-emerald-700"}>
                    {" "}
                    ({Number(c.diferenca_pct) > 0 ? "+" : ""}
                    {percentual(c.diferenca_pct)})
                  </span>
                )}
              </>
            }
            href={`/obras/${obra.id}/financeiro`}
          />
        ) : (
          <Indicador rotulo="Início real" valor={data(obra.data_inicio_real)} detalhe={`Previsto ${data(obra.data_inicio_prevista)}`} />
        )}
        <Indicador
          rotulo="Pendências de revisão"
          valor={pendencias}
          tom={pendencias > 0 ? "ambar" : undefined}
          detalhe={`${resumo?.diarios_pendentes ?? 0} diário(s) · ${resumo?.medicoes_pendentes ?? 0} medição(ões)`}
          href={temPapel(usuario, "admin", "gestor", "campo") ? `/obras/${obra.id}/medicoes` : undefined}
        />
      </div>

      {(pesosIguais || semItem.length > 0) && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {pesosIguais && <p>Progresso calculado com pesos iguais: aprove um orçamento para ponderar pelo valor.</p>}
          {semItem.length > 0 && (
            <p>
              {semItem.length} serviço(s) sem item no orçamento aprovado (peso zero): {semItem.map((s) => s.codigo).join(", ")}.
            </p>
          )}
        </div>
      )}

      {temPapel(usuario, "campo") && obra.situacao === "em_andamento" && (
        <Button asChild size="lg" className="min-h-12">
          <Link href={`/obras/${obra.id}/diario/hoje`}>
            <ClipboardList /> Diário de hoje
          </Link>
        </Button>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Secao titulo="Avanço por etapa" className="lg:col-span-3">
          {(etapas ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma etapa cadastrada.{" "}
              {temPapel(usuario, "admin", "gestor") && (
                <Link href={`/obras/${obra.id}/planejamento`} className="text-blue-700 hover:underline">
                  Montar o planejamento
                </Link>
              )}
            </p>
          ) : (
            <GraficoEtapas etapas={(etapas ?? []).map((e) => ({ nome: `${e.codigo}. ${e.nome}`, avanco: Number(e.avanco) }))} />
          )}
        </Secao>

        <Secao titulo="Atenção" className="lg:col-span-2">
          {atencao.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum serviço atrasado ou em risco.</p>
          ) : (
            <ul className="grid gap-2">
              {atencao.map((s) => (
                <li key={s.servico_id} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {s.codigo} {s.descricao}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {percentual(s.percentual)} executado · término previsto {data(s.fim_previsto)}
                    </p>
                  </div>
                  <StatusBadge mapa={SITUACAO_PRAZO} valor={s.situacao_prazo} />
                </li>
              ))}
            </ul>
          )}
        </Secao>
      </div>

      {obra.descricao && (
        <Secao titulo="Sobre a obra">
          <p className="text-sm whitespace-pre-line">{obra.descricao}</p>
          {(obra.endereco || obra.cidade) && (
            <p className="mt-2 text-sm text-muted-foreground">
              {[obra.endereco, obra.cidade, obra.uf].filter(Boolean).join(", ")}
            </p>
          )}
        </Secao>
      )}
    </div>
  )
}
