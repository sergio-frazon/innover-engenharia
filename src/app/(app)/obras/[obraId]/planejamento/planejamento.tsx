"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { ArrowDown, ArrowUp, FileText, MoreHorizontal, Pencil, Plus, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { useAcao } from "@/components/comum/use-acao"
import { HistoricoRegistro } from "@/components/comum/historico-registro"
import { EstadoVazio } from "@/components/comum/pagina"
import { BarraProgresso, StatusBadge, TomBadge } from "@/components/comum/status"
import { numeroParaInput, percentual, quantidade } from "@/lib/format"
import { SITUACAO_PRAZO, UNIDADES } from "@/lib/rotulos"
import type { Tables } from "@/lib/supabase/database.types"
import { alternarEtapa, alternarServico, moverEtapa, moverServico, salvarEtapa, salvarServico } from "./actions"

export type ServicoPlan = Tables<"servicos"> & {
  responsavel: string | null
  quantidade_aprovada: number
  quantidade_pendente: number
  percentual: number
  peso: number | null
  situacao_prazo: string | null
}
export type EtapaPlan = Tables<"etapas"> & { responsavel: string | null; documentos: number; servicos: ServicoPlan[] }
type Pessoa = { id: string; nome: string }

const classeSelect = "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"

function proximoCodigo(codigos: string[], prefixo?: string) {
  const nums = codigos.map((c) => Number(prefixo ? c.slice(prefixo.length + 1) : c)).filter((n) => Number.isFinite(n))
  const n = (nums.length ? Math.max(...nums) : 0) + 1
  return prefixo ? `${prefixo}.${n}` : String(n)
}

function FormEtapa({ obraId, etapa, codigo, pessoas, aoConcluir }: { obraId: string; etapa?: EtapaPlan; codigo: string; pessoas: Pessoa[]; aoConcluir: () => void }) {
  const [estado, acao] = useActionState(salvarEtapa, null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <ErroFormulario estado={estado} />
      </div>
      <input type="hidden" name="obra_id" value={obraId} />
      {etapa && <input type="hidden" name="id" value={etapa.id} />}
      <Campo rotulo="Código" nome="codigo" erro={erroCampo(estado, "codigo")} obrigatorio>
        <Input id="codigo" name="codigo" defaultValue={etapa?.codigo ?? codigo} required />
      </Campo>
      <Campo rotulo="Nome" nome="nome" erro={erroCampo(estado, "nome")} obrigatorio className="sm:col-span-3">
        <Input id="nome" name="nome" defaultValue={etapa?.nome} required autoFocus />
      </Campo>
      <Campo rotulo="Responsável" nome="responsavel_id" className="sm:col-span-4">
        <select id="responsavel_id" name="responsavel_id" defaultValue={etapa?.responsavel_id ?? ""} className={classeSelect}>
          <option value="">Nenhum</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      <div className="sm:col-span-4">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </Formulario>
  )
}

