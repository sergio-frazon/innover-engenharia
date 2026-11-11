"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

function Confirmar() {
  const router = useRouter()
  const params = useSearchParams()
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    const next = params.get("next") ?? "/painel"
    const destino = next.startsWith("/") && !next.startsWith("//") ? next : "/painel"
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const access_token = hash.get("access_token")
    const refresh_token = hash.get("refresh_token")

    if (hash.get("error")) {
      setErro("O link é inválido ou expirou. Peça um novo ao administrador.")
      return
    }
    if (!access_token || !refresh_token) {
      router.replace("/login?motivo=link")
      return
    }
    createClient()
      .auth.setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setErro("O link é inválido ou expirou. Peça um novo ao administrador.")
        else {
          window.history.replaceState(null, "", window.location.pathname)
          router.replace(destino)
          router.refresh()
        }
      })
  }, [params, router])

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      {erro ? (
        <p className="max-w-sm text-center text-sm text-red-700">{erro}</p>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Confirmando acesso…
        </p>
      )}
    </main>
  )
}

export default function PaginaConfirmar() {
  return (
    <Suspense>
      <Confirmar />
    </Suspense>
  )
}
