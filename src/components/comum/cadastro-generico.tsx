"use client"

import { useActionState, useState } from "react"
import { Pencil, Plus, Power, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { Confirmar } from "@/components/comum/confirmar"
import { EstadoVazio } from "@/components/comum/pagina"
import { TomBadge } from "@/components/comum/status"
import { cn } from "@/lib/utils"
import type { Resultado } from "@/lib/acoes"

export type DefCampo =
  | { tipo: "texto" | "numero" | "textarea" | "email" | "tel"; nome: string; rotulo: string; obrigatorio?: boolean; ajuda?: string; largo?: boolean; lista?: string[] }
  | { tipo: "select"; nome: string; rotulo: string; opcoes: { valor: string; rotulo: string }[]; obrigatorio?: boolean; ajuda?: string; largo?: boolean; vazio?: string }
  | { tipo: "checkboxes"; rotulo: string; itens: { nome: string; rotulo: string }[]; largo?: boolean; nome: string }

export type LinhaCadastro = {
  id: string
  ativo: boolean
  colunas: string[]
  busca: string
  dados: Record<string, string | boolean | null>
}

type Props = {
  singular: string
  colunas: string[]
  linhas: LinhaCadastro[]
  campos: DefCampo[]
  salvar: (prev: Resultado | null, formData: FormData) => Promise<Resultado>
  alternar: (id: string, ativo: boolean) => Promise<Resultado>
  podeEditar: boolean
  vazio: string
}

function CampoForm({ def, valor, estado }: { def: DefCampo; valor: string | boolean | null | undefined; estado: Resultado | null }) {
  if (def.tipo === "checkboxes") return null
  const v = typeof valor === "string" ? valor : ""
  return (
    <Campo rotulo={def.rotulo} nome={def.nome} erro={erroCampo(estado, def.nome)} obrigatorio={def.obrigatorio} ajuda={def.ajuda} className={def.largo ? "sm:col-span-2" : undefined}>
      {def.tipo === "textarea" ? (
        <Textarea id={def.nome} name={def.nome} defaultValue={v} rows={3} />
      ) : def.tipo === "select" ? (
        <select
          id={def.nome}
          name={def.nome}
          defaultValue={v}
          required={def.obrigatorio}
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {!def.obrigatorio && <option value="">{def.vazio ?? "—"}</option>}
          {def.obrigatorio && !v && <option value="" disabled>Selecione…</option>}
          {def.opcoes.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.rotulo}
            </option>
          ))}
        </select>
      ) : (
        <>
          <Input
            id={def.nome}
            name={def.nome}
            defaultValue={v}
            required={def.obrigatorio}
            type={def.tipo === "email" ? "email" : def.tipo === "tel" ? "tel" : "text"}
            inputMode={def.tipo === "numero" ? "decimal" : undefined}
            list={def.lista ? `${def.nome}-lista` : undefined}
          />
          {def.lista && (
            <datalist id={`${def.nome}-lista`}>
              {def.lista.map((x) => (
                <option key={x} value={x} />
              ))}
            </datalist>
          )}
        </>
      )}
    </Campo>
  )
}

function FormCadastro({ campos, linha, salvar, aoConcluir }: { campos: DefCampo[]; linha?: LinhaCadastro; salvar: Props["salvar"]; aoConcluir: () => void }) {
  const [estado, acao] = useActionState(salvar, null)
  useRetornoAcao(estado, { sucesso: "Salvo.", onSucesso: aoConcluir })
  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <ErroFormulario estado={estado} />
      </div>
      {linha && <input type="hidden" name="id" value={linha.id} />}
      {campos.map((c) =>
        c.tipo === "checkboxes" ? (
          <fieldset key={c.nome} className={cn("grid gap-2", c.largo && "sm:col-span-2")}>
            <legend className="mb-1 text-sm font-medium">{c.rotulo}</legend>
            <div className="flex flex-wrap gap-4">
              {c.itens.map((i) => (
                <label key={i.nome} className="flex items-center gap-2 text-sm">
                  <Checkbox name={i.nome} defaultChecked={linha?.dados[i.nome] === true} />
                  {i.rotulo}
                </label>
              ))}
            </div>
            {erroCampo(estado, c.nome) && <p className="text-xs font-medium text-red-600">{erroCampo(estado, c.nome)}</p>}
          </fieldset>
        ) : (
          <CampoForm key={c.nome} def={c} valor={linha?.dados[c.nome]} estado={estado} />
        ),
      )}
      <div className="sm:col-span-2">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </Formulario>
  )
}

