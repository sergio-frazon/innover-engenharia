"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"
import { falhaValidacao, texto, textoOpcional, uuid, uuidOpcional, type Resultado } from "@/lib/acoes"
import { EQUIPE_DA_OBRA, falha } from "@/lib/acao-servidor"
import { SEM_PERMISSAO, usuarioDaAcao } from "@/lib/auth"

const documentoSchema = z.object({
  obra_id: uuid(),
  grupo_id: uuidOpcional,
  etapa_id: uuidOpcional,
  titulo: texto("Informe o título."),
  categoria: z.enum(["projeto", "planta", "memorial", "contrato", "licenca", "outro"], { error: "Selecione a categoria." }),
  observacao: textoOpcional,
  caminho_arquivo: texto(),
  nome_arquivo: texto(),
  tipo_mime: texto(),
  tamanho_bytes: z.number().int().positive(),
})

/**
 * Registra no banco um arquivo que o navegador já enviou ao Storage (upload direto, com progresso).
 * Com `grupo_id`, vira uma nova versão do documento (R-DOC-03).
 */
export async function registrarDocumento(entrada: z.input<typeof documentoSchema>): Promise<Resultado> {
  if (!(await usuarioDaAcao(...EQUIPE_DA_OBRA))) return SEM_PERMISSAO
  const dados = documentoSchema.safeParse(entrada)
  if (!dados.success) return falhaValidacao(dados.error)
  // O arquivo precisa estar na pasta da própria obra (a política do Storage também exige)
  if (!dados.data.caminho_arquivo.startsWith(`${dados.data.obra_id}/`)) return { ok: false, erro: "Arquivo inválido." }

  const supabase = await createClient()
  const { grupo_id, ...resto } = dados.data
  const { error } = await supabase.from("documentos").insert({ ...resto, ...(grupo_id ? { grupo_id } : {}) })
  if (error) return falha(error)
  revalidatePath(`/obras/${dados.data.obra_id}/documentos`)
  return { ok: true, mensagem: grupo_id ? "Nova versão enviada." : "Documento enviado." }
}

/** Link de download válido por 60 s; o Storage só assina se o usuário puder ler o arquivo. */
export async function linkDeDownload(bucket: "documentos" | "comprovantes", caminho: string): Promise<Resultado & { url?: string }> {
  if (!(await usuarioDaAcao())) return SEM_PERMISSAO
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(caminho, 60, { download: true })
  if (error || !data) return { ok: false, erro: "Arquivo não encontrado ou sem permissão." }
  return { ok: true, url: data.signedUrl }
}
