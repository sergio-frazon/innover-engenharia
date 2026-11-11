import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"

async function sair(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const motivo = request.nextUrl.searchParams.get("motivo")
  const destino = new URL("/login", request.nextUrl.origin)
  if (motivo === "inativo") destino.searchParams.set("motivo", "inativo")
  return NextResponse.redirect(destino, { status: 303 })
}

export const GET = sair
export const POST = sair
