import { Cabecalho } from "@/components/comum/pagina"
import { exigirUsuario } from "@/lib/auth"

export default async function PaginaPainel() {
  const usuario = await exigirUsuario()
  return <Cabecalho titulo={`Olá, ${usuario.nome.split(" ")[0]}`} descricao="Painel em construção." />
}
