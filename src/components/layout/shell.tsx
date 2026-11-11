"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Bell,
  Boxes,
  Building2,
  ClipboardList,
  HardHat,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Tags,
  Truck,
  User,
  UserCog,
  Users,
  Wallet,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { PAPEIS, type Papel } from "@/lib/rotulos"
import { menuDoPapel } from "./navegacao"

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  painel: LayoutDashboard,
  obras: Building2,
  diario: ClipboardList,
  alertas: Bell,
  financeiro: Wallet,
  fluxo: LineChart,
  pessoas: Users,
  profissionais: HardHat,
  materiais: Boxes,
  equipamentos: Truck,
  categorias: Tags,
  usuarios: UserCog,
}

type Props = {
  usuario: { nome: string; email: string; papel: Papel }
  alertas: number
  children: React.ReactNode
}

function ativo(caminho: string, href: string) {
  if (href === "/financeiro") return caminho === "/financeiro" || /^\/financeiro\/(?!fluxo-caixa)/.test(caminho)
  return caminho === href || caminho.startsWith(href + "/")
}

function ListaMenu({ papel, alertas, aoNavegar }: { papel: Papel; alertas: number; aoNavegar?: () => void }) {
  const caminho = usePathname()
  return (
    <nav className="flex flex-col gap-5 px-3 py-4">
      {menuDoPapel(papel).map((grupo, i) => (
        <div key={i}>
          {grupo.titulo && <p className="mb-1 px-2 text-xs font-medium tracking-wide text-slate-500 uppercase">{grupo.titulo}</p>}
          <ul className="flex flex-col gap-0.5">
            {grupo.itens.map((item) => {
              const Icone = ICONES[item.icone] ?? LayoutDashboard
              const sel = ativo(caminho, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={aoNavegar}
                    aria-current={sel ? "page" : undefined}
                    className={cn(
                      "flex min-h-10 items-center gap-3 rounded-md px-2 text-sm font-medium transition-colors",
                      sel ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icone className="size-4 shrink-0" />
                    <span className="flex-1">{item.rotulo}</span>
                    {item.icone === "alertas" && alertas > 0 && (
                      <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">{alertas}</span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function MenuUsuario({ usuario }: { usuario: Props["usuario"] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-start gap-3 px-2 py-2 text-left">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700">
            {usuario.nome.charAt(0).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{usuario.nome}</span>
            <span className="block truncate text-xs text-muted-foreground">{PAPEIS[usuario.papel]}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{usuario.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/perfil">
            <User /> Meu perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <form action="/auth/sair" method="post" className="w-full">
            <button type="submit" className="flex w-full items-center gap-2">
              <LogOut className="size-4" /> Sair
            </button>
          </form>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Shell({ usuario, alertas, children }: Props) {
  const [aberto, setAberto] = useState(false)
  const caminho = usePathname()
  const atalhos = [
    { href: "/painel", rotulo: "Painel", Icone: LayoutDashboard },
    { href: "/obras", rotulo: "Obras", Icone: Building2 },
    ...(usuario.papel === "financeiro"
      ? [{ href: "/financeiro", rotulo: "Contas", Icone: Wallet }]
      : [{ href: "/diario-hoje", rotulo: "Diário", Icone: ClipboardList }]),
    { href: "/alertas", rotulo: "Alertas", Icone: Bell },
  ]

  return (
    <div className="min-h-dvh bg-slate-50 print:bg-white">
      {/* Computador */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-white lg:flex print:hidden">
        <Link href="/painel" className="flex h-14 items-center gap-2 border-b px-5 font-semibold">
          <HardHat className="size-5 text-blue-600" /> Gestão de Obras
        </Link>
        <div className="flex-1 overflow-y-auto">
          <ListaMenu papel={usuario.papel} alertas={alertas} />
        </div>
        <div className="border-t p-2">
          <MenuUsuario usuario={usuario} />
        </div>
      </aside>

      {/* Celular: topo */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-white px-2 lg:hidden print:hidden">
        <Button variant="ghost" size="icon-lg" onClick={() => setAberto(true)} aria-label="Abrir menu">
          <Menu className="size-5" />
        </Button>
        <Link href="/painel" className="flex items-center gap-2 font-semibold">
          <HardHat className="size-5 text-blue-600" /> Gestão de Obras
        </Link>
      </header>
      <Sheet open={aberto} onOpenChange={setAberto}>
        <SheetContent side="left" className="w-72 gap-0 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <HardHat className="size-5 text-blue-600" /> Gestão de Obras
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            <ListaMenu papel={usuario.papel} alertas={alertas} aoNavegar={() => setAberto(false)} />
          </div>
          <div className="border-t p-2">
            <MenuUsuario usuario={usuario} />
          </div>
        </SheetContent>
      </Sheet>

      <main className="px-4 pt-5 pb-24 sm:px-6 lg:ml-64 lg:px-8 lg:pt-8 lg:pb-10 print:m-0 print:p-0">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t bg-white pb-[env(safe-area-inset-bottom)] lg:hidden print:hidden">
        {atalhos.map(({ href, rotulo, Icone }) => {
          const sel = ativo(caminho, href)
          return (
            <Link
              key={href}
              href={href}
              className={cn("relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs", sel ? "text-blue-700" : "text-slate-600")}
            >
              <Icone className="size-5" />
              {rotulo}
              {href === "/alertas" && alertas > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 rounded-full bg-red-600 px-1.5 text-[10px] font-semibold text-white">{alertas}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
