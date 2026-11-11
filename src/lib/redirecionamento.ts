// Destino de redirecionamento vindo da URL (?voltar=, ?next=): só caminhos internos.
// Bloqueia "//site", "/\site" (navegadores tratam "\" como "/") e caracteres de controle.
// Sem regex de propósito: o compilador do Next reescrevia os escapes da classe de caracteres.
export function caminhoInterno(destino: string | null | undefined, padrao = "/painel"): string {
  if (!destino || !destino.startsWith("/") || destino.startsWith("//")) return padrao
  for (const c of destino) {
    const codigo = c.charCodeAt(0)
    if (c === "\\" || codigo < 32 || codigo === 127) return padrao
  }
  return destino
}
