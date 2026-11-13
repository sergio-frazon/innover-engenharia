import { describe, expect, it } from "vitest"
import { data, diferencaDias, documentoFormatado, lerNumero, moeda, percentual, quantidade, somarDias } from "./format"
import { cnpjValido, cpfValido } from "./documentos-br"
import { mensagemDeErro } from "./erros"
import { gerarCsv } from "./csv"
import { caminhoInterno } from "./redirecionamento"
import { dividirParcelas, somaParcelas } from "./parcelas"
import { idsReferenciados, resumoMudancas, rotulo } from "./auditoria"

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
  it("neutraliza fórmulas do Excel em textos", () => {
    const csv = gerarCsv([{ titulo: "Descrição", valor: (l: { d: string; v: number }) => l.d }, { titulo: "Valor", valor: (l) => l.v }], [
      { d: "=HYPERLINK(\"http://x\")", v: -5 },
      { d: "@SOMA(A1)", v: 1 },
    ])
    expect(csv).toContain("'=HYPERLINK")
    expect(csv).toContain("'@SOMA(A1)")
    expect(csv).toContain(";-5")
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

describe("redirecionamento", () => {
  it("aceita só caminhos internos", () => {
    expect(caminhoInterno("/obras/1")).toBe("/obras/1")
    expect(caminhoInterno("//site.com")).toBe("/painel")
    expect(caminhoInterno("/\\site.com")).toBe("/painel")
    expect(caminhoInterno("https://site.com")).toBe("/painel")
    expect(caminhoInterno("/a\nb")).toBe("/painel")
    expect(caminhoInterno(null)).toBe("/painel")
  })
})

describe("auditoria", () => {
  const ana = "10000000-0000-0000-0000-000000000001"

  it("nomes de coluna legíveis e com acento", () => {
    expect(rotulo("duracao_dias")).toBe("duração (dias)")
    expect(rotulo("inicio_previsto")).toBe("início previsto")
    expect(rotulo("responsavel_id")).toBe("responsável")
  })

  it("valores sem UUID, ISO nem número cru", () => {
    const linhas = resumoMudancas(
      "UPDATE",
      { status: "rascunho", aprovada_em: null, aprovada_por: null, valor_total: 100, fim_previsto: "2026-11-20" },
      { status: "aguardando_conferencia", aprovada_em: "2026-11-12T23:10:41.679906+00:00", aprovada_por: ana, valor_total: 1234.5, fim_previsto: "2026-11-25" },
      { [ana]: "Ana Administradora" },
    ).map((l) => l.replace(/\s/g, " "))
    expect(linhas).toEqual([
      "situação: rascunho → aguardando conferência",
      "aprovada em: vazio → 12/11/2026, 20:10",
      "aprovada por: vazio → Ana Administradora",
      "valor total: R$ 100,00 → R$ 1.234,50",
      "fim previsto: 20/11/2026 → 25/11/2026",
    ])
  })

  it("status de uma palavra também ganha acento", () => {
    expect(resumoMudancas("UPDATE", { status: "aprovada" }, { status: "substituida" })).toEqual(["situação: aprovada → substituída"])
  })

  it("id desconhecido não aparece cru", () => {
    expect(resumoMudancas("UPDATE", { etapa_id: null }, { etapa_id: ana })).toEqual(["etapa: vazio → outro registro"])
  })

  it("coleta os ids referenciados, ignorando colunas técnicas", () => {
    expect(idsReferenciados([{ antes: { id: ana, obra_id: ana }, depois: { aprovada_por: ana, nome: "x" } }])).toEqual([ana])
  })
})
