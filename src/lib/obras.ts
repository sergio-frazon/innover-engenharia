import "server-only"
import { cache } from "react"
import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Papel } from "@/lib/rotulos"

/** Obra pelo id; 404 se não existir ou o usuário não tiver acesso (RLS). */
export const getObra = cache(async (obraId: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(obraId)) notFound()
  const supabase = await createClient()
  const { data } = await supabase
    .from("obras")
    .select("*, cliente:pessoas(id, nome), responsavel:perfis!obras_responsavel_id_fkey(id, nome)")
    .eq("id", obraId)
    .maybeSingle()
  if (!data) notFound()
  return data
})

export function obraFechada(situacao: string) {
  return situacao === "concluida" || situacao === "cancelada"
}

/** Pode editar dados da obra/planejamento (R-OBR-03 + perfil) */
export function podeGerirObra(papel: Papel, situacao: string) {
  if (papel === "admin") return true
  return papel === "gestor" && !obraFechada(situacao)
}

export type AbaObra = { href: string; rotulo: string; papeis?: Papel[] }

export function abasDaObra(obraId: string, papel: Papel): AbaObra[] {
  const base = `/obras/${obraId}`
  const abas: AbaObra[] = [
    { href: base, rotulo: "Visão geral" },
    { href: `${base}/planejamento`, rotulo: "Planejamento" },
    { href: `${base}/orcamento`, rotulo: "Orçamento", papeis: ["admin", "gestor", "financeiro"] },
    { href: `${base}/cronograma`, rotulo: "Cronograma" },
    { href: `${base}/diario`, rotulo: "Diário", papeis: ["admin", "gestor", "campo"] },
    { href: `${base}/medicoes`, rotulo: "Medições", papeis: ["admin", "gestor", "campo"] },
    { href: `${base}/documentos`, rotulo: "Documentos" },
    { href: `${base}/financeiro`, rotulo: "Financeiro", papeis: ["admin", "gestor", "financeiro"] },
    { href: `${base}/historico`, rotulo: "Histórico", papeis: ["admin", "gestor"] },
  ]
  return abas.filter((a) => !a.papeis || a.papeis.includes(papel))
}
