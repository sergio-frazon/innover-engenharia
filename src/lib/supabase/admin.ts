import "server-only"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "./database.types"

// Chave service_role: ignora o RLS. Usar SOMENTE para gestão de usuários (Auth admin),
// sempre depois de conferir que quem chama é admin (exigirPapel("admin")).
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
