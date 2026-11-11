import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { caminhoInterno } from "@/lib/redirecionamento"

// Retorno dos links de e-mail (recuperação de senha — fluxo PKCE com ?code=).
// Convites chegam com os tokens no fragmento (#access_token=...), que o servidor
// não enxerga: nesse caso seguimos para /auth/confirmar, e o navegador mantém o fragmento.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const next = caminhoInterno(searchParams.get("next"))
  const code = searchParams.get("code")

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}${next}`)
    return NextResponse.redirect(`${origin}/login?motivo=link`)
  }

  if (searchParams.get("error")) {
    return NextResponse.redirect(`${origin}/login?motivo=link`)
  }

  return NextResponse.redirect(`${origin}/auth/confirmar?next=${encodeURIComponent(next)}`)
}
