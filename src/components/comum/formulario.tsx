"use client"

import { createContext, useContext, useEffect, useRef, useTransition } from "react"
import { useFormStatus } from "react-dom"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import type { Resultado } from "@/lib/acoes"

/** Rótulo + controle + mensagem de erro do campo, com `aria` ligando o erro ao input. */
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

const FormularioPendente = createContext<boolean | undefined>(undefined)

/**
 * <form> ligado a uma Server Action via `useActionState`.
 *
 * Com `<form action={...}>` o React 19 limpa todos os campos ao fim de QUALQUER envio, inclusive quando o
 * servidor recusa (CPF inválido, duplicidade...), e a pessoa perde o que digitou. Aqui o envio passa por
 * `onSubmit` + `startTransition`, e os campos só são limpos quando o resultado é de sucesso.
 */
export function Formulario({
  acao,
  estado,
  limparAoSalvar = true,
  ref,
  ...props
}: Omit<React.ComponentProps<"form">, "action" | "onSubmit"> & {
  acao: (dados: FormData) => void
  estado: Resultado | null
  limparAoSalvar?: boolean
}) {
  const interno = useRef<HTMLFormElement | null>(null)
  const [pendente, iniciar] = useTransition()

  useEffect(() => {
    if (estado?.ok && limparAoSalvar) interno.current?.reset()
  }, [estado, limparAoSalvar])

  function aoEnviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const submissor = (e.nativeEvent as SubmitEvent).submitter
    const dados = new FormData(e.currentTarget, submissor)
    iniciar(() => acao(dados))
  }

  function ligarRef(no: HTMLFormElement | null) {
    interno.current = no
    if (typeof ref === "function") ref(no)
    else if (ref) ref.current = no
  }

  return (
    <FormularioPendente.Provider value={pendente}>
      <form ref={ligarRef} onSubmit={aoEnviar} {...props} />
    </FormularioPendente.Provider>
  )
}

/** Botão de envio que se desabilita e mostra "carregando" enquanto o formulário está sendo enviado. */
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
  const doFormulario = useContext(FormularioPendente)
  const carregando = pendente ?? doFormulario ?? pending
  return (
    <Button type="submit" disabled={carregando} className={cn("min-h-11 sm:min-h-9", className)} variant={variant} size={size}>
      {carregando && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  )
}

/** Erro geral do formulário (o que não pertence a um campo específico). */
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
    // Só reage a um novo resultado da action; as opções mudam a cada render e não devem disparar o toast de novo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado])
}

/** Mensagem de erro de um campo, para passar ao <Campo erro={...}>. */
export function erroCampo(estado: Resultado | null, campo: string): string | undefined {
  return estado && !estado.ok ? estado.campos?.[campo] : undefined
}
