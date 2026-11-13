"use client"

import { useActionState, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Formulario, BotaoEnviar, Campo, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { salvarPerfil, trocarSenha } from "./actions"

export function FormPerfil({ nome, telefone }: { nome: string; telefone: string | null }) {
  const [estado, acao] = useActionState(salvarPerfil, null)
  useRetornoAcao(estado)
  return (
    <Formulario acao={acao} estado={estado} limparAoSalvar={false} className="grid gap-4 sm:grid-cols-2">
      <Campo rotulo="Nome" nome="nome" erro={erroCampo(estado, "nome")} obrigatorio>
        <Input id="nome" name="nome" defaultValue={nome} required />
      </Campo>
      <Campo rotulo="Telefone" nome="telefone">
        <Input id="telefone" name="telefone" defaultValue={telefone ?? ""} inputMode="tel" />
      </Campo>
      <div className="sm:col-span-2">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </Formulario>
  )
}

export function FormSenha() {
  const ref = useRef<HTMLFormElement>(null)
  const [estado, acao] = useActionState(trocarSenha, null)
  useRetornoAcao(estado, { onSucesso: () => ref.current?.reset() })
  return (
    <Formulario ref={ref} acao={acao} estado={estado} className="grid gap-4 sm:grid-cols-3">
      <Campo rotulo="Senha atual" nome="senha_atual" erro={erroCampo(estado, "senha_atual")}>
        <Input id="senha_atual" name="senha_atual" type="password" autoComplete="current-password" required />
      </Campo>
      <Campo rotulo="Nova senha" nome="senha" erro={erroCampo(estado, "senha")}>
        <Input id="senha" name="senha" type="password" autoComplete="new-password" minLength={8} required />
      </Campo>
      <Campo rotulo="Confirmação" nome="confirmacao" erro={erroCampo(estado, "confirmacao")}>
        <Input id="confirmacao" name="confirmacao" type="password" autoComplete="new-password" minLength={8} required />
      </Campo>
      <div className="sm:col-span-3">
        <BotaoEnviar>Alterar senha</BotaoEnviar>
      </div>
    </Formulario>
  )
}
