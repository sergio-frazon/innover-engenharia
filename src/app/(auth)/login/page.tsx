import type { Metadata } from "next"
import { FormLogin } from "./form-login"

export const metadata: Metadata = { title: "Entrar" }

const MOTIVOS: Record<string, string> = {
  inativo: "Seu acesso está desativado. Fale com o administrador.",
  link: "Este link já foi usado ou expirou. Cada link funciona uma única vez: peça um novo.",
}

export default async function PaginaLogin({ searchParams }: { searchParams: Promise<{ voltar?: string; motivo?: string }> }) {
  const { voltar, motivo } = await searchParams
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold">Entrar</h1>
      <p className="mb-6 text-sm text-muted-foreground">Use o e-mail e a senha cadastrados.</p>
      <FormLogin voltar={voltar} aviso={motivo ? MOTIVOS[motivo] : undefined} />
    </>
  )
}
