"use client"

import { startTransition, useActionState, useRef, useState } from "react"
import { Loader2, Wallet } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { BarraProgresso } from "@/components/comum/status"
import { hojeISO, moeda, numeroParaInput } from "@/lib/format"
import { FORMA_PAGAMENTO } from "@/lib/rotulos"
import { LIMITES, enviarArquivo, validarArquivo } from "@/lib/upload"
import { registrarBaixa } from "@/app/(app)/financeiro/actions"

export type ParcelaParaPagar = {
  id: string
  descricao: string
  numero: number
  total_parcelas: number
  saldo: number
  tipo: string
  obra_id: string | null
}

export function RegistrarPagamento({ parcela, compacto }: { parcela: ParcelaParaPagar; compacto?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const rotulo = parcela.tipo === "pagar" ? "Registrar pagamento" : "Registrar recebimento"
  return (
    <>
      <Button size="sm" variant={compacto ? "outline" : "default"} onClick={() => setAberto(true)}>
        <Wallet /> {compacto ? (parcela.tipo === "pagar" ? "Pagar" : "Receber") : rotulo}
      </Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{rotulo}</DialogTitle>
            <DialogDescription>
              {parcela.descricao} — parcela {parcela.numero}/{parcela.total_parcelas} · saldo {moeda(parcela.saldo)}
            </DialogDescription>
          </DialogHeader>
          {aberto && <FormPagamento parcela={parcela} aoConcluir={() => setAberto(false)} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FormPagamento({ parcela, aoConcluir }: { parcela: ParcelaParaPagar; aoConcluir: () => void }) {
  const [estado, acao, pendente] = useActionState(registrarBaixa, null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [progresso, setProgresso] = useState<number | null>(null)
  const caminhoRef = useRef<HTMLInputElement>(null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    if (arquivo) {
      const erro = validarArquivo("comprovantes", arquivo)
      if (erro) return toast.error(erro)
      try {
        setProgresso(0)
        const { caminho } = await enviarArquivo("comprovantes", parcela.obra_id ?? "sem-obra", arquivo, setProgresso)
        caminhoRef.current!.value = caminho
      } catch (err) {
        setProgresso(null)
        return toast.error(err instanceof Error ? err.message : "Falha no envio do comprovante.")
      }
      setProgresso(null)
    }
    const dados = new FormData(form)
    startTransition(() => acao(dados))
  }

  const ocupado = pendente || progresso !== null
  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ErroFormulario estado={estado} />
      </div>
      <input type="hidden" name="parcela_id" value={parcela.id} />
      <input type="hidden" name="comprovante_caminho" ref={caminhoRef} />
      <Campo rotulo="Data" nome="data_pagamento" erro={erroCampo(estado, "data_pagamento")} obrigatorio>
        <Input id="data_pagamento" name="data_pagamento" type="date" defaultValue={hojeISO()} max={hojeISO()} required />
      </Campo>
      <Campo rotulo="Valor (R$)" nome="valor" erro={erroCampo(estado, "valor")} obrigatorio ajuda="Pagamento parcial é permitido.">
        <Input id="valor" name="valor" inputMode="decimal" defaultValue={numeroParaInput(parcela.saldo)} required />
      </Campo>
      <Campo rotulo="Juros / multa (R$)" nome="juros_multa" erro={erroCampo(estado, "juros_multa")}>
        <Input id="juros_multa" name="juros_multa" inputMode="decimal" placeholder="0,00" />
      </Campo>
      <Campo rotulo="Desconto (R$)" nome="desconto" erro={erroCampo(estado, "desconto")} ajuda="Conta para quitar a parcela.">
        <Input id="desconto" name="desconto" inputMode="decimal" placeholder="0,00" />
      </Campo>
      <Campo rotulo="Forma" nome="forma" obrigatorio>
        <select id="forma" name="forma" defaultValue="pix" className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
          {Object.entries(FORMA_PAGAMENTO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Comprovante" nome="comprovante" ajuda={LIMITES.comprovantes.rotulo}>
        <Input id="comprovante" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
      </Campo>
      <Campo rotulo="Observação" nome="observacao" className="sm:col-span-2">
        <Textarea id="observacao" name="observacao" rows={2} />
      </Campo>
      {progresso !== null && (
        <div className="sm:col-span-2">
          <BarraProgresso valor={progresso} />
        </div>
      )}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={ocupado} className="min-h-11 sm:min-h-9">
          {ocupado && <Loader2 className="animate-spin" />}
          Confirmar
        </Button>
      </div>
    </form>
  )
}
