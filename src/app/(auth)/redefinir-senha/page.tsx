import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { getUsuario } from "@/lib/auth"
import { FormRedefinirSenha } from "./form-redefinir"

export const metadata: Metadata = { title: "Definir senha" }

export default async function PaginaRedefinirSenha() {
  const usuario = await getUsuario()
  if (!usuario) redirect("/login?motivo=link")
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Definir nova senha</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Olá, {usuario.nome.split(" ")[0]}. Escolha uma senha com pelo menos 8 caracteres.
      </p>
      <FormRedefinirSenha />
    </>
  )
}
