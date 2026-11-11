import { describe, it, expect } from "vitest"
import { z } from "zod"
import { texto, uuid, uuidOpcional, numeroBR, dataISO, textoOpcional, numeroOpcional } from "./acoes"

const msg = (r: { success: boolean; error?: z.ZodError }) => (r.success ? "OK" : r.error!.issues[0].message)
describe("validação de formulários (zod 4)", () => {
  it("mensagens em português", () => {
    const s = z.object({ nome: texto("Informe o nome."), obra: uuid(), valor: numeroBR({ positivo: true }), data: dataISO(), tipo: z.enum(["a", "b"], { error: "Selecione o tipo." }) })
    expect(msg(s.safeParse({}))).toBe("Informe o nome.")
    const r = s.safeParse({ nome: "  ", obra: "x", valor: "abc", data: "", tipo: "z" })
    expect(r.success).toBe(false)
    const m = Object.fromEntries(r.error!.issues.map((i) => [i.path.join("."), i.message]))
    expect(m).toEqual({ nome: "Informe o nome.", obra: "Selecione uma opção.", valor: "Informe um número.", data: "Informe a data.", tipo: "Selecione o tipo." })
    expect(msg(s.safeParse({ nome: "A", obra: "60000000-0000-0000-0000-00000000000a", valor: "1.234,50", data: "2026-11-11", tipo: "a" }))).toBe("OK")
    expect(s.parse({ nome: " A ", obra: "60000000-0000-0000-0000-00000000000a", valor: "1.234,50", data: "2026-11-11", tipo: "a" }).valor).toBe(1234.5)
    expect(msg(z.object({ v: numeroBR({ positivo: true }) }).safeParse({ v: "0" }))).toBe("Informe um valor maior que zero.")
    expect(z.object({ o: uuidOpcional, t: textoOpcional, n: numeroOpcional }).parse({ o: "", t: "", n: "" })).toEqual({ o: null, t: null, n: null })
  })
})
