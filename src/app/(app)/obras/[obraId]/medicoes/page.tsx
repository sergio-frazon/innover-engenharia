import Link from "next/link"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { exigirPapel } from "@/lib/auth"
import { getObra, obraFechada } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { hojeISO } from "@/lib/format"
import { STATUS_MEDICAO } from "@/lib/rotulos"
import { cn } from "@/lib/utils"
import { ListaMedicoes, NovaMedicao, type LinhaMedicao } from "./lista"

type Filtros = { aba?: string; servico?: string; status?: string; de?: string; ate?: string; origem?: string }

export default async function PaginaMedicoes({ params, searchParams }: { params: Promise<{ obraId: string }>; searchParams: Promise<Filtros> }) {
  const { obraId } = await params
  const f = await searchParams
  const usuario = await exigirPapel("admin", "gestor", "campo")
  const obra = await getObra(obraId)
  const gestor = usuario.papel === "admin" || usuario.papel === "gestor"
  const aba = f.aba === "todas" || !gestor ? "todas" : "pendentes"
  const supabase = await createClient()

  let consulta = supabase
    .from("medicoes")
    .select(
      "*, servico:servicos(codigo, descricao, unidade), diario:diarios(data, status), autor:perfis!medicoes_criado_por_fkey(nome), revisor:perfis!medicoes_revisado_por_fkey(nome)",
    )
    .eq("obra_id", obra.id)
    .order("periodo_fim", { ascending: false })
    .order("criado_em", { ascending: false })
    .limit(300)
  if (aba === "pendentes") consulta = consulta.eq("status", "enviada")
  if (f.status && aba === "todas") consulta = consulta.eq("status", f.status)
  if (f.servico) consulta = consulta.eq("servico_id", f.servico)
  if (f.origem) consulta = consulta.eq("origem", f.origem)
  if (f.de) consulta = consulta.gte("periodo_fim", f.de)
  if (f.ate) consulta = consulta.lte("periodo_inicio", f.ate)

  const [{ data: medicoes }, { data: progresso }] = await Promise.all([consulta, supabase.rpc("progresso_servicos", { p_obra: obra.id })])

  const linhas: LinhaMedicao[] = (medicoes ?? []).map((m) => ({
    ...m,
    servico: m.servico ? `${m.servico.codigo} ${m.servico.descricao}` : "",
    unidade: m.servico?.unidade ?? "",
    diario_data: m.diario?.data ?? null,
    diario_status: m.diario?.status ?? null,
    autor: m.autor?.nome ?? null,
    revisor: m.revisor?.nome ?? null,
    aprovavel: m.status === "enviada" && (!m.diario_id || m.diario?.status === "aprovado"),
  }))
  const servicos = (progresso ?? []).map((s) => ({
    id: s.servico_id,
    titulo: `${s.codigo} ${s.descricao}`,
    unidade: s.unidade,
    prevista: Number(s.quantidade_prevista),
    aprovada: Number(s.quantidade_aprovada),
    pendente: Number(s.quantidade_pendente),
  }))
  const base = `/obras/${obra.id}/medicoes`
  const podeLancar = !obraFechada(obra.situacao) || usuario.papel === "admin"
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString()

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {gestor ? (
          <nav className="flex gap-1">
            {[
              { id: "pendentes", rotulo: "Aguardando aprovação" },
              { id: "todas", rotulo: "Todas" },
            ].map((a) => (
              <Link
                key={a.id}
                href={`${base}?aba=${a.id}`}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", aba === a.id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                {a.rotulo}
              </Link>
            ))}
          </nav>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`${base}/csv?${qs}`}>
              <Download /> CSV
            </a>
          </Button>
          {podeLancar && <NovaMedicao obraId={obra.id} servicos={servicos} hoje={hojeISO()} />}
        </div>
      </div>

      <form className="grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2 lg:grid-cols-6">
        <input type="hidden" name="aba" value={aba} />
        <select name="servico" defaultValue={f.servico ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm lg:col-span-2" aria-label="Serviço">
          <option value="">Todos os serviços</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.titulo}
            </option>
          ))}
        </select>
        {aba === "todas" && (
          <select name="status" defaultValue={f.status ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Situação">
            <option value="">Todas as situações</option>
            {Object.entries(STATUS_MEDICAO).map(([k, v]) => (
              <option key={k} value={k}>
                {v.texto}
              </option>
            ))}
          </select>
        )}
        <select name="origem" defaultValue={f.origem ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Origem">
          <option value="">Diário e avulsas</option>
          <option value="diario">Do diário</option>
          <option value="manual">Avulsas</option>
        </select>
        <Input type="date" name="de" defaultValue={f.de} aria-label="De" />
        <Input type="date" name="ate" defaultValue={f.ate} aria-label="Até" />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          <Button asChild variant="ghost">
            <Link href={`${base}?aba=${aba}`}>Limpar</Link>
          </Button>
        </div>
      </form>

      <ListaMedicoes obraId={obra.id} linhas={linhas} gestor={gestor && podeLancar} meuId={usuario.id} servicos={servicos} pendentes={aba === "pendentes"} />
    </div>
  )
}
