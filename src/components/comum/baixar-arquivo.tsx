"use client"

import { useTransition } from "react"
import { Download, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { linkDeDownload } from "@/app/(app)/obras/[obraId]/documentos/actions"

/** Botão que pede ao servidor um link assinado de 60 s e abre o download. */
export function BaixarArquivo({
  bucket,
  caminho,
  rotulo = "Baixar",
  compacto,
}: {
  bucket: "documentos" | "comprovantes"
  caminho: string
  rotulo?: string
  compacto?: boolean
}) {
  const [pendente, iniciar] = useTransition()
  return (
    <Button
      variant="outline"
      size={compacto ? "icon-sm" : "sm"}
      aria-label={rotulo}
      title={rotulo}
      disabled={pendente}
      onClick={() =>
        iniciar(async () => {
          const r = await linkDeDownload(bucket, caminho)
          if (r.ok && r.url) window.location.href = r.url
          else if (!r.ok) toast.error(r.erro)
        })
      }
    >
      {pendente ? <Loader2 className="animate-spin" /> : <Download />}
      {!compacto && rotulo}
    </Button>
  )
}
