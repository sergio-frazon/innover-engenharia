import Link from "next/link"
import { EstadoVazio } from "@/components/comum/pagina"
import { exigirPapel } from "@/lib/auth"
import { getObra } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { dataHora } from "@/lib/format"
import { ACOES, NOMES_TABELA, resumoMudancas } from "@/lib/auditoria"

const POR_PAGINA = 50

export default async function HistoricoObra({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>
  searchParams: Promise<{ pagina?: string; tabela?: string }>
}) {
  const { obraId } = await params
  const f = await searchParams
  await exigirPapel("admin", "gestor")
  const obra = await getObra(obraId)
  const pagina = Math.max(1, Number(f.pagina) || 1)
  const supabase = await createClient()

  let consulta = supabase
    .from("auditoria")
    .select("*", { count: "exact" })
    .eq("obra_id", obra.id)
    .order("em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1)
  if (f.tabela) consulta = consulta.eq("tabela", f.tabela)
  const { data: registros, count } = await consulta

  const ids = [...new Set((registros ?? []).map((r) => r.usuario_id).filter(Boolean))] as string[]
  const { data: perfis } = ids.length ? await supabase.from("perfis").select("id, nome").in("id", ids) : { data: [] }
  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]))
  const total = count ?? 0
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA))
  const link = (p: number) => `?${new URLSearchParams({ ...(f.tabela ? { tabela: f.tabela } : {}), pagina: String(p) })}`

  return (
    <div className="grid gap-4">
      <form className="flex flex-wrap gap-2">
        <select name="tabela" defaultValue={f.tabela ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Tipo de registro">
          <option value="">Todos os registros</option>
          {Object.entries(NOMES_TABELA).map(([v, r]) => (
            <option key={v} value={v}>
              {r}
            </option>
          ))}
        </select>
        <button type="submit" className="h-9 rounded-md border bg-white px-3 text-sm hover:bg-slate-50">
          Filtrar
        </button>
      </form>

      {(registros ?? []).length === 0 ? (
        <EstadoVazio titulo="Nenhuma alteração registrada." />
      ) : (
        <ol className="grid gap-2">
          {(registros ?? []).map((r) => {
            const mudancas = resumoMudancas(r.acao, r.antes, r.depois)
            return (
              <li key={r.id} className="rounded-lg border bg-white px-4 py-3">
                <p className="text-sm">
                  <span className="font-medium">{r.usuario_id ? (nomes.get(r.usuario_id) ?? "Usuário") : "Sistema"}</span>{" "}
                  {ACOES[r.acao]?.toLowerCase()} <span className="font-medium">{NOMES_TABELA[r.tabela] ?? r.tabela}</span>
                  <span className="text-muted-foreground"> · {dataHora(r.em)}</span>
                </p>
                {mudancas.length > 0 && (
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {mudancas.slice(0, 8).map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ol>
      )}

      {paginas > 1 && (
        <nav className="flex items-center justify-between text-sm">
          {pagina > 1 ? <Link href={link(pagina - 1)} className="text-blue-700 hover:underline">← Mais recentes</Link> : <span />}
          <span className="text-muted-foreground">
            Página {pagina} de {paginas}
          </span>
          {pagina < paginas ? <Link href={link(pagina + 1)} className="text-blue-700 hover:underline">Mais antigos →</Link> : <span />}
        </nav>
      )}
    </div>
  )
}
