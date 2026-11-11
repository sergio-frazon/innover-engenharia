"use client"

import { useEffect } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { Resultado } from "@/lib/acoes"

export function Campo({
  rotulo,
  nome,
  erro,
  ajuda,
  obrigatorio,
  className,
  children,
}: {
  rotulo: string
  nome: string
  erro?: string
  ajuda?: string
  obrigatorio?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={nome}>
        {rotulo}
        {obrigatorio && <span className="text-red-600" aria-hidden> *</span>}
      </Label>
      {children}
      {ajuda && !erro && <p className="text-xs text-muted-foreground">{ajuda}</p>}
      {erro && (
        <p className="text-xs font-medium text-red-600" id={`${nome}-erro`}>
          {erro}
        </p>
      )}
    </div>
  )
}

export function BotaoEnviar({
  children,
  pendente,
  className,
  variant,
  size,
}: {
  children: React.ReactNode
  pendente?: boolean
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
  size?: React.ComponentProps<typeof Button>["size"]
}) {
  const { pending } = useFormStatus()
  const carregando = pendente ?? pending
  return (
    <Button type="submit" disabled={carregando} className={cn("min-h-11 sm:min-h-9", className)} variant={variant} size={size}>
      {carregando && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  )
}

export function ErroFormulario({ estado }: { estado: Resultado | null }) {
  if (!estado || estado.ok) return null
  return (
    <Alert variant="destructive">
      <AlertDescription>{estado.erro}</AlertDescription>
    </Alert>
  )
}

/** Mostra toast de sucesso/erro quando o estado muda e chama onSucesso. */
export function useRetornoAcao(estado: Resultado | null, opcoes: { sucesso?: string; onSucesso?: (r: Resultado) => void } = {}) {
  const { sucesso, onSucesso } = opcoes
  useEffect(() => {
    if (!estado) return
    if (estado.ok) {
      if (sucesso || estado.mensagem) toast.success(estado.mensagem ?? sucesso)
      onSucesso?.(estado)
    } else if (!estado.campos) {
      toast.error(estado.erro)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])
}

export function erroCampo(estado: Resultado | null, campo: string): string | undefined {
  return estado && !estado.ok ? estado.campos?.[campo] : undefined
}
