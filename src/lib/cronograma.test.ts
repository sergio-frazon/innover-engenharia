import { describe, expect, it } from "vitest"
import { criaCiclo, dependenciasInvalidas, empurrarSucessores } from "./cronograma"

const deps = [
  { servico_id: "B", predecessor_id: "A" },
  { servico_id: "C", predecessor_id: "B" },
  { servico_id: "D", predecessor_id: "A" },
]

describe("empurrarSucessores", () => {
  it("desloca a cadeia mantendo a duração", () => {
    const ativ = {
      A: { inicio: "2026-01-01", fim: "2026-01-15" }, // A foi esticada
      B: { inicio: "2026-01-11", fim: "2026-01-20" },
      C: { inicio: "2026-01-21", fim: "2026-01-25" },
      D: { inicio: "2026-02-01", fim: "2026-02-05" },
    }
    const r = empurrarSucessores(ativ, deps, "A")
    expect(r.B).toEqual({ inicio: "2026-01-16", fim: "2026-01-25" })
    expect(r.C).toEqual({ inicio: "2026-01-26", fim: "2026-01-30" })
    expect(r.D).toBeUndefined() // já começava depois
  })

  it("não mexe quando tudo está válido", () => {
    const ativ = {
      A: { inicio: "2026-01-01", fim: "2026-01-05" },
      B: { inicio: "2026-01-06", fim: "2026-01-10" },
    }
    expect(empurrarSucessores(ativ, deps, "A")).toEqual({})
  })
})

describe("validações", () => {
  it("encontra dependências inválidas", () => {
    const ativ = { A: { inicio: "2026-01-01", fim: "2026-01-10" }, B: { inicio: "2026-01-10", fim: "2026-01-12" } }
    expect(dependenciasInvalidas(ativ, deps)).toEqual([{ servico_id: "B", predecessor_id: "A" }])
  })
  it("detecta ciclos", () => {
    expect(criaCiclo(deps, "A", "C")).toBe(true) // A depender de C fecharia A→B→C→A
    expect(criaCiclo(deps, "D", "C")).toBe(false)
    expect(criaCiclo(deps, "A", "A")).toBe(true)
  })
})
