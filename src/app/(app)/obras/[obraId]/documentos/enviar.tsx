"use client"

import { useState } from "react"
import { History, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Campo } from "@/components/comum/formulario"
import { BarraProgresso } from "@/components/comum/status"
import { BaixarArquivo } from "@/components/comum/baixar-arquivo"
import { CATEGORIA_DOCUMENTO } from "@/lib/rotulos"
import { LIMITES, enviarArquivo, validarArquivo } from "@/lib/upload"
import { registrarDocumento } from "./actions"

type NovaVersao = { grupo_id: string; titulo: string; categoria: string; etapa_id: string | null }

export function EnviarDocumento({ obraId, etapas, novaVersaoDe }: { obraId: string; etapas: { id: string; nome: string }[]; novaVersaoDe?: NovaVersao }) {
  const [aberto, setAberto] = useState(false)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [progresso, setProgresso] = useState<number | null>(null)
  const [erros, setErros] = useState<Record<string, string>>({})

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const titulo = String(form.get("titulo") ?? "").trim()
    const novosErros: Record<string, string> = {}
    if (!titulo) novosErros.titulo = "Informe o título."
    if (!arquivo) novosErros.arquivo = "Escolha o arquivo."
    else {
      const erro = validarArquivo("documentos", arquivo)
      if (erro) novosErros.arquivo = erro
    }
    setErros(novosErros)
    if (Object.keys(novosErros).length || !arquivo) return

    try {
      setProgresso(0)
      const { caminho, mime } = await enviarArquivo("documentos", obraId, arquivo, setProgresso)
      const r = await registrarDocumento({
        obra_id: obraId,
        grupo_id: novaVersaoDe?.grupo_id ?? null,
        etapa_id: String(form.get("etapa_id") ?? "") || null,
        titulo,
        categoria: String(form.get("categoria")) as "projeto",
        observacao: String(form.get("observacao") ?? ""),
        caminho_arquivo: caminho,
        nome_arquivo: arquivo.name,
        tipo_mime: mime,
        tamanho_bytes: arquivo.size,
      })
      if (!r.ok) throw new Error(r.erro)
      toast.success(r.mensagem)
      setAberto(false)
      setArquivo(null)
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível enviar.")
    } finally {
      setProgresso(null)
    }
  }

  const enviando = progresso !== null
  return (
    <Dialog open={aberto} onOpenChange={(a) => !enviando && setAberto(a)}>
      <DialogTrigger asChild>
        {novaVersaoDe ? (
          <Button variant="outline" size="sm">
            <Upload /> Nova versão
          </Button>
        ) : (
          <Button>
            <Upload /> Enviar documento
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{novaVersaoDe ? `Nova versão: ${novaVersaoDe.titulo}` : "Enviar documento"}</DialogTitle>
          <DialogDescription>{LIMITES.documentos.rotulo}.</DialogDescription>
        </DialogHeader>
        <form onSubmit={enviar} className="grid gap-4">
          <Campo rotulo="Título" nome="titulo" erro={erros.titulo} obrigatorio>
            <Input id="titulo" name="titulo" defaultValue={novaVersaoDe?.titulo} readOnly={!!novaVersaoDe} />
          </Campo>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Categoria" nome="categoria">
              <select
                id="categoria"
                name="categoria"
                defaultValue={novaVersaoDe?.categoria ?? "projeto"}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {Object.entries(CATEGORIA_DOCUMENTO).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Etapa" nome="etapa_id">
              <select id="etapa_id" name="etapa_id" defaultValue={novaVersaoDe?.etapa_id ?? ""} className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm">
                <option value="">Obra toda</option>
                {etapas.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
            </Campo>
          </div>
          <Campo rotulo="Arquivo" nome="arquivo" erro={erros.arquivo} obrigatorio>
            <Input id="arquivo" type="file" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} disabled={enviando} />
          </Campo>
          <Campo rotulo={novaVersaoDe ? "O que mudou nesta versão" : "Observação"} nome="observacao">
            <Textarea id="observacao" name="observacao" rows={2} />
          </Campo>
          {enviando && (
            <div className="grid gap-1">
              <BarraProgresso valor={progresso} />
              <p className="text-xs text-muted-foreground">Enviando… {progresso}%</p>
            </div>
          )}
          <Button type="submit" disabled={enviando} className="min-h-11 sm:min-h-9">
            {enviando && <Loader2 className="animate-spin" />}
            Enviar
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function VersoesDocumento({
  titulo,
  versoes,
}: {
  titulo: string
  versoes: { id: string; versao: number; nome: string; caminho: string; detalhe: string }[]
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History /> Versões ({versoes.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Versões de {titulo}</DialogTitle>
        </DialogHeader>
        <ul className="divide-y">
          {versoes.map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Versão {v.versao} · {v.nome}
                </p>
                <p className="text-xs text-muted-foreground">{v.detalhe}</p>
              </div>
              <BaixarArquivo bucket="documentos" caminho={v.caminho} compacto />
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
