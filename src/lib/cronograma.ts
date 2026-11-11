import { diferencaDias, somarDias } from "./format"

export type Periodo = { inicio: string; fim: string }
export type Dependencia = { servico_id: string; predecessor_id: string }

/**
 * R-PRZ-04 "Empurrar sucessores": depois de mudar as datas de `alterado`,
 * desloca (mantendo a duração) cada sucessor que passaria a começar antes ou
 * no mesmo dia do término do predecessor. Propaga em cadeia.
 * Retorna só as atividades que mudaram (sem incluir `alterado`).
 */
export function empurrarSucessores(
  atividades: Record<string, Periodo>,
  dependencias: Dependencia[],
  alterado: string,
): Record<string, Periodo> {
  const datas: Record<string, Periodo> = Object.fromEntries(Object.entries(atividades).map(([k, v]) => [k, { ...v }]))
  const ajustes: Record<string, Periodo> = {}
  const fila = [alterado]
  let passos = 0

  while (fila.length) {
    if (++passos > 10_000) throw new Error("Dependências em ciclo.")
    const atual = fila.shift()!
    const fimAtual = datas[atual]?.fim
    if (!fimAtual) continue
    for (const d of dependencias.filter((x) => x.predecessor_id === atual)) {
      const suc = datas[d.servico_id]
      if (!suc) continue
      if (suc.inicio <= fimAtual) {
        const novoInicio = somarDias(fimAtual, 1)
        const desloc = diferencaDias(suc.inicio, novoInicio)
        const novo = { inicio: novoInicio, fim: somarDias(suc.fim, desloc) }
        datas[d.servico_id] = novo
        ajustes[d.servico_id] = novo
        fila.push(d.servico_id)
      }
    }
  }
  return ajustes
}

/** Dependências que ficariam inválidas com as datas informadas */
export function dependenciasInvalidas(atividades: Record<string, Periodo>, dependencias: Dependencia[]): Dependencia[] {
  return dependencias.filter((d) => {
    const s = atividades[d.servico_id]
    const p = atividades[d.predecessor_id]
    return s && p && s.inicio <= p.fim
  })
}

/** Cria ciclo se `servico` passar a depender de `predecessor`? */
export function criaCiclo(dependencias: Dependencia[], servico: string, predecessor: string): boolean {
  if (servico === predecessor) return true
  const visitados = new Set<string>()
  const pilha = [predecessor]
  while (pilha.length) {
    const x = pilha.pop()!
    if (x === servico) return true
    if (visitados.has(x)) continue
    visitados.add(x)
    for (const d of dependencias) if (d.servico_id === x) pilha.push(d.predecessor_id)
  }
  return false
}
