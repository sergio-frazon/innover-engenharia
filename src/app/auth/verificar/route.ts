import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

const TIPOS: EmailOtpType[] = ["invite", "recovery"]

// Links dos e-mails de convite e de recuperação (templates em supabase/templates).
// O token_hash é validado aqui no servidor, então o link funciona em qualquer navegador,
// não só naquele em que a recuperação foi pedida.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null

  if (token_hash && type && TIPOS.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) return NextResponse.redirect(`${origin}/redefinir-senha`)
    console.error("Verificação de link:", error.message)
  }
  return NextResponse.redirect(`${origin}/login?motivo=link`)
}
