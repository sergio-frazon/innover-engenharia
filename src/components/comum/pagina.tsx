import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/** Título da página com descrição e botões de ação à direita. */
export function Cabecalho({
  titulo,
  descricao,
  trilha,
  acoes,
  className,
}: {
  titulo: React.ReactNode
  descricao?: React.ReactNode
  trilha?: { rotulo: string; href?: string }[]
  acoes?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        {trilha && trilha.length > 0 && (
          <nav aria-label="Trilha" className="mb-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {trilha.map((t, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" />}
                {t.href ? (
                  <Link href={t.href} className="hover:text-foreground hover:underline">
                    {t.rotulo}
                  </Link>
                ) : (
                  <span>{t.rotulo}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-[1.75rem] leading-tight font-bold text-balance text-slate-900">{titulo}</h1>
        {descricao && <div className="mt-1 text-sm text-muted-foreground">{descricao}</div>}
      </div>
      {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
    </div>
  )
}

/** Lista vazia: explica o motivo e, se fizer sentido, oferece a ação para começar. */
export function EstadoVazio({
  titulo,
  descricao,
  acao,
  icone,
}: {
  titulo: string
  descricao?: string
  acao?: React.ReactNode
  icone?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      {icone && <div className="mb-3 text-muted-foreground">{icone}</div>}
      <p className="font-medium">{titulo}</p>
      {descricao && <p className="mt-1 max-w-md text-sm text-muted-foreground">{descricao}</p>}
      {acao && <div className="mt-4">{acao}</div>}
    </div>
  )
}

/** Bloco com título (cartão branco) para agrupar conteúdo da página. */
export function Secao({
  titulo,
  acoes,
  children,
  className,
}: {
  titulo?: React.ReactNode
  acoes?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("rounded-md border bg-white", className)}>
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          {titulo && <h2 className="text-[1.05rem] font-bold text-slate-900">{titulo}</h2>}
          {acoes && <div className="flex flex-wrap gap-2">{acoes}</div>}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Número de destaque do painel; com `href`, vira link para a lista correspondente. */
export function Indicador({
  rotulo,
  valor,
  detalhe,
  tom,
  href,
}: {
  rotulo: string
  valor: React.ReactNode
  detalhe?: React.ReactNode
  tom?: "vermelho" | "verde" | "ambar"
  href?: string
}) {
  const corValor = tom === "vermelho" ? "text-red-700" : tom === "verde" ? "text-emerald-700" : tom === "ambar" ? "text-amber-700" : ""
  const conteudo = (
    <div className={cn("@container h-full rounded-md border border-l-[3px] bg-white p-4 transition-colors", href ? "border-l-blue-500 hover:border-slate-300 hover:border-l-blue-600" : "border-l-slate-300")}>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      {/* O tamanho acompanha a largura do cartão: valores em R$ não podem estourar em grades de 4 colunas */}
      <p className={cn("mt-1 font-[family-name:var(--font-display)] text-[clamp(1.15rem,13cqi,1.7rem)] leading-tight font-bold whitespace-nowrap tabular-nums [font-stretch:88%]", corValor)}>{valor}</p>
      {detalhe && <div className="mt-1 text-xs text-muted-foreground">{detalhe}</div>}
    </div>
  )
  return href ? (
    <Link href={href} className="block h-full">
      {conteudo}
    </Link>
  ) : (
    conteudo
  )
}
