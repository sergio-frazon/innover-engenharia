// CSV para abrir no Excel em português: separador ";", BOM UTF-8, CRLF.

export type ColunaCsv<T> = { titulo: string; valor: (linha: T) => string | number | null | undefined }

function celula(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ""
  const texto = typeof v === "number" ? String(v).replace(".", ",") : v
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

export function gerarCsv<T>(colunas: ColunaCsv<T>[], linhas: T[]): string {
  const cabecalho = colunas.map((c) => celula(c.titulo)).join(";")
  const corpo = linhas.map((l) => colunas.map((c) => celula(c.valor(l))).join(";"))
  return "﻿" + [cabecalho, ...corpo].join("\r\n") + "\r\n"
}

export function respostaCsv(conteudo: string, nomeArquivo: string): Response {
  return new Response(conteudo, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
      "Cache-Control": "no-store",
    },
  })
}
