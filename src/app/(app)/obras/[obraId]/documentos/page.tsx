import { FileText } from "lucide-react"
import { EstadoVazio } from "@/components/comum/pagina"
import { BaixarArquivo } from "@/components/comum/baixar-arquivo"
import { exigirUsuario, temPapel } from "@/lib/auth"
import { getObra, obraFechada } from "@/lib/obras"
import { createClient } from "@/lib/supabase/server"
import { data, dataHora } from "@/lib/format"
import { CATEGORIA_DOCUMENTO } from "@/lib/rotulos"
import { EnviarDocumento, VersoesDocumento } from "./enviar"

function tamanho(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`
}

export default async function PaginaDocumentos({
  params,
  searchParams,
}: {
  params: Promise<{ obraId: string }>
  searchParams: Promise<{ categoria?: string; etapa?: string }>
}) {
  const { obraId } = await params
  const f = await searchParams
  const usuario = await exigirUsuario()
  const obra = await getObra(obraId)
  const supabase = await createClient()

  let consulta = supabase.from("v_documentos_atuais").select("*").eq("obra_id", obra.id).order("titulo")
  if (f.categoria) consulta = consulta.eq("categoria", f.categoria)
  if (f.etapa) consulta = consulta.eq("etapa_id", f.etapa)

  const [{ data: docs }, { data: todas }, { data: etapas }, { data: perfis }] = await Promise.all([
    consulta,
    supabase.from("documentos").select("id, grupo_id, versao, nome_arquivo, caminho_arquivo, tamanho_bytes, observacao, criado_em, criado_por").eq("obra_id", obra.id).order("versao", { ascending: false }),
    supabase.from("etapas").select("id, codigo, nome").eq("obra_id", obra.id).eq("ativo", true).order("ordem"),
    supabase.from("perfis").select("id, nome"),
  ])

  const nomes = new Map((perfis ?? []).map((p) => [p.id, p.nome]))
  const etapaNome = new Map((etapas ?? []).map((e) => [e.id, `${e.codigo}. ${e.nome}`]))
  const podeEnviar = temPapel(usuario, "admin", "gestor", "campo") && (!obraFechada(obra.situacao) || usuario.papel === "admin")
  const listaEtapas = (etapas ?? []).map((e) => ({ id: e.id, nome: `${e.codigo}. ${e.nome}` }))

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <form className="flex flex-wrap gap-2">
          <select name="categoria" defaultValue={f.categoria ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Categoria">
            <option value="">Todas as categorias</option>
            {Object.entries(CATEGORIA_DOCUMENTO).map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
          <select name="etapa" defaultValue={f.etapa ?? ""} className="h-9 rounded-md border bg-white px-3 text-sm" aria-label="Etapa">
            <option value="">Todas as etapas</option>
            {listaEtapas.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
          <button type="submit" className="h-9 rounded-md border bg-white px-3 text-sm hover:bg-slate-50">
            Filtrar
          </button>
        </form>
        {podeEnviar && <EnviarDocumento obraId={obra.id} etapas={listaEtapas} />}
      </div>

      {(docs ?? []).length === 0 ? (
        <EstadoVazio icone={<FileText className="size-8" />} titulo="Nenhum documento." descricao="Envie projetos, plantas, memoriais e contratos da obra." />
      ) : (
        <ul className="grid gap-3">
          {(docs ?? []).map((d) => {
            const versoes = (todas ?? []).filter((v) => v.grupo_id === d.grupo_id)
            return (
              <li key={d.grupo_id!} className="flex flex-col gap-3 rounded-lg border bg-white p-4 sm:flex-row sm:items-center">
                <FileText className="hidden size-8 shrink-0 text-slate-400 sm:block" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {d.titulo} <span className="text-sm font-normal text-muted-foreground">· versão {d.versao}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {CATEGORIA_DOCUMENTO[d.categoria!]}
                    {d.etapa_id && ` · ${etapaNome.get(d.etapa_id) ?? ""}`} · {d.nome_arquivo} · {tamanho(d.tamanho_bytes!)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Enviado por {nomes.get(d.criado_por!) ?? "—"} em {dataHora(d.criado_em)}
                    {d.observacao && ` · ${d.observacao}`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <BaixarArquivo bucket="documentos" caminho={d.caminho_arquivo!} />
                  {versoes.length > 1 && (
                    <VersoesDocumento
                      titulo={d.titulo!}
                      versoes={versoes.map((v) => ({
                        id: v.id,
                        versao: v.versao,
                        nome: v.nome_arquivo,
                        caminho: v.caminho_arquivo,
                        detalhe: `${data(v.criado_em)} · ${nomes.get(v.criado_por ?? "") ?? "—"}${v.observacao ? ` · ${v.observacao}` : ""}`,
                      }))}
                    />
                  )}
                  {podeEnviar && (
                    <EnviarDocumento
                      obraId={obra.id}
                      etapas={listaEtapas}
                      novaVersaoDe={{ grupo_id: d.grupo_id!, titulo: d.titulo!, categoria: d.categoria!, etapa_id: d.etapa_id }}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
