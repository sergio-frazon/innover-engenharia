"use client"

import { useActionState, useMemo, useState } from "react"
import { Mail, Pencil, Plus, Power, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BotaoEnviar, Campo, ErroFormulario, erroCampo, useRetornoAcao } from "@/components/comum/formulario"
import { Confirmar } from "@/components/comum/confirmar"
import { TomBadge } from "@/components/comum/status"
import { PAPEIS, type Papel } from "@/lib/rotulos"
import { dataHora } from "@/lib/format"
import type { Tables } from "@/lib/supabase/database.types"
import { alterarSituacaoUsuario, convidarUsuario, editarUsuario, reenviarAcesso } from "./actions"

export type LinhaUsuario = Tables<"perfis"> & { obras: string[]; ultimo_acesso: string | null }
type Obra = { id: string; codigo: string; nome: string; situacao: string }

function FormUsuario({ usuario, obras, aoConcluir }: { usuario?: LinhaUsuario; obras: Obra[]; aoConcluir: () => void }) {
  const [estado, acao] = useActionState(usuario ? editarUsuario : convidarUsuario, null)
  const [papel, setPapel] = useState<string>(usuario?.papel ?? "campo")
  useRetornoAcao(estado, { onSucesso: aoConcluir })

  return (
    <form action={acao} className="grid gap-4">
      <ErroFormulario estado={estado} />
      {usuario && <input type="hidden" name="id" value={usuario.id} />}
      <Campo rotulo="Nome" nome="nome" erro={erroCampo(estado, "nome")} obrigatorio>
        <Input id="nome" name="nome" defaultValue={usuario?.nome} required />
      </Campo>
      {usuario ? (
        <Campo rotulo="Telefone" nome="telefone">
          <Input id="telefone" name="telefone" defaultValue={usuario.telefone ?? ""} inputMode="tel" />
        </Campo>
      ) : (
        <Campo rotulo="E-mail" nome="email" erro={erroCampo(estado, "email")} obrigatorio ajuda="O convite com o link para criar a senha vai para este e-mail.">
          <Input id="email" name="email" type="email" required />
        </Campo>
      )}
      <Campo rotulo="Perfil" nome="papel" erro={erroCampo(estado, "papel")} obrigatorio>
        <input type="hidden" name="papel" value={papel} />
        <Select value={papel} onValueChange={setPapel}>
          <SelectTrigger id="papel" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(PAPEIS) as Papel[]).map((p) => (
              <SelectItem key={p} value={p}>
                {PAPEIS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>
      <fieldset className="grid gap-2">
        <legend className="mb-1 text-sm font-medium">Obras com acesso</legend>
        {papel === "admin" ? (
          <p className="text-sm text-muted-foreground">O administrador acessa todas as obras.</p>
        ) : obras.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma obra cadastrada ainda.</p>
        ) : (
          <div className="grid max-h-56 gap-2 overflow-y-auto rounded-md border p-3">
            {obras.map((o) => (
              <label key={o.id} className="flex items-center gap-2 text-sm">
                <Checkbox name="obras" value={o.id} defaultChecked={usuario?.obras.includes(o.id)} />
                <span className="font-mono text-xs text-muted-foreground">{o.codigo}</span> {o.nome}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <BotaoEnviar>{usuario ? "Salvar" : "Enviar convite"}</BotaoEnviar>
    </form>
  )
}

export function ListaUsuarios({ usuarios, obras, meuId }: { usuarios: LinhaUsuario[]; obras: Obra[]; meuId: string }) {
  const [busca, setBusca] = useState("")
  const [editando, setEditando] = useState<LinhaUsuario | null>(null)
  const [convidando, setConvidando] = useState(false)
  const nomeObra = useMemo(() => new Map(obras.map((o) => [o.id, o.codigo])), [obras])

  const filtrados = usuarios.filter((u) => {
    const t = busca.trim().toLowerCase()
    return !t || u.nome.toLowerCase().includes(t) || u.email.includes(t)
  })

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou e-mail" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-8" />
        </div>
        <Button onClick={() => setConvidando(true)}>
          <Plus /> Convidar usuário
        </Button>
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-white md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Obras</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtrados.map((u) => (
              <TableRow key={u.id} className={u.ativo ? "" : "opacity-60"}>
                <TableCell>
                  <p className="font-medium">{u.nome}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </TableCell>
                <TableCell>{PAPEIS[u.papel as Papel]}</TableCell>
                <TableCell className="max-w-56 text-xs text-muted-foreground">
                  {u.papel === "admin" ? "Todas" : u.obras.map((o) => nomeObra.get(o)).filter(Boolean).join(", ") || "Nenhuma"}
                </TableCell>
                <TableCell className="text-sm">{u.ultimo_acesso ? dataHora(u.ultimo_acesso) : "Nunca acessou"}</TableCell>
                <TableCell>{u.ativo ? <TomBadge tom="verde">Ativo</TomBadge> : <TomBadge tom="cinza">Inativo</TomBadge>}</TableCell>
                <TableCell>
                  <AcoesUsuario compacto usuario={u} meuId={meuId} aoEditar={() => setEditando(u)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ul className="grid gap-3 md:hidden">
        {filtrados.map((u) => (
          <li key={u.id} className={`rounded-lg border bg-white p-4 ${u.ativo ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{u.nome}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                <p className="mt-1 text-sm">{PAPEIS[u.papel as Papel]}</p>
              </div>
              {u.ativo ? <TomBadge tom="verde">Ativo</TomBadge> : <TomBadge tom="cinza">Inativo</TomBadge>}
            </div>
            <div className="mt-3">
              <AcoesUsuario usuario={u} meuId={meuId} aoEditar={() => setEditando(u)} />
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={convidando} onOpenChange={setConvidando}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Convidar usuário</DialogTitle>
            <DialogDescription>A pessoa recebe um e-mail para criar a própria senha.</DialogDescription>
          </DialogHeader>
          <FormUsuario obras={obras} aoConcluir={() => setConvidando(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editando} onOpenChange={(a) => !a && setEditando(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar usuário</DialogTitle>
            <DialogDescription>{editando?.email}</DialogDescription>
          </DialogHeader>
          {editando && <FormUsuario key={editando.id} usuario={editando} obras={obras} aoConcluir={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function AcoesUsuario({ usuario, meuId, aoEditar, compacto }: { usuario: LinhaUsuario; meuId: string; aoEditar: () => void; compacto?: boolean }) {
  const tamanho = compacto ? "icon-sm" : "sm"
  const textoAcesso = usuario.ultimo_acesso ? "Enviar nova senha" : "Reenviar convite"
  return (
    <div className="flex flex-wrap gap-1 md:flex-nowrap md:justify-end">
      <Button variant="outline" size={tamanho} onClick={aoEditar} aria-label="Editar" title="Editar">
        <Pencil /> {!compacto && "Editar"}
      </Button>
      {usuario.ativo && (
        <Confirmar
          gatilho={
            <Button variant="outline" size={tamanho} aria-label={textoAcesso} title={textoAcesso}>
              <Mail /> {!compacto && textoAcesso}
            </Button>
          }
          titulo={usuario.ultimo_acesso ? "Enviar e-mail de nova senha?" : "Reenviar convite?"}
          descricao={`Um e-mail será enviado para ${usuario.email}.`}
          textoConfirmar="Enviar"
          acao={() => reenviarAcesso(usuario.id)}
        />
      )}
      {usuario.id !== meuId && (
        <Confirmar
          gatilho={
            <Button
              variant="outline"
              size={tamanho}
              className={usuario.ativo ? "text-red-700" : ""}
              aria-label={usuario.ativo ? "Desativar" : "Reativar"}
              title={usuario.ativo ? "Desativar" : "Reativar"}
            >
              <Power /> {!compacto && (usuario.ativo ? "Desativar" : "Reativar")}
            </Button>
          }
          titulo={usuario.ativo ? `Desativar ${usuario.nome}?` : `Reativar ${usuario.nome}?`}
          descricao={
            usuario.ativo
              ? "A pessoa perde o acesso imediatamente. Os registros feitos por ela continuam no sistema."
              : "A pessoa volta a acessar com a mesma senha."
          }
          textoConfirmar={usuario.ativo ? "Desativar" : "Reativar"}
          destrutivo={usuario.ativo}
          acao={() => alterarSituacaoUsuario(usuario.id, !usuario.ativo)}
        />
      )}
    </div>
  )
}
