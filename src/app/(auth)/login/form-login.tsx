"use client"

import Link from "next/link"
import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo } from "@/components/comum/formulario"
import { entrar } from "../actions"

export function FormLogin({ voltar, aviso }: { voltar?: string; aviso?: string }) {
  const [estado, acao] = useActionState(entrar, null)
  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4">
      {aviso && !estado && (
        <Alert>
          <AlertDescription>{aviso}</AlertDescription>
        </Alert>
      )}
      <ErroFormulario estado={estado} />
      <input type="hidden" name="voltar" value={voltar ?? ""} />
      <Campo rotulo="E-mail" nome="email" erro={erroCampo(estado, "email")}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus />
      </Campo>
      <Campo rotulo="Senha" nome="senha" erro={erroCampo(estado, "senha")}>
        <Input id="senha" name="senha" type="password" autoComplete="current-password" required />
      </Campo>
      <BotaoEnviar className="w-full">Entrar</BotaoEnviar>
      <Link href="/recuperar-senha" className="text-center text-sm text-blue-700 hover:underline">
        Esqueci minha senha
      </Link>
    </Formulario>
  )
}
