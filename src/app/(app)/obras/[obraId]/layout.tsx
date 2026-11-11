import Link from "next/link"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/comum/status"
import { AbasObra } from "@/components/obras/abas"
import { exigirUsuario } from "@/lib/auth"
import { abasDaObra, getObra, obraFechada, podeGerirObra } from "@/lib/obras"
import { data } from "@/lib/format"
import { SITUACAO_OBRA } from "@/lib/rotulos"

export async function generateMetadata({ params }: { params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const obra = await getObra(obraId)
  return { title: obra.nome }
}

export default async function LayoutObra({ children, params }: { children: React.ReactNode; params: Promise<{ obraId: string }> }) {
  const { obraId } = await params
  const usuario = await exigirUsuario()
  const obra = await getObra(obraId)
  const base = `/obras/${obra.id}`

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between print:hidden">
        <div className="min-w-0">
          <nav className="mb-1 text-sm text-muted-foreground">
            <Link href="/obras" className="hover:underline">
              Obras
            </Link>{" "}
            / <span className="font-mono">{obra.codigo}</span>
          </nav>
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {obra.nome} <StatusBadge mapa={SITUACAO_OBRA} valor={obra.situacao} />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {obra.cliente?.nome ?? "Sem cliente"} · Responsável: {obra.responsavel?.nome} · Previsto {data(obra.data_inicio_prevista)} a{" "}
            {data(obra.data_fim_prevista)}
          </p>
        </div>
        {(usuario.papel === "admin" || usuario.papel === "gestor") && (
          <Button asChild variant="outline">
            <Link href={`${base}/editar`}>
              <Pencil /> Editar obra
            </Link>
          </Button>
        )}
      </div>
      {obraFechada(obra.situacao) && (
        <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 print:hidden">
          Obra {SITUACAO_OBRA[obra.situacao].texto.toLowerCase()}: somente leitura
          {podeGerirObra(usuario.papel, obra.situacao) ? " (você é administrador e pode reabri-la)." : "."}
        </p>
      )}
      <AbasObra abas={abasDaObra(obra.id, usuario.papel)} base={base} />
      {children}
    </>
  )
}
