"use client"

import { createClient } from "@/lib/supabase/client"

export const LIMITES = {
  documentos: {
    bytes: 50 * 1024 * 1024,
    extensoes: ["pdf", "dwg", "dxf", "jpg", "jpeg", "png", "xlsx", "xls", "docx", "doc", "zip"],
    rotulo: "PDF, DWG, DXF, JPG, PNG, XLS(X), DOC(X) ou ZIP, até 50 MB",
  },
  comprovantes: {
    bytes: 10 * 1024 * 1024,
    extensoes: ["pdf", "jpg", "jpeg", "png"],
    rotulo: "PDF, JPG ou PNG, até 10 MB",
  },
} as const

export type Bucket = keyof typeof LIMITES

export function validarArquivo(bucket: Bucket, arquivo: File): string | null {
  const ext = arquivo.name.split(".").pop()?.toLowerCase() ?? ""
  if (!(LIMITES[bucket].extensoes as readonly string[]).includes(ext)) return `Tipo de arquivo não aceito. Use ${LIMITES[bucket].rotulo}.`
  if (arquivo.size > LIMITES[bucket].bytes) return `Arquivo muito grande. Limite: ${LIMITES[bucket].rotulo}.`
  if (arquivo.size === 0) return "O arquivo está vazio."
  return null
}

function nomeSeguro(nome: string) {
  const [base, ...resto] = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").split(".")
  const ext = resto.pop()
  const limpo = [base, ...resto].join(".").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(0, 80) || "arquivo"
  return ext ? `${limpo}.${ext.toLowerCase()}` : limpo
}

function tipoMime(arquivo: File) {
  if (arquivo.type) return arquivo.type
  const ext = arquivo.name.split(".").pop()?.toLowerCase()
  return ext === "dwg" ? "image/vnd.dwg" : ext === "dxf" ? "application/dxf" : "application/octet-stream"
}

/**
 * Envia o arquivo ao Storage com progresso (XHR direto na API, com o token do usuário).
 * Caminho: {pasta}/{uuid}/{nome}. Retorna o caminho gravado.
 */
export async function enviarArquivo(bucket: Bucket, pasta: string, arquivo: File, aoProgredir?: (pct: number) => void) {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) throw new Error("Sessão expirada. Entre novamente.")

  const caminho = `${pasta}/${crypto.randomUUID()}/${nomeSeguro(arquivo.name)}`
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${caminho.split("/").map(encodeURIComponent).join("/")}`
  const mime = tipoMime(arquivo)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", url)
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`)
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    xhr.setRequestHeader("Content-Type", mime)
    xhr.setRequestHeader("x-upsert", "false")
    xhr.upload.onprogress = (e) => e.lengthComputable && aoProgredir?.(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(mensagemUpload(xhr.status))))
    xhr.onerror = () => reject(new Error("Falha de conexão durante o envio. Tente novamente."))
    xhr.send(arquivo)
  })

  return { caminho, mime }
}

function mensagemUpload(status: number) {
  if (status === 413) return "Arquivo maior que o permitido."
  if (status === 415) return "Tipo de arquivo não aceito."
  if (status === 401 || status === 403) return "Você não tem permissão para enviar arquivos aqui."
  return "Não foi possível enviar o arquivo."
}
