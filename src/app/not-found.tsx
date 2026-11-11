import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-sm font-medium text-blue-700">404</p>
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="max-w-sm text-sm text-muted-foreground">A página não existe ou você não tem acesso a ela.</p>
      <Button asChild className="mt-2">
        <Link href="/painel">Voltar ao painel</Link>
      </Button>
    </main>
  )
}
