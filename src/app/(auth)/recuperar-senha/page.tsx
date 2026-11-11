"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { BotaoEnviar, Campo, ErroFormulario, erroCampo } from "@/components/comum/formulario"
import { recuperarSenha } from "../actions"

export default function PaginaRecuperarSenha() {
  const [estado, acao] = useActionState(recuperarSenha, null)
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Recuperar senha</h1>
      <p className="mb-6 text-sm text-muted-foreground">Enviaremos um link para você criar uma nova senha.</p>
      {estado?.ok ? (
        <Alert>
          <AlertDescription>{estado.mensagem}</AlertDescription>
        </Alert>
      ) : (
        <form action={acao} className="grid gap-4">
          <ErroFormulario estado={estado} />
          <Campo rotulo="E-mail" nome="email" erro={erroCampo(estado, "email")}>
            <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
          </Campo>
          <BotaoEnviar className="w-full">Enviar link</BotaoEnviar>
        </form>
      )}
      <Link href="/login" className="mt-4 block text-center text-sm text-blue-700 hover:underline">
        Voltar para o login
      </Link>
    </>
  )
}
