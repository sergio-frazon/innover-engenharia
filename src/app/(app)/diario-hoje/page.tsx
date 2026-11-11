import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { Cabecalho, EstadoVazio } from "@/components/comum/pagina"
import { StatusBadge } from "@/components/comum/status"
import { exigirPapel } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { hojeISO } from "@/lib/format"
import { STATUS_DIARIO } from "@/lib/rotulos"

export const metadata: Metadata = { title: "Diário de hoje" }

export default async function DiarioHoje() {
  await exigirPapel("admin", "gestor", "campo")
  const supabase = await createClient()
  const hoje = hojeISO()
  const [{ data: obras }, { data: diarios }] = await Promise.all([
    supabase.from("obras").select("id, codigo, nome").eq("situacao", "em_andamento").order("nome"),
    supabase.from("diarios").select("obra_id, status").eq("data", hoje),
  ])

  if ((obras ?? []).length === 1) redirect(`/obras/${obras![0].id}/diario/${hoje}`)
  const status = new Map((diarios ?? []).map((d) => [d.obra_id, d.status]))

  return (
    <>
      <Cabecalho titulo="Diário de hoje" descricao="Escolha a obra." />
      {(obras ?? []).length === 0 ? (
        <EstadoVazio icone={<ClipboardList className="size-8" />} titulo="Nenhuma obra em andamento para você." />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {(obras ?? []).map((o) => (
            <li key={o.id}>
              <Link href={`/obras/${o.id}/diario/${hoje}`} className="flex min-h-16 items-center justify-between gap-3 rounded-lg border bg-white p-4 hover:border-blue-300">
                <div className="min-w-0">
                  <p className="font-mono text-xs text-muted-foreground">{o.codigo}</p>
                  <p className="truncate font-medium">{o.nome}</p>
                </div>
                {status.has(o.id) ? <StatusBadge mapa={STATUS_DIARIO} valor={status.get(o.id)} /> : <span className="text-sm text-blue-700">Começar</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
