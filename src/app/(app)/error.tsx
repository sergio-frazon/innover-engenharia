"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function ErroApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border bg-white px-6 py-16 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Não foi possível carregar esta página. Tente de novo; se o problema continuar, avise o administrador.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  )
}
