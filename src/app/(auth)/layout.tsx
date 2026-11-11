import { HardHat } from "lucide-react"

export default function LayoutAuth({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-blue-600 text-white">
            <HardHat className="size-6" />
          </div>
          <p className="text-lg font-semibold">Gestão de Obras</p>
        </div>
        <div className="rounded-xl border bg-white p-6 shadow-sm">{children}</div>
      </div>
    </main>
  )
}