function FormServico({
  obraId,
  etapas,
  etapaId,
  servico,
  codigo,
  pessoas,
  aoConcluir,
}: {
  obraId: string
  etapas: EtapaPlan[]
  etapaId: string
  servico?: ServicoPlan
  codigo: string
  pessoas: Pessoa[]
  aoConcluir: () => void
}) {
  const [estado, acao] = useActionState(salvarServico, null)
  useRetornoAcao(estado, { onSucesso: aoConcluir })
  const e = (c: string) => erroCampo(estado, c)
  return (
    <Formulario acao={acao} estado={estado} className="grid gap-4 sm:grid-cols-4">
      <div className="sm:col-span-4">
        <ErroFormulario estado={estado} />
      </div>
      <input type="hidden" name="obra_id" value={obraId} />
      {servico && <input type="hidden" name="id" value={servico.id} />}
      <Campo rotulo="Etapa" nome="etapa_id" obrigatorio className="sm:col-span-4">
        <select id="etapa_id" name="etapa_id" defaultValue={servico?.etapa_id ?? etapaId} className={classeSelect}>
          {etapas
            .filter((x) => x.ativo)
            .map((x) => (
              <option key={x.id} value={x.id}>
                {x.codigo}. {x.nome}
              </option>
            ))}
        </select>
      </Campo>
      <Campo rotulo="Código" nome="codigo" erro={e("codigo")} obrigatorio>
        <Input id="codigo" name="codigo" defaultValue={servico?.codigo ?? codigo} required />
      </Campo>
      <Campo rotulo="Descrição" nome="descricao" erro={e("descricao")} obrigatorio className="sm:col-span-3">
        <Input id="descricao" name="descricao" defaultValue={servico?.descricao} required autoFocus />
      </Campo>
      <Campo rotulo="Unidade" nome="unidade" erro={e("unidade")} obrigatorio>
        <Input id="unidade" name="unidade" defaultValue={servico?.unidade} list="unidades" required />
        <datalist id="unidades">
          {UNIDADES.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
      </Campo>
      <Campo
        rotulo="Quantidade prevista"
        nome="quantidade_prevista"
        erro={e("quantidade_prevista")}
        obrigatorio
        ajuda="Base do percentual executado."
      >
        <Input id="quantidade_prevista" name="quantidade_prevista" inputMode="decimal" defaultValue={numeroParaInput(servico?.quantidade_prevista)} required />
      </Campo>
      <Campo rotulo="Responsável" nome="responsavel_id" className="sm:col-span-2">
        <select id="responsavel_id" name="responsavel_id" defaultValue={servico?.responsavel_id ?? ""} className={classeSelect}>
          <option value="">Nenhum</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </Campo>
      <div className="sm:col-span-4">
        <BotaoEnviar>Salvar</BotaoEnviar>
      </div>
    </Formulario>
  )
}

type Dialogo =
  | { tipo: "etapa"; etapa?: EtapaPlan }
  | { tipo: "servico"; etapaId: string; servico?: ServicoPlan }
  | null

export function Planejamento({
  obraId,
  etapas,
  pessoas,
  podeEditar,
  podeVerHistorico,
}: {
  obraId: string
  etapas: EtapaPlan[]
  pessoas: Pessoa[]
  podeEditar: boolean
  podeVerHistorico: boolean
}) {
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  // Guarda o último diálogo aberto: durante a animação de fechar o título não pode trocar para outro texto
  const [ultimoDialogo, setUltimoDialogo] = useState<Dialogo>(null)
  if (dialogo && dialogo !== ultimoDialogo) setUltimoDialogo(dialogo)
  const exibido = dialogo ?? ultimoDialogo
  const [mostrarInativos, setMostrarInativos] = useState(false)
  const { pendente, executar } = useAcao()

  const visiveis = etapas.filter((e) => mostrarInativos || e.ativo)
  const etapaDialogo = dialogo?.tipo === "servico" ? etapas.find((e) => e.id === dialogo.etapaId) : undefined

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" checked={mostrarInativos} onChange={(e) => setMostrarInativos(e.target.checked)} className="size-4" />
          Mostrar inativos
        </label>
        {podeEditar && (
          <Button onClick={() => setDialogo({ tipo: "etapa" })}>
            <Plus /> Nova etapa
          </Button>
        )}
      </div>

      {visiveis.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma etapa cadastrada."
          descricao="Comece pelas etapas (ex.: Fundação, Estrutura) e depois cadastre os serviços de cada uma, com unidade e quantidade prevista."
          acao={
            podeEditar && (
              <Button onClick={() => setDialogo({ tipo: "etapa" })}>
                <Plus /> Nova etapa
              </Button>
            )
          }
        />
      )}

      {visiveis.map((etapa, ie) => {
        const servicos = etapa.servicos.filter((s) => mostrarInativos || s.ativo)
        return (
          <section key={etapa.id} className={`rounded-lg border bg-white ${etapa.ativo ? "" : "opacity-60"}`}>
            <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
              <h2 className="flex-1 font-semibold">
                {etapa.codigo}. {etapa.nome} {!etapa.ativo && <TomBadge tom="cinza">Inativa</TomBadge>}
                {etapa.responsavel && <span className="ml-2 text-sm font-normal text-muted-foreground">· {etapa.responsavel}</span>}
              </h2>
              {etapa.documentos > 0 && (
                <Link href={`/obras/${obraId}/documentos?etapa=${etapa.id}`} className="flex items-center gap-1 text-sm text-blue-700 hover:underline">
                  <FileText className="size-4" /> {etapa.documentos} documento(s)
                </Link>
              )}
              {podeEditar && (
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setDialogo({ tipo: "servico", etapaId: etapa.id })} disabled={!etapa.ativo}>
                    <Plus /> Serviço
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Mais ações da etapa" disabled={pendente}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setDialogo({ tipo: "etapa", etapa })}>
                        <Pencil /> Editar etapa
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={ie === 0} onSelect={() => executar(moverEtapa(obraId, etapa.id, -1))}>
                        <ArrowUp /> Mover para cima
                      </DropdownMenuItem>
                      <DropdownMenuItem disabled={ie === visiveis.length - 1} onSelect={() => executar(moverEtapa(obraId, etapa.id, 1))}>
                        <ArrowDown /> Mover para baixo
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => executar(alternarEtapa(obraId, etapa.id, !etapa.ativo))}>
                        <Power /> {etapa.ativo ? "Desativar etapa" : "Reativar etapa"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </header>

            {servicos.length === 0 ? (
              <p className="px-4 py-3 text-sm text-muted-foreground">Nenhum serviço nesta etapa.</p>
            ) : (
              <>
                <div className="hidden overflow-x-auto lg:block">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs text-muted-foreground">
                      <tr className="border-b">
                        <th className="px-4 py-2 font-medium">Código</th>
                        <th className="px-2 py-2 font-medium">Serviço</th>
                        <th className="px-2 py-2 text-right font-medium">Previsto</th>
                        <th className="px-2 py-2 text-right font-medium">Executado</th>
                        <th className="w-40 px-2 py-2 font-medium">%</th>
                        <th className="px-2 py-2 text-right font-medium">Peso</th>
                        <th className="px-2 py-2 font-medium">Prazo</th>
                        <th className="w-0 px-2 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {servicos.map((s, is) => (
                        <tr key={s.id} className={`border-b last:border-0 ${s.ativo ? "" : "opacity-60"}`}>
                          <td className="px-4 py-2 font-mono text-xs">{s.codigo}</td>
                          <td className="px-2 py-2">
                            <p className="font-medium">{s.descricao}</p>
                            {s.responsavel && <p className="text-xs text-muted-foreground">{s.responsavel}</p>}
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{quantidade(s.quantidade_prevista, s.unidade)}</td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {quantidade(s.quantidade_aprovada, s.unidade)}
                            {s.quantidade_pendente > 0 && <p className="text-xs text-amber-700">+{quantidade(s.quantidade_pendente)} pendente</p>}
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <BarraProgresso valor={s.percentual} tom={s.percentual >= 100 ? "verde" : "azul"} />
                              <span className={`w-14 text-right tabular-nums ${s.percentual > 100 ? "font-medium text-amber-700" : ""}`}>{percentual(s.percentual)}</span>
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">{s.peso === null ? "—" : percentual(s.peso * 100, 2)}</td>
                          <td className="px-2 py-2">{s.situacao_prazo ? <StatusBadge mapa={SITUACAO_PRAZO} valor={s.situacao_prazo} /> : <TomBadge tom="cinza">Inativo</TomBadge>}</td>
                          <td className="px-2 py-2">
                            <AcoesServico
                              servico={s}
                              primeiro={is === 0}
                              ultimo={is === servicos.length - 1}
                              podeEditar={podeEditar}
                              podeVerHistorico={podeVerHistorico}
                              pendente={pendente}
                              onEditar={() => setDialogo({ tipo: "servico", etapaId: etapa.id, servico: s })}
                              onMover={(d) => executar(moverServico(obraId, etapa.id, s.id, d))}
                              onAlternar={() => executar(alternarServico(obraId, s.id, !s.ativo))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <ul className="divide-y lg:hidden">
                  {servicos.map((s, is) => (
                    <li key={s.id} className={`px-4 py-3 ${s.ativo ? "" : "opacity-60"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">
                            <span className="font-mono text-xs text-muted-foreground">{s.codigo}</span> {s.descricao}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {quantidade(s.quantidade_aprovada)} de {quantidade(s.quantidade_prevista, s.unidade)}
                            {s.peso !== null && ` · peso ${percentual(s.peso * 100, 2)}`}
                          </p>
                        </div>
                        {s.situacao_prazo && <StatusBadge mapa={SITUACAO_PRAZO} valor={s.situacao_prazo} />}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <BarraProgresso valor={s.percentual} tom={s.percentual >= 100 ? "verde" : "azul"} />
                        <span className="w-14 text-right text-sm tabular-nums">{percentual(s.percentual)}</span>
                        <AcoesServico
                          servico={s}
                          primeiro={is === 0}
                          ultimo={is === servicos.length - 1}
                          podeEditar={podeEditar}
                          podeVerHistorico={podeVerHistorico}
                          pendente={pendente}
                          onEditar={() => setDialogo({ tipo: "servico", etapaId: etapa.id, servico: s })}
                          onMover={(d) => executar(moverServico(obraId, etapa.id, s.id, d))}
                          onAlternar={() => executar(alternarServico(obraId, s.id, !s.ativo))}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )
      })}

      <Dialog open={dialogo !== null} onOpenChange={(a) => !a && setDialogo(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {exibido?.tipo === "etapa"
                ? exibido.etapa
                  ? "Editar etapa"
                  : "Nova etapa"
                : exibido?.tipo === "servico" && exibido.servico
                  ? "Editar serviço"
                  : "Novo serviço"}
            </DialogTitle>
          </DialogHeader>
          {dialogo?.tipo === "etapa" && (
            <FormEtapa
              obraId={obraId}
              etapa={dialogo.etapa}
              codigo={proximoCodigo(etapas.map((e) => e.codigo))}
              pessoas={pessoas}
              aoConcluir={() => setDialogo(null)}
            />
          )}
          {dialogo?.tipo === "servico" && etapaDialogo && (
            <FormServico
              obraId={obraId}
              etapas={etapas}
              etapaId={dialogo.etapaId}
              servico={dialogo.servico}
              codigo={proximoCodigo(etapaDialogo.servicos.map((s) => s.codigo), etapaDialogo.codigo)}
              pessoas={pessoas}
              aoConcluir={() => setDialogo(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AcoesServico({
  servico,
  primeiro,
  ultimo,
  podeEditar,
  podeVerHistorico,
  pendente,
  onEditar,
  onMover,
  onAlternar,
}: {
  servico: ServicoPlan
  primeiro: boolean
  ultimo: boolean
  podeEditar: boolean
  podeVerHistorico: boolean
  pendente: boolean
  onEditar: () => void
  onMover: (d: -1 | 1) => void
  onAlternar: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      {podeVerHistorico && <HistoricoRegistro tabela="servicos" registroId={servico.id} titulo={`${servico.codigo} ${servico.descricao}`} compacto />}
      {podeEditar && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Ações do serviço" disabled={pendente}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onEditar}>
              <Pencil /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem disabled={primeiro} onSelect={() => onMover(-1)}>
              <ArrowUp /> Mover para cima
            </DropdownMenuItem>
            <DropdownMenuItem disabled={ultimo} onSelect={() => onMover(1)}>
              <ArrowDown /> Mover para baixo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onAlternar}>
              <Power /> {servico.ativo ? "Desativar" : "Reativar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
