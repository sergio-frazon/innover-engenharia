import { describe, expect, it } from "vitest"
import { data, diferencaDias, documentoFormatado, lerNumero, moeda, percentual, quantidade, somarDias } from "./format"
import { cnpjValido, cpfValido } from "./documentos-br"
import { mensagemDeErro } from "./erros"
import { gerarCsv } from "./csv"
import { dividirParcelas, somaParcelas } from "./parcelas"

describe("format", () => {
  it("moeda em reais", () => {
    expect(moeda(1234.5).replace(/\s/g, " ")).toBe("R$ 1.234,50")
    expect(moeda(null)).toBe("—")
  })
  it("quantidade sem zeros à direita", () => {
    expect(quantidade("200.0000", "m²")).toBe("200 m²")
    expect(quantidade(12.5)).toBe("12,5")
  })
  it("percentual com 1 casa", () => {
    expect(percentual(81.25)).toBe("81,3%")
    expect(percentual(7.5)).toBe("7,5%")
  })
  it("data sem mudar o dia por fuso", () => {
    expect(data("2026-11-01")).toBe("01/11/2026")
    expect(data(null)).toBe("—")
  })
  it("lê números digitados no padrão brasileiro", () => {
    expect(lerNumero("1.234,56")).toBe(1234.56)
    expect(lerNumero("1234,5")).toBe(1234.5)
    expect(lerNumero("1234.5")).toBe(1234.5)
    expect(lerNumero("1.000")).toBe(1000)
    expect(lerNumero("R$ 2.500,00")).toBe(2500)
    expect(lerNumero("")).toBeNull()
    expect(lerNumero("abc")).toBeNull()
  })
  it("aritmética de datas", () => {
    expect(somarDias("2026-02-27", 2)).toBe("2026-03-01")
    expect(diferencaDias("2026-01-01", "2026-01-31")).toBe(30)
  })
  it("formata CPF e CNPJ", () => {
    expect(documentoFormatado("12345678909")).toBe("123.456.789-09")
    expect(documentoFormatado("11222333000181")).toBe("11.222.333/0001-81")
  })
})

describe("documentos", () => {
  it("valida CPF", () => {
    expect(cpfValido("123.456.789-09")).toBe(true)
    expect(cpfValido("123.456.789-00")).toBe(false)
    expect(cpfValido("111.111.111-11")).toBe(false)
  })
  it("valida CNPJ", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true)
    expect(cnpjValido("11.222.333/0001-80")).toBe(false)
  })
})

describe("erros", () => {
  it("repassa mensagens de regra de negócio", () => {
    expect(mensagemDeErro({ code: "P0001", message: "Regra X" })).toBe("Regra X")
    expect(mensagemDeErro({ code: "23505", message: "dup" })).toBe("Já existe um registro com esses dados.")
  })
})

describe("csv", () => {
  it("gera CSV com BOM, ponto e vírgula e aspas", () => {
    const csv = gerarCsv(
      [
        { titulo: "Nome", valor: (l: { n: string; v: number }) => l.n },
        { titulo: "Valor", valor: (l) => l.v },
      ],
      [{ n: 'Bloco "A"; térreo', v: 10.5 }],
    )
    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv).toContain('"Bloco ""A""; térreo";10,5')
  })
})

describe("parcelas", () => {
  it("divide com a diferença de centavos na última", () => {
    const p = dividirParcelas(1000, 3, "2026-01-31")
    expect(p.map((x) => x.valor)).toEqual([333.33, 333.33, 333.34])
    expect(somaParcelas(p)).toBe(1000)
  })
  it("respeita o último dia do mês", () => {
    const p = dividirParcelas(300, 3, "2026-01-31")
    expect(p.map((x) => x.vencimento)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"])
  })
})
