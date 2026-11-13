import { Logo } from "@/components/comum/logo"

/**
 * Telas de acesso. A cobertura da logo da Innover, em escala grande, abriga o formulário:
 * é o único momento "de marca" do sistema; dentro dele a interface fica sóbria.
 */
export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center overflow-hidden bg-background px-4 pb-10">
      <svg
        aria-hidden
        viewBox="0 0 1000 260"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34vh] min-h-48 w-full"
      >
        <polygon points="0,150 500,24 1000,132 1000,212 500,104 0,232" className="fill-blue-500" />
      </svg>

      <div className="relative mt-[22vh] w-full max-w-sm">
        <div className="rounded-md border bg-white p-6 shadow-[0_1px_0_oklch(0.255_0.032_250/0.06),0_12px_32px_-12px_oklch(0.255_0.032_250/0.25)]">
          <div className="mb-5 flex items-end justify-between gap-3 border-b pb-4">
            <Logo className="h-12" prioridade />
            <p className="pb-0.5 text-sm font-medium text-muted-foreground">Gestão de Obras</p>
          </div>
          {children}
        </div>
      </div>
    </main>
  )
}
