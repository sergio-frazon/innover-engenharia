// CSV para abrir no Excel em português: separador ";", BOM UTF-8, CRLF.

export type ColunaCsv<T> = { titulo: string; valor: (linha: T) => string | number | null | undefined }

function celula(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ""
  // Texto começando com = + - @ (ou tab/CR) vira fórmula no Excel: prefixa com ' para ficar só texto
  const texto = typeof v === "number" ? String(v).replace(".", ",") : /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

/** Monta o CSV a partir de colunas declarativas (título + função que extrai o valor da linha). */
export function gerarCsv<T>(colunas: ColunaCsv<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(";")
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(";"))
  return "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n"
}

/** Resposta HTTP de download, sem cache (os dados mudam e dependem de quem pede). */
export function respostaCsv(conteudo: string, nomeArquivo: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  })
}

/** Resposta das exportações para quem não pode ver o dado: 404, como as páginas (docs/06-telas.md). */
export function naoEncontrado(): Response {
  return new Response(null, { status: 404 })
}