/**
 * Tela de cadastro simples (lista + formulário em diálogo + ativar/desativar), usada por pessoas,
 * profissionais, materiais, equipamentos e categorias. Os campos são declarados por quem usa.
 */
export function CadastroGenerico({ singular, colunas, linhas, campos, salvar, alternar, podeEditar, vazio }: Props) {
  const [busca, setBusca] = useState("")
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const [editando, setEditando] = useState<LinhaCadastro | "novo" | null>(null)

  const t = busca.trim().toLowerCase()
  const filtradas = linhas.filter((l) => (mostrarInativos || l.ativo) && (!t || l.busca.toLowerCase().includes(t)))

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={mostrarInativos} onCheckedChange={(v) => setMostrarInativos(v === true)} /> Mostrar inativos
          </label>
        </div>
        {podeEditar && (
          <Button onClick={() => setEditando("novo")}>
            <Plus /> Novo {singular.toLowerCase()}
          </Button>
        )}
      </div>

      {filtradas.length === 0 ? (
        <EstadoVazio
          titulo={linhas.length === 0 ? vazio : "Nada encontrado."}
          acao={
            podeEditar && linhas.length === 0 ? (
              <Button onClick={() => setEditando("novo")}>
                <Plus /> Cadastrar
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  {colunas.map((c) => (
                    <TableHead key={c}>{c}</TableHead>
                  ))}
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map((l) => (
                  <TableRow key={l.id} className={l.ativo ? "" : "opacity-60"}>
                    {l.colunas.map((v, i) => (
                      <TableCell key={i} className={i === 0 ? "font-medium" : ""}>
                        {v}
                        {i === 0 && !l.ativo && <TomBadge tom="cinza" className="ml-2">Inativo</TomBadge>}
                      </TableCell>
                    ))}
                    <TableCell>{podeEditar && <Acoes compacto linha={l} singular={singular} alternar={alternar} aoEditar={() => setEditando(l)} />}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="grid gap-3 md:hidden">
            {filtradas.map((l) => (
              <li key={l.id} className={cn("rounded-lg border bg-white p-4", !l.ativo && "opacity-60")}>
                <p className="font-medium">
                  {l.colunas[0]} {!l.ativo && <TomBadge tom="cinza">Inativo</TomBadge>}
                </p>
                <dl className="mt-1 grid gap-0.5 text-sm">
                  {l.colunas.slice(1).map((v, i) =>
                    v && v !== "—" ? (
                      <div key={i} className="flex gap-1">
                        <dt className="text-muted-foreground">{colunas[i + 1]}:</dt>
                        <dd>{v}</dd>
                      </div>
                    ) : null,
                  )}
                </dl>
                {podeEditar && (
                  <div className="mt-3">
                    <Acoes linha={l} singular={singular} alternar={alternar} aoEditar={() => setEditando(l)} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={editando !== null} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editando === "novo" ? `Novo ${singular.toLowerCase()}` : `Editar ${singular.toLowerCase()}`}</DialogTitle>
          </DialogHeader>
          {editando && (
            <FormCadastro
              key={editando === "novo" ? "novo" : editando.id}
              campos={campos}
              linha={editando === "novo" ? undefined : editando}
              salvar={salvar}
              aoConcluir={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Acoes({ linha, singular, alternar, aoEditar, compacto }: { linha: LinhaCadastro; singular: string; alternar: Props["alternar"]; aoEditar: () => void; compacto?: boolean }) {
  const tamanho = compacto ? "icon-sm" : "sm"
  const rotuloSituacao = linha.ativo ? "Desativar" : "Reativar"
  return (
    <div className="flex gap-1 md:justify-end">
      <Button variant="outline" size={tamanho} onClick={aoEditar} aria-label="Editar" title="Editar">
        <Pencil /> {!compacto && "Editar"}
      </Button>
      <Confirmar
        gatilho={
          <Button variant="outline" size={tamanho} aria-label={rotuloSituacao} title={rotuloSituacao}>
            <Power /> {!compacto && rotuloSituacao}
          </Button>
        }
        titulo={linha.ativo ? `Desativar ${singular.toLowerCase()}?` : `Reativar ${singular.toLowerCase()}?`}
        descricao={
          linha.ativo
            ? "Deixa de aparecer nas seleções de novos registros. Os registros antigos continuam mostrando este cadastro."
            : "Volta a aparecer nas seleções."
        }
        textoConfirmar={linha.ativo ? "Desativar" : "Reativar"}
        acao={() => alternar(linha.id, !linha.ativo)}
        sucesso={linha.ativo ? "Desativado." : "Reativado."}
      />
    </div>
  )
}
