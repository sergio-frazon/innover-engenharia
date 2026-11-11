"use client"

import { useState, useTransition } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Resultado } from "@/lib/acoes"

/**
 * Botão com confirmação. Se `pedirMotivo`, exige um texto (motivo/comentário)
 * que é passado para a ação.
 */
export function Confirmar({
  gatilho,
  titulo,
  descricao,
  textoConfirmar = "Confirmar",
  destrutivo,
  pedirMotivo,
  rotuloMotivo = "Motivo",
  acao,
  sucesso,
}: {
  gatilho: React.ReactNode
  titulo: string
  descricao?: React.ReactNode
  textoConfirmar?: string
  destrutivo?: boolean
  pedirMotivo?: boolean
  rotuloMotivo?: string
  acao: (motivo: string) => Promise<Resultado>
  sucesso?: string
}) {
  const [aberto, setAberto] = useState(false)
  const [motivo, setMotivo] = useState("")
  const [pendente, iniciar] = useTransition()

  function confirmar(e: React.MouseEvent) {
    e.preventDefault()
    if (pedirMotivo && !motivo.trim()) {
      toast.error(`Informe: ${rotuloMotivo.toLowerCase()}.`)
      return
    }
    iniciar(async () => {
      const r = await acao(motivo.trim())
      if (r.ok) {
        if (sucesso || r.mensagem) toast.success(r.mensagem ?? sucesso)
        setAberto(false)
        setMotivo("")
      } else {
        toast.error(r.erro)
      }
    })
  }

  return (
    <AlertDialog open={aberto} onOpenChange={setAberto}>
      <AlertDialogTrigger asChild>{gatilho}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{titulo}</AlertDialogTitle>
          {descricao && <AlertDialogDescription asChild><div>{descricao}</div></AlertDialogDescription>}
        </AlertDialogHeader>
        {pedirMotivo && (
          <div className="grid gap-1.5">
            <Label htmlFor="motivo-confirmacao">{rotuloMotivo}</Label>
            <Textarea id="motivo-confirmacao" value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={3} autoFocus />
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pendente}>Voltar</AlertDialogCancel>
          <AlertDialogAction
            onClick={confirmar}
            disabled={pendente}
            className={destrutivo ? "bg-red-600 text-white hover:bg-red-700" : undefined}
          >
            {pendente && <Loader2 className="animate-spin" />}
            {textoConfirmar}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
