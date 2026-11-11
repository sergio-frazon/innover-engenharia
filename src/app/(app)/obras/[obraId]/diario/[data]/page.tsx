import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EstadoVazio } from "@/components/comum/pagina"
import { exigirPapel } from "@/lib/auth"
import { getObra, obraFechada } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { data as fmtData, hojeISO, somarDias } from "@/lib/format"
import { CriarDiario, DiarioEditor, type DadosDiario } from "./editor"

export default async function PaginaDiario({ params }: { params: Promise<{ obraId: string; data: string }> }) {
  const { obraId, data: dataParam } = await params
  const usuario = await exigirPapel("admin", "gestor", "campo")
  const obra = await getObra(obraId)
  const hoje = hojeISO()
  if (dataParam === "hoje") redirect(`/obras/${obra.id}/diario/${hoje}`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataParam)) notFound()
  const dia = dataParam

  const supabase = await createClient()
  const { data: diario } = await supabase
    .from("diarios")
    .select(
      "*, autor:perfis!diarios_criado_por_fkey(nome), enviador:perfis!diarios_enviado_por_fkey(nome), revisor:perfis!diarios_revisado_por_fkey(nome)",
    )
    .eq("obra_id", obra.id)
    .eq("data", dia)
    .maybeSingle()

  const navegacao = (
    <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
      <Button asChild variant="ghost" size="sm">
        <Link href={`/obras/${obra.id}/diario/${somarDias(dia, -1)}`}>
          <ChevronLeft /> {fmtData(somarDias(dia, -1))}
        </Link>
      </Button>
      <Link href={`/obras/${obra.id}/diario`} className="text-sm text-blue-700 hover:underline">
        Todos os diários
      </Link>
      {dia < hoje ? (
        <Button asChild variant="ghost" size="sm">
          <Link href={`/obras/${obra.id}/diario/${somarDias(dia, 1)}`}>
            {fmtData(somarDias(dia, 1))} <ChevronRight />
          </Link>
        </Button>
      ) : (
        <span className="w-24" />
      )}
    </div>
  )

  if (!diario) {
    const podeCriar = dia <= hoje && (!obraFechada(obra.situacao) || usuario.papel === "admin")
    return (
      <>
        {navegacao}
        {podeCriar ? (
          <CriarDiario obraId={obra.id} data={dia} hoje={dia === hoje} />
        ) : (
          <EstadoVazio titulo={dia > hoje ? "Não é possível registrar diário em data futura." : "Não há diário nesta data."} />
        )}
      </>
    )
  }

  const [equipe, materiais, equipamentos, ocorrencias, medicoes, profissionais, catMateriais, catEquipamentos, progresso] = await Promise.all([
    supabase.from("diario_equipe").select("*, profissional:profissionais(nome)").eq("diario_id", diario.id).order("criado_em"),
    supabase.from("diario_materiais").select("*, servico:servicos(codigo)").eq("diario_id", diario.id).order("criado_em"),
    supabase.from("diario_equipamentos").select("*").eq("diario_id", diario.id).order("criado_em"),
    supabase.from("diario_ocorrencias").select("*").eq("diario_id", diario.id).order("hora", { nullsFirst: false }).order("criado_em"),
    supabase.from("medicoes").select("*, servico:servicos(codigo, descricao, unidade)").eq("diario_id", diario.id).order("criado_em"),
    supabase.from("profissionais").select("id, nome, funcao").eq("ativo", true).order("nome"),
    supabase.from("materiais").select("id, descricao, unidade").eq("ativo", true).order("descricao"),
    supabase.from("equipamentos").select("id, descricao, identificacao").eq("ativo", true).order("descricao"),
    supabase.rpc("progresso_servicos", { p_obra: obra.id }),
  ])

  let editadoAposAprovacao: { quem: string; quando: string } | null = null
  if (diario.status === "aprovado" && diario.revisado_em && (usuario.papel === "admin" || usuario.papel === "gestor")) {
    const { data: aud } = await supabase
      .from("auditoria")
      .select("em, usuario_id")
      .eq("obra_id", obra.id)
      .eq("acao", "UPDATE")
      .gt("em", diario.revisado_em)
      .or(`registro_id.eq.${diario.id},depois->>diario_id.eq.${diario.id},antes->>diario_id.eq.${diario.id}`)
      .order("em", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (aud) {
      const { data: p } = aud.usuario_id ? await supabase.from("perfis").select("nome").eq("id", aud.usuario_id).maybeSingle() : { data: null }
      editadoAposAprovacao = { quem: p?.nome ?? "Usuário", quando: aud.em }
    }
  }

  const fechada = obraFechada(obra.situacao) && usuario.papel !== "admin"
  const gestor = usuario.papel === "admin" || usuario.papel === "gestor"
  const podeEditar = !fechada && (gestor || ["rascunho", "correcao_solicitada"].includes(diario.status))

  const dados: DadosDiario = {
    diario: {
      ...diario,
      autor: diario.autor?.nome ?? null,
      enviador: diario.enviador?.nome ?? null,
      revisor: diario.revisor?.nome ?? null,
    },
    equipe: (equipe.data ?? []).map((e) => ({ ...e, profissional: e.profissional?.nome ?? null })),
    materiais: (materiais.data ?? []).map((m) => ({ ...m, servico: m.servico?.codigo ?? null })),
    equipamentos: equipamentos.data ?? [],
    ocorrencias: ocorrencias.data ?? [],
    medicoes: (medicoes.data ?? []).map((m) => ({
      ...m,
      servico: m.servico ? `${m.servico.codigo} ${m.servico.descricao}` : "",
      unidade: m.servico?.unidade ?? "",
    })),
    profissionais: profissionais.data ?? [],
    catMateriais: catMateriais.data ?? [],
    catEquipamentos: catEquipamentos.data ?? [],
    servicos: (progresso.data ?? []).map((s) => ({
      id: s.servico_id,
      titulo: `${s.codigo} ${s.descricao}`,
      unidade: s.unidade,
      prevista: Number(s.quantidade_prevista),
      aprovada: Number(s.quantidade_aprovada),
      pendente: Number(s.quantidade_pendente),
    })),
  }

  return (
    <>
      {navegacao}
      <DiarioEditor
        obraId={obra.id}
        dados={dados}
        podeEditar={podeEditar}
        gestor={gestor && !fechada}
        meuId={usuario.id}
        editadoAposAprovacao={editadoAposAprovacao}
      />
    </>
  )
}
