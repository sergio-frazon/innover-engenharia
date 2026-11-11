import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "./database.types"

const ROTAS_PUBLICAS = ["/login", "/recuperar-senha", "/auth"]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )

  // Não colocar código entre createServerClient e getUser (renovação da sessão).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const caminho = request.nextUrl.pathname
  const publica = ROTAS_PUBLICAS.some((r) => caminho === r || caminho.startsWith(r + "/"))

  if (!user && !publica) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.search = caminho === "/" || caminho === "/painel" ? "" : `?voltar=${encodeURIComponent(caminho)}`
    return NextResponse.redirect(url)
  }

  if (user && caminho === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/painel"
    url.search = ""
    return NextResponse.redirect(url)
  }

  return response
}
