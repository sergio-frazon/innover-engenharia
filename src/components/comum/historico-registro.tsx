"use client"

import { useState, useTransition } from "react"
import { History, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { dataHora } from "@/lib/format"
import { ACOES } from "@/lib/auditoria"
import { historicoDoRegistro } from "@/app/(app)/obras/actions"

type Item = Awaited<ReturnType<typeof historicoDoRegistro>>[number]

/** Botão "Histórico" que abre a auditoria de um registro numa gaveta lateral. */
export function HistoricoRegistro({ tabela, registroId, titulo, compacto }: { tabela: string; registroId: string; titulo: string; compacto?: boolean }) {
  const [itens, setItens] = useState<Item[] | null>(null)
  const [pendente, iniciar] = useTransition()

  return (
    <Sheet onOpenChange={(a) => a && iniciar(async () => setItens(await historicoDoRegistro(tabela, registroId)))}>
      <SheetTrigger asChild>
        <Button variant="ghost" size={compacto ? "icon-sm" : "sm"} aria-label="Histórico" title="Histórico">
          <History /> {!compacto && "Histórico"}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Histórico</SheetTitle>
          <SheetDescription>{titulo}</SheetDescription>
        </SheetHeader>
        <div className="px-4 pb-6">
          {pendente || !itens ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Carregando…
            </p>
          ) : itens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
          ) : (
            <ol className="grid gap-3">
              {itens.map((i) => (
                <li key={i.id} className="border-l-2 border-slate-200 pl-3">
                  <p className="text-sm">
                    <span className="font-medium">{i.usuario}</span> {ACOES[i.acao]?.toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">{dataHora(i.em)}</p>
                  <ul className="mt-1 text-xs text-slate-600">
                    {i.mudancas.map((m, k) => (
                      <li key={k}>{m}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
