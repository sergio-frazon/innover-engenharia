"use client"

import { useState, useTransition } from "react"
import { Trash2, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Confirmar } from "@/components/comum/confirmar"
import { TomBadge } from "@/components/comum/status"
import { PAPEIS, type Papel } from "@/lib/rotulos"
import { adicionarMembro, removerMembro } from "@/app/(app)/obras/actions"

type Pessoa = { id: string; nome: string; papel: string; email?: string }

export function Membros({
  obraId,
  responsavelId,
  meuId,
  membros,
  disponiveis,
}: {
  obraId: string
  responsavelId: string
  meuId: string
  membros: Pessoa[]
  disponiveis: Pessoa[]
}) {
  const [selecionado, setSelecionado] = useState("")
  const [pendente, iniciar] = useTransition()

  function adicionar() {
    if (!selecionado) return
    iniciar(async () => {
      const r = await adicionarMembro(obraId, selecionado)
      if (r.ok) {
        toast.success(r.mensagem)
        setSelecionado("")
      } else toast.error(r.erro)
    })
  }

  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Só os membros (e os administradores) veem e registram dados desta obra.</p>
      <ul className="divide-y rounded-md border">
        {membros.map((m) => (
          <li key={m.id} className="flex items-center justify-between gap-2 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {m.nome} {m.id === responsavelId && <TomBadge tom="azul">Responsável</TomBadge>}
              </p>
              <p className="text-xs text-muted-foreground">{PAPEIS[m.papel as Papel]}</p>
            </div>
            {m.id !== responsavelId && m.id !== meuId && (
              <Confirmar
                gatilho={
                  <Button variant="ghost" size="icon-sm" aria-label={`Remover ${m.nome}`}>
                    <Trash2 />
                  </Button>
                }
                titulo={`Remover ${m.nome} da obra?`}
                descricao="A pessoa deixa de ver e registrar dados desta obra. O que ela já registrou continua."
                textoConfirmar="Remover"
                destrutivo
                acao={() => removerMembro(obraId, m.id)}
              />
            )}
          </li>
        ))}
      </ul>
      {disponiveis.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={selecionado}
            onChange={(e) => setSelecionado(e.target.value)}
            className="h-9 flex-1 rounded-md border border-input bg-white px-3 text-sm shadow-xs"
            aria-label="Adicionar membro"
          >
            <option value="">Adicionar membro…</option>
            {disponiveis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome} — {PAPEIS[p.papel as Papel]}
              </option>
            ))}
          </select>
          <Button onClick={adicionar} disabled={!selecionado || pendente}>
            <UserPlus /> Adicionar
          </Button>
        </div>
      )}
    </div>
  )
}
