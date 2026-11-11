import Link from "next/link"
import { ListTree } from "lucide-react"
import { EstadoVazio } from "@/components/comum/pagina"
import { exigirUsuario } from "@/lib/auth"
import { getObra, podeGerirObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { Planejamento, type EtapaPlan } from "./planejamento"

export default async function PaginaPlanejamento({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const usuario = await exigirUsuario()
  const obra = await getObra(obraId)
  const supabase = await createClient()

  const [{ data: etapas }, { data: servicos }, { data: progresso }, { data: membros }, { data: docs }] = await Promise.all([
    supabase.from("etapas").select("*").eq("obra_id", obra.id).order("ordem").order("codigo"),
    supabase.from("servicos").select("*").eq("obra_id", obra.id).order("ordem").order("codigo"),
    supabase.rpc("progresso_servicos", { p_obra: obra.id }),
    supabase.from("obra_membros").select("perfil:perfis(id, nome)").eq("obra_id", obra.id),
    supabase.from("v_documentos_atuais").select("etapa_id").eq("obra_id", obra.id).not("etapa_id", "is", null),
  ])

  const prog = new Map((progresso ?? []).map((p) => [p.servico_id, p]))
  const pessoas = (membros ?? []).map((m) => m.perfil).filter((p): p is { id: string; nome: string } => !!p)
  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]))
  const docsPorEtapa = new Map<string, number>()
  for (const d of docs ?? []) docsPorEtapa.set(d.etapa_id!, (docsPorEtapa.get(d.etapa_id!) ?? 0) + 1)
  const podeEditar = podeGerirObra(usuario.papel, obra.situacao)

  const lista: EtapaPlan[] = (etapas ?? []).map((e) => ({
    ...e,
    responsavel: e.responsavel_id ? (nomes.get(e.responsavel_id) ?? null) : null,
    documentos: docsPorEtapa.get(e.id) ?? 0,
    servicos: (servicos ?? [])
      .filter((s) => s.etapa_id === e.id)
      .map((s) => {
        const p = prog.get(s.id)
        return {
          ...s,
          responsavel: s.responsavel_id ? (nomes.get(s.responsavel_id) ?? null) : null,
          quantidade_aprovada: Number(p?.quantidade_aprovada ?? 0),
          quantidade_pendente: Number(p?.quantidade_pendente ?? 0),
          percentual: Number(p?.percentual ?? 0),
          peso: p ? Number(p.peso) : null,
          situacao_prazo: p?.situacao_prazo ?? null,
        }
      }),
  }))

  const semPeso = (progresso ?? []).length > 0 && !(progresso ?? []).some((p) => p.peso_pelo_orcamento)

  if (lista.length === 0 && !podeEditar) {
    return <EstadoVazio icone={<ListTree className="size-8" />} titulo="O planejamento ainda não foi montado." />
  }

  return (
    <>
      {semPeso && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Progresso calculado com pesos iguais: aprove um orçamento para ponderar pelo valor.{" "}
          {usuario.papel !== "campo" && (
            <Link href={`/obras/${obra.id}/orcamento`} className="font-medium underline">
              Ir para o orçamento
            </Link>
          )}
        </p>
      )}
      <Planejamento obraId={obra.id} etapas={lista} pessoas={pessoas} podeEditar={podeEditar} podeVerHistorico={usuario.papel === "admin" || usuario.papel === "gestor"} />
    </>
  )
}
