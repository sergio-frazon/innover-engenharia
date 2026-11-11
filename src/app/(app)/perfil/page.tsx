import type { Metadata } from "next"
import { Cabecalho, Secao } from "@/components/comum/pagina"
import { exigirUsuario } from "@/lib/auth"
import { PAPEIS } from "@/lib/rotulos"
import { FormPerfil, FormSenha } from "./forms"

export const metadata: Metadata = { title: "Meu perfil" }

export default async function PaginaPerfil() {
  const usuario = await exigirUsuario()
  return (
    <>
      <Cabecalho titulo="Meu perfil" descricao={`${usuario.email} · ${PAPEIS[usuario.papel]}`} />
      <div className="grid max-w-2xl gap-6">
        <Secao titulo="Dados pessoais">
          <FormPerfil nome={usuario.nome} telefone={usuario.telefone} />
        </Secao>
        <Secao titulo="Trocar senha">
          <FormSenha />
        </Secao>
      </div>
    </>
  )
}
