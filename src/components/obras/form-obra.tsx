"use client"

import { useActionState } from "react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Formulario, BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { SITUACAO_OBRA } from "@/lib/rotulos"
import { criarObra, editarObra } from "@/app/(app)/obras/actions"
import type { Tables } from "@/lib/supabase/database.types"

const classeSelect =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"

type Opcao = { id: string; nome: string }

export function FormObra({
  obra,
  clientes,
  responsaveis,
}: {
  obra?: Tables<"obras">
  clientes: Opcao[]
  responsaveis: Opcao[]
}) {
  const [estado, acao] = useActionState(obra ? editarObra : criarObra, null)
  useRetornoAcao(estado)
  const e = (c: string) => erroCampo(estado, c)

  return (
    <Formulario acao={acao} estado={estado} limparAoSalvar={false} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="sm:col-span-2 lg:col-span-4">
        <ErroFormulario estado={estado} />
      </div>
      {obra && <input type="hidden" name="id" value={obra.id} />}
      <Campo rotulo="Nome da obra" nome="nome" erro={e("nome")} obrigatorio className="sm:col-span-2 lg:col-span-3">
        <Input id="nome" name="nome" defaultValue={obra?.nome} required />
      </Campo>
      <Campo rotulo="Código" nome="codigo" erro={e("codigo")} ajuda={obra ? undefined : "Deixe em branco para gerar automaticamente."}>
        <Input id="codigo" name="codigo" defaultValue={obra?.codigo} placeholder={obra ? undefined : "OB-2026-…"} />
      </Campo>
      <Campo rotulo="Cliente" nome="cliente_id" erro={e("cliente_id")} className="sm:col-span-2" ajuda="Cadastre em Clientes e fornecedores.">
        <select id="cliente_id" name="cliente_id" defaultValue={obra?.cliente_id ?? ""} className={classeSelect}>
          <option value="">Sem cliente definido</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Responsável" nome="responsavel_id" erro={e("responsavel_id")} obrigatorio className="sm:col-span-2">
        <select id="responsavel_id" name="responsavel_id" defaultValue={obra?.responsavel_id ?? ""} required className={classeSelect}>
          <option value="" disabled>
            Selecione…
          </option>
          {responsaveis.map((r) => (
            <option key={r.id} value={r.id}>
              {r.nome}
            </option>
          ))}
        </select>
      </Campo>
      <Campo rotulo="Endereço" nome="endereco" className="sm:col-span-2">
        <Input id="endereco" name="endereco" defaultValue={obra?.endereco ?? ""} />
      </Campo>
      <Campo rotulo="Cidade" nome="cidade">
        <Input id="cidade" name="cidade" defaultValue={obra?.cidade ?? ""} />
      </Campo>
      <Campo rotulo="UF" nome="uf" erro={e("uf")}>
        <Input id="uf" name="uf" defaultValue={obra?.uf ?? ""} maxLength={2} className="uppercase" />
      </Campo>
      <Campo rotulo="Início previsto" nome="data_inicio_prevista" erro={e("data_inicio_prevista")}>
        <Input id="data_inicio_prevista" name="data_inicio_prevista" type="date" defaultValue={obra?.data_inicio_prevista ?? ""} />
      </Campo>
      <Campo rotulo="Término previsto" nome="data_fim_prevista" erro={e("data_fim_prevista")}>
        <Input id="data_fim_prevista" name="data_fim_prevista" type="date" defaultValue={obra?.data_fim_prevista ?? ""} />
      </Campo>
      {obra && (
        <>
          <Campo rotulo="Início real" nome="data_inicio_real" erro={e("data_inicio_real")}>
            <Input id="data_inicio_real" name="data_inicio_real" type="date" defaultValue={obra.data_inicio_real ?? ""} />
          </Campo>
          <Campo rotulo="Término real" nome="data_fim_real" erro={e("data_fim_real")}>
            <Input id="data_fim_real" name="data_fim_real" type="date" defaultValue={obra.data_fim_real ?? ""} />
          </Campo>
          <Campo
            rotulo="Situação"
            nome="situacao"
            className="sm:col-span-2"
            ajuda="Obra concluída ou cancelada fica somente leitura (só o administrador reabre)."
          >
            <select id="situacao" name="situacao" defaultValue={obra.situacao} className={classeSelect}>
              {Object.entries(SITUACAO_OBRA).map(([v, r]) => (
                <option key={v} value={v}>
                  {r.texto}
                </option>
              ))}
            </select>
          </Campo>
        </>
      )}
      <Campo rotulo="Descrição" nome="descricao" className="sm:col-span-2 lg:col-span-4">
        <Textarea id="descricao" name="descricao" defaultValue={obra?.descricao ?? ""} rows={3} />
      </Campo>
      <div className="sm:col-span-2 lg:col-span-4">
        <BotaoEnviar>{obra ? "Salvar alterações" : "Cadastrar obra"}</BotaoEnviar>
      </div>
    </Formulario>
  )
}
