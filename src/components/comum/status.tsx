import { cn } from "@/lib/utils"
import { CLASSES_TOM, type Tom } from "@/lib/rotulos"

type Mapa = Record<string, { texto: string; tom: Tom }>

export function StatusBadge({ mapa, valor, className }: { mapa: Mapa; valor: string | null | undefined; className?: string }) {
  const r = valor ? mapa[valor] : undefined
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASSES_TOM[r?.tom ?? "cinza"],
        className,
      )}
    >
      {r?.texto ?? valor ?? "—"}
    </span>
  )
}

export function TomBadge({ tom, children, className }: { tom: Tom; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        CLASSES_TOM[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}

export function BarraProgresso({ valor, className, tom = "azul" }: { valor: number; className?: string; tom?: "azul" | "verde" | "vermelho" | "ambar" }) {
  const v = Math.max(0, Math.min(100, Number(valor) || 0))
  const cor = { azul: "bg-blue-600", verde: "bg-emerald-600", vermelho: "bg-red-600", ambar: "bg-amber-500" }[tom]
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-200", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", cor)} style={{ width: `${v}%` }} />
    </div>
  )
}
