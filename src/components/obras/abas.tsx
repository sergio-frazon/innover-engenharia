"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AbasObra({ abas, base }: { abas: { href: string; rotulo: string }[]; base: string }) {
  const caminho = usePathname()
  return (
    <nav aria-label="Seções da obra" className="-mx-4 mb-6 overflow-x-auto overflow-y-hidden border-b px-4 [scrollbar-width:thin] sm:mx-0 sm:px-0 print:hidden">
      <ul className="flex min-w-max gap-1">
        {abas.map((a) => {
          const ativo = a.href === base ? caminho === base || caminho === `${base}/editar` : caminho.startsWith(a.href)
          return (
            <li key={a.href}>
              <Link
                href={a.href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "-mb-px inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  ativo ? "border-blue-500 font-semibold text-slate-900" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900",
                )}
              >
                {a.rotulo}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
