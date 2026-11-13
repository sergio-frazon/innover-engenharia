import Link from "next/link"
import { Button } from "@/components/ui/button"
import { TituloAba } from "@/components/comum/titulo-aba"

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      {/* Sem isto a aba mostraria o título da página negada (ex.: "Contas a pagar e receber") */}
      <TituloAba titulo="Página não encontrada · Innover Engenharia" />
      <p className="text-sm font-medium text-blue-700">404</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">A página não existe ou você não tem acesso a ela.</p>
      <Button asChild className="mt-2">
        <Link href="/painel">Voltar ao painel</Link>
      </Button>
    </main>
  )
}
