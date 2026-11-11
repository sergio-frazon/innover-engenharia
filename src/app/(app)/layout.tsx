import { Shell } from "@/components/layout/shell"
import { exigirUsuario } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const usuario = await exigirUsuario()
  const supabase = await createClient()
  const { count } = await supabase
    .from("v_alertas")
    .select("*", { count: "exact", head: true })
    .in("gravidade", ["alta", "media"])

  return (
    <Shell usuario={{ nome: usuario.nome, email: usuario.email, papel: usuario.papel }} alertas={count ?? 0}>
      {children}
    </Shell>
  )
}
