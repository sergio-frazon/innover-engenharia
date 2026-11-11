import type { Metadata } from "next"
import Link from "next/link"
import { Download, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Cabecalho } from "@/components/comum/pagina"
import { TabelaParcelas } from "@/components/financeiro/tabela-parcelas"
import { exigirPapel } from "@/lib/auth"
import { buscarParcelas, type FiltrosParcelas } from "@/lib/financeiro"
import { SITUACAO_PARCELA } from "@/lib/rotulos"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Contas a pagar e receber" }

const classeSelect = "h-9 rounded-md border bg-white px-3 text-sm"

export default async function PaginaFinanceiro({ searchParams }: { searchParams: Promise<FiltrosParcelas> }) {
  await exigirPapel("admin", "financeiro")
  const f = await searchParams
  const tipo = f.tipo === "receber" ? "receber" : "pagar"
  const { linhas, pessoas, obras, categorias } = await buscarParcelas({ ...f, tipo })
  const qs = new URLSearchParams(Object.entries({ ...f, tipo }).filter(([, v]) => v) as [string, string][]).toString()

  return (
    <>
      <Cabecalho
        titulo="Contas a pagar e receber"
        acoes={
          <>
            <Button variant="outline" asChild>
              <a href={`/financeiro/csv?${qs}`}>
                <Download /> CSV
              </a>
            </Button>
            <Button asChild>
              <Link href={`/financeiro/novo?tipo=${tipo}`}>
                <Plus /> Novo lançamento
              </Link>
            </Button>
          </>
        }
      />

      <nav className="mb-4 flex gap-1">
        {[
          { id: "pagar", rotulo: "A pagar" },
          { id: "receber", rotulo: "A receber" },
        ].map((a) => (
          <Link
            key={a.id}
            href={`/financeiro?tipo=${a.id}`}
            className={cn("rounded-md px-4 py-2 text-sm font-medium", tipo === a.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100")}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>

      <form className="mb-4 grid gap-2 rounded-lg border bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
        <input type="hidden" name="tipo" value={tipo} />
        <Input name="q" defaultValue={f.q} placeholder="Descrição ou nº do documento" />
        <select name="situacao" defaultValue={f.situacao ?? ""} className={classeSelect} aria-label="Situação">
          <option value="">Em aberto (abertas, parciais e vencidas)</option>
          {Object.entries(SITUACAO_PARCELA).map(([k, v]) => (
            <option key={k} value={k}>
              {v.texto}
            </option>
          ))}
          <option value="todas">Todas</option>
        </select>
        <select name="obra" defaultValue={f.obra ?? ""} className={classeSelect} aria-label="Obra">
          <option value="">Todas as obras</option>
          <option value="sem-obra">Sem obra (administrativo)</option>
          {obras.map((o) => (
            <option key={o.id} value={o.id}>
              {o.codigo} — {o.nome}
            </option>
          ))}
        </select>
        <select name="pessoa" defaultValue={f.pessoa ?? ""} className={classeSelect} aria-label="Pessoa">
          <option value="">{tipo === "pagar" ? "Todos os fornecedores" : "Todos os clientes"}</option>
          {pessoas.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
        <select name="categoria" defaultValue={f.categoria ?? ""} className={classeSelect} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {categorias
            .filter((c) => c.tipo === (tipo === "pagar" ? "despesa" : "receita"))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
        </select>
        <div className="flex items-center gap-2 sm:col-span-1 lg:col-span-2">
          <span className="text-sm text-muted-foreground">Vencimento</span>
          <Input type="date" name="de" defaultValue={f.de} aria-label="Vencimento de" />
          <Input type="date" name="ate" defaultValue={f.ate} aria-label="Vencimento até" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary">
            Filtrar
          </Button>
          <Button asChild variant="ghost">
            <Link href={`/financeiro?tipo=${tipo}`}>Limpar</Link>
          </Button>
        </div>
      </form>

      <TabelaParcelas linhas={linhas} podePagar />
    </>
  )
}
