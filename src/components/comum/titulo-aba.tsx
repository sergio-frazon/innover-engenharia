"use client"

import { useLayoutEffect } from "react"

/**
 * Mantém o título da aba enquanto o componente estiver na tela. Usado no 404: quando uma página nega acesso
 * com notFound(), o Next ainda envia o título dela (ex.: "Contas a pagar e receber") depois do conteúdo,
 * e ele sobrescreveria um <title> comum.
 *
 * useLayoutEffect: a limpeza roda junto com a troca de página, antes do título da próxima página aparecer.
 */
export function TituloAba({ titulo }: { titulo: string }) {
  useLayoutEffect(() => {
    const aplicar = () => {
      if (document.title !== titulo) document.title = titulo
    }
    aplicar()
    const observador = new MutationObserver(aplicar)
    observador.observe(document.head, { subtree: true, childList: true, characterData: true })
    return () => observador.disconnect()
  }, [titulo])
  return null
}
