"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import type { Resultado } from "@/lib/acoes"

/**
 * Roda uma Server Action de clique único (remover, mover, aprovar...) dentro de uma transição
 * e mostra o resultado: erro sempre, sucesso só quando a action devolve mensagem.
 * `pendente` serve para desabilitar os botões enquanto a action roda.
 */
export function useAcao() {
  const [pendente, iniciar] = useTransition()

  function executar(acao: Promise<Resultado>, aoConcluir?: (r: Extract<Resultado, { ok: true }>) => void) {
    iniciar(async () => {
      const r = await acao
      if (!r.ok) {
        toast.error(r.erro)
        return
      }
      if (r.mensagem) toast.success(r.mensagem)
      aoConcluir?.(r)
    })
  }

  return { pendente, executar }
}
