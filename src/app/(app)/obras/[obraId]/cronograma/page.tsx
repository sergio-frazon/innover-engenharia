import { CalendarRange } from "lucide-react"
import { EstadoVazio } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { exigirUsuario } from "@/lib/auth"
import { getObra, podeGerirObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { dataHora, hojeISO } from "@/lib/format"
import { STATUS_VERSAO } from "@/lib/rotulos"
import { BotoesCronograma, CriarPrimeiroCronograma, Gantt, SeletorVersaoCronograma, type LinhaGantt } from "./gantt"

export default async function PaginaCronograma({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>
  searchParams: Promise<{ v?: string }>
}) {
  const { obraId } = await params
  const f = await searchParams
  const usuario = await exigirUsuario()
  const obra = await getObra(obraId)
  const supabase = await createClient()
  const podeEditar = podeGerirObra(usuario.papel, obra.situacao) && usuario.papel !== "financeiro"

  const { data: versoes } = await supabase
    .from("cronograma_versoes")
    .select("*, aprovador:perfis!cronograma_versoes_aprovada_por_fkey(nome)")
    .eq("obra_id", obra.id)
    .order("numero", { ascending: false })

  if (!versoes || versoes.length === 0) {
    return (
      <EstadoVazio
        icone={<CalendarRange className="size-8" />}
        titulo="Esta obra ainda não tem cronograma aprovado."
        descricao={podeEditar ? "Defina as datas previstas de cada serviço e as dependências entre eles. Depois de aprovado, o cronograma vira a referência para medir atrasos." : undefined}
        acao={podeEditar && <CriarPrimeiroCronograma obraId={obra.id} />}
      />
    )
  }

  const aprovada = versoes.find((v) => v.status === "aprovada")
  const rascunho = versoes.find((v) => v.status === "rascunho")
  const versao = versoes.find((v) => v.id === f.v) ?? aprovada ?? rascunho ?? versoes[0]
  const editavel = podeEditar && versao.status === "rascunho"

  const [{ data: etapas }, { data: servicos }, { data: atividades }, { data: deps }, { data: progresso }, baseline] = await Promise.all([
    supabase.from("etapas").select("id, codigo, nome, ordem").eq("obra_id", obra.id).eq("ativo", true).order("ordem").order("codigo"),
    supabase.from("servicos").select("id, etapa_id, codigo, descricao, ordem, ativo").eq("obra_id", obra.id).order("ordem").order("codigo"),
    supabase.from("cronograma_atividades").select("*").eq("versao_id", versao.id),
    supabase.from("cronograma_dependencias").select("servico_id, predecessor_id").eq("versao_id", versao.id),
    supabase.rpc("progresso_servicos", { p_obra: obra.id }),
    aprovada && versao.id !== aprovada.id
      ? supabase.from("cronograma_atividades").select("servico_id, inicio_previsto, fim_previsto").eq("versao_id", aprovada.id)
      : Promise.resolve({ data: [] as { servico_id: string; inicio_previsto: string; fim_previsto: string }[] }),
  ])

  const ativ = new Map((atividades ?? []).map((a) => [a.servico_id, a]))
  const base = new Map((baseline.data ?? []).map((a) => [a.servico_id, a]))
  const prog = new Map((progresso ?? []).map((p) => [p.servico_id, p]))
  const codigo = new Map((servicos ?? []).map((s) => [s.id, s.codigo]))

  const linhas: LinhaGantt[] = []
  for (const e of etapas ?? []) {
    const doEtapa = (servicos ?? []).filter((s) => s.etapa_id === e.id && (s.ativo || ativ.has(s.id)))
    if (doEtapa.length === 0) continue
    linhas.push({ tipo: "etapa", id: e.id, titulo: `${e.codigo}. ${e.nome}` })
    for (const s of doEtapa) {
      const a = ativ.get(s.id)
      const p = prog.get(s.id)
      const b = base.get(s.id)
      linhas.push({
        tipo: "servico",
        id: s.id,
        etapaId: e.id,
        codigo: s.codigo,
        titulo: s.descricao,
        inicio: a?.inicio_previsto ?? null,
        fim: a?.fim_previsto ?? null,
        duracao: a?.duracao_dias ?? null,
        baselineInicio: b?.inicio_previsto ?? null,
        baselineFim: b?.fim_previsto ?? null,
        inicioReal: p?.data_inicio_real ?? null,
        fimReal: p?.data_fim_real ?? null,
        percentual: Number(p?.percentual_limitado ?? 0),
        situacao: versao.status === "aprovada" ? (p?.situacao_prazo ?? null) : null,
        predecessores: (deps ?? []).filter((d) => d.servico_id === s.id).map((d) => d.predecessor_id),
        dependeDe: (deps ?? [])
          .filter((d) => d.servico_id === s.id)
          .map((d) => codigo.get(d.predecessor_id) ?? "")
          .join(", "),
      })
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <SeletorVersaoCronograma
            base={`/obras/${obra.id}/cronograma`}
            atual={versao.id}
            versoes={versoes.map((v) => ({ id: v.id, numero: v.numero, status: v.status, descricao: v.descricao }))}
          />
          <StatusBadge mapa={STATUS_VERSAO} valor={versao.status} />
          {versao.aprovada_em && (
            <span className="text-sm text-muted-foreground">
              Aprovado em {dataHora(versao.aprovada_em)} por {versao.aprovador?.nome ?? "—"}
            </span>
          )}
        </div>
        <BotoesCronograma obraId={obra.id} versao={{ id: versao.id, numero: versao.numero, status: versao.status }} rascunhoId={rascunho?.id} podeEditar={podeEditar} />
      </div>
      {versao.status === "rascunho" && aprovada && (
        <p className="text-sm text-muted-foreground">O contorno tracejado mostra as datas da versão aprovada (v{aprovada.numero}).</p>
      )}
      <Gantt
        obraId={obra.id}
        versaoId={versao.id}
        linhas={linhas}
        editavel={editavel}
        hoje={hojeISO()}
        mostrarReal={versao.status === "aprovada"}
      />
    </div>
  )
}
