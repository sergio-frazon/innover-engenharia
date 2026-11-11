import type { Metadata } from "next"
import Link from "next/link"
import { Building2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cabecalho, EstadoVazio } from "@/components/comum/pagina"
import { BarraProgresso, StatusBadge } from "@/components/comum/status"
import { exigirUsuario, temPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { data, percentual } from "@/lib/format"
import { SITUACAO_OBRA } from "@/lib/rotulos"

export const metadata: Metadata = { title: "Obras" }

type Filtros = { q?: string; situacao?: string; responsavel?: string; de?: string; ate?: string }

const classeSelect = "h-9 rounded-md border border-input bg-white px-3 text-sm shadow-xs"

export default async function PaginaObras({ searchParams }: { searchParams: Promise<Filtros> }) {
  const usuario = await exigirUsuario()
  const f = await searchParams
  const supabase = await createClient()

  let consulta = supabase
    .from("obras")
    .select("id, codigo, nome, situacao, data_inicio_prevista, data_fim_prevista, cliente:pessoas(nome), responsavel:perfis!obras_responsavel_id_fkey(id, nome)")
    .order("codigo", { ascending: false })
  if (f.situacao) consulta = consulta.eq("situacao", f.situacao)
  if (f.responsavel) consulta = consulta.eq("responsavel_id", f.responsavel)
  // Período: obras cujo intervalo previsto cruza o período
  if (f.de) consulta = consulta.or(`data_fim_prevista.gte.${f.de},data_fim_prevista.is.null`)
  if (f.ate) consulta = consulta.or(`data_inicio_prevista.lte.${f.ate},data_inicio_prevista.is.null`)

  const [{ data: obras }, { data: progresso }, { data: responsaveis }] = await Promise.all([
    consulta,
    supabase.rpc("progresso_obras"),
    supabase.from("perfis").select("id, nome").in("papel", ["admin", "gestor"]).order("nome"),
  ])

  const prog = new Map((progresso ?? []).map((p) => [p.obra_id, p]))
  const t = (f.q ?? "").trim().toLowerCase()
  const lista = (obras ?? []).filter(
    (o) => !t || o.nome.toLowerCase().includes(t) || o.codigo.toLowerCase().includes(t) || (o.cliente?.nome ?? "").toLowerCase().includes(t),
  )
  const filtrando = Object.values(f).some(Boolean)

  return (
    <>
      <Cabecalho
        titulo="Obras"
        acoes={
          temPapel(usuario, "admin", "gestor") && (
            <Button asChild>
              <Link href="/obras/nova">
                <Plus /> Nova obra
              </Link>
            </Button>
          )
        }
      />

      <form className="mb-4 grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <Input name="q" defaultValue={f.q} placeholder="Nome, código ou cliente" className="lg:col-span-2" />
        <select name="situacao" defaultValue={f.situacao ?? ""} className={classeSelect} aria-label="Situação">
          <option value="">Todas as situações</option>
          {Object.entries(SITUACAO_OBRA).map(([v, r]) => (
            <option key={v} value={v}>
              {r.texto}
            </option>
          ))}
        </select>
        <select name="responsavel" defaultValue={f.responsavel ?? ""} className={classeSelect} aria-label="Responsável">
          <option value="">Todos os responsáveis</option>
          {(responsaveis ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>
        <div className="flex gap-2 lg:col-span-2">
          <Input type="date" name="de" defaultValue={f.de} aria-label="Período de" />
          <Input type="date" name="ate" defaultValue={f.ate} aria-label="Período até" />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          {filtrando && (
            <Button asChild variant="ghost">
              <Link href="/obras">Limpar filtros</Link>
            </Button>
          )}
        </div>
      </form>

      {lista.length === 0 ? (
        <EstadoVazio
          icone={<Building2 className="size-8" />}
          titulo={filtrando ? "Nenhuma obra encontrada com esses filtros." : "Nenhuma obra ainda."}
          descricao={filtrando ? undefined : "Cadastre a primeira obra para começar o planejamento."}
          acao={
            !filtrando &&
            temPapel(usuario, "admin", "gestor") && (
              <Button asChild>
                <Link href="/obras/nova">
                  <Plus /> Cadastrar obra
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((o) => {
            const p = prog.get(o.id)
            const atrasados = p?.servicos_atrasados ?? 0
            return (
              <li key={o.id}>
                <Link href={`/obras/${o.id}`} className="block h-full rounded-lg border bg-white p-4 transition-colors hover:border-blue-300">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-muted-foreground">{o.codigo}</p>
                      <p className="truncate font-semibold">{o.nome}</p>
                      <p className="truncate text-sm text-muted-foreground">{o.cliente?.nome ?? "Sem cliente"}</p>
                    </div>
                    <StatusBadge mapa={SITUACAO_OBRA} valor={o.situacao} />
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <BarraProgresso valor={Number(p?.avanco_fisico ?? 0)} tom={atrasados > 0 ? "ambar" : "azul"} />
                    <span className="w-14 text-right text-sm font-medium tabular-nums">{percentual(p?.avanco_fisico ?? 0)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>Resp.: {o.responsavel?.nome}</span>
                    <span>
                      {data(o.data_inicio_prevista)} – {data(o.data_fim_prevista)}
                    </span>
                    {atrasados > 0 && <span className="font-medium text-red-700">{atrasados} serviço(s) atrasado(s)</span>}
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
