"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { BotaoEnviar, Campo, ErroFormulario, erroCampo } from "@/components/comum/formulario"
import { redefinirSenha } from "../actions"

export function FormRedefinirSenha() {
  const [estado, acao] = useActionState(redefinirSenha, null)
  return (
    <form action={acao} className="grid gap-4">
      <ErroFormulario estado={estado} />
      <Campo rotulo="Nova senha" nome="senha" erro={erroCampo(estado, "senha")}>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} required autoFocus />
      </Campo>
      <Campo rotulo="Confirme a nova senha" nome="confirmacao" erro={erroCampo(estado, "confirmacao")}>
        <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
      </Campo>
      <BotaoEnviar className="w-full">Salvar senha</BotaoEnviar>
    </form>
  )
}
