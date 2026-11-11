import { Logo } from "@/components/comum/logo"

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <Logo className="h-20" prioridade />
          <p className="text-sm font-medium text-muted-foreground">Gestão de Obras</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  )
}
