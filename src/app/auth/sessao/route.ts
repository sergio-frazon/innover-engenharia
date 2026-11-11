import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Recebe os tokens do link de convite (lidos do fragmento da URL em /auth/confirmar)
// e grava a sessão em cookies pelo servidor.
export async function POST(request: NextRequest) {
  // Só aceita chamadas da própria página /auth/confirmar (evita outro site logar o navegador em outra conta)
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const corpo = (await request.json().catch(() => null)) as { access_token?: string; refresh_token?: string } | null
  if (!corpo?.access_token || !corpo.refresh_token) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  const supabase = await createClient()
  const { error } = await supabase.auth.setSession({ access_token: corpo.access_token, refresh_token: corpo.refresh_token })
  if (error) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true })
}
