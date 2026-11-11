"use client"

import { useEffect, useRef, useState } from "react"
import { Loader2 } from "lucide-react"
import { caminhoInterno } from "@/lib/redirecionamento"

export default function PaginaConfirmar() {
  const [erro, setErro] = useState<string | null>(null)
  const iniciado = useRef(false)

  useEffect(() => {
    if (iniciado.current) return
    iniciado.current = true

    const destino = caminhoInterno(new URLSearchParams(window.location.search).get("next"))
    const hash = new URLSearchParams(window.location.hash.slice(1))
    const access_token = hash.get("access_token")
    const refresh_token = hash.get("refresh_token")
    // Tira os tokens da barra de endereço/histórico
    window.history.replaceState(null, "", window.location.pathname)

    if (hash.get("error") || !access_token || !refresh_token) {
      setErro("O link é inválido ou expirou. Peça um novo ao administrador.")
      return
    }

    fetch("/auth/sessao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    })
      .then((r) => {
        if (!r.ok) throw new Error()
        window.location.replace(destino)
      })
      .catch(() => setErro("O link é inválido ou expirou. Peça um novo ao administrador."))
  }, [])

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      {erro ? (
        <div className="max-w-sm text-center">
          <p className="text-sm text-red-700">{erro}</p>
          <a href="/login" className="mt-3 inline-block text-sm text-blue-700 hover:underline">
            Ir para o login
          </a>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Confirmando acesso…
        </p>
      )}
    </main>
  )
}
