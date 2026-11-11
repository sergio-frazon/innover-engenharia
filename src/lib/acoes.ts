import { z } from "zod"
import { lerNumero } from "./format"

export type Resultado = { ok: true; id?: string; mensagem?: string } | { ok: false; erro: string; campos?: Record<string, string> }

export const resultadoInicial: Resultado | null = null

export function errosDeCampo(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of erro.issues) {
    const chave = issue.path.join(".")
    if (!campos[chave]) campos[chave] = issue.message
  }
  return campos
}

export function falhaValidacao(erro: z.ZodError): Resultado {
  return { ok: false, erro: "Verifique os campos destacados.", campos: errosDeCampo(erro) }
}

// Campos de formulário ------------------------------------------------------

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)

export const texto = (mensagem = "Campo obrigatório.") => z.string({ error: mensagem }).trim().min(1, mensagem)

export const textoOpcional = z.preprocess(vazioParaNull, z.string().trim().nullable().optional()).transform((v) => v ?? null)

export const uuid = (mensagem = "Selecione uma opção.") => z.guid({ error: mensagem })

export const uuidOpcional = z.preprocess(vazioParaNull, z.guid().nullable().optional()).transform((v) => v ?? null)

export const dataISO = (mensagem = "Informe a data.") =>
  z.string({ error: mensagem }).regex(/^\d{4}-\d{2}-\d{2}$/, mensagem)

export const dataOpcional = z
  .preprocess(vazioParaNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable().optional())
  .transform((v) => v ?? null)

export const horaOpcional = z
  .preprocess(vazioParaNull, z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida.").nullable().optional())
  .transform((v) => v ?? null)

export const numeroBR = (opcoes: { min?: number; positivo?: boolean; mensagem?: string } = {}) =>
  z.preprocess(
    (v) => lerNumero(v),
    z
      .number({ error: opcoes.mensagem ?? "Informe um número." })
      .refine((n) => (opcoes.positivo ? n > 0 : true), "Informe um valor maior que zero.")
      .refine((n) => (opcoes.min !== undefined ? n >= opcoes.min : true), `O valor mínimo é ${opcoes.min}.`),
  )

export const numeroOpcional = z.preprocess((v) => lerNumero(v), z.number().nullable()).transform((v) => v ?? null)

export const booleano = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())

export function formParaObjeto(formData: FormData): Record<string, FormDataEntryValue> {
  const obj: Record<string, FormDataEntryValue> = {}
  for (const [k, v] of formData.entries()) {
    if (!k.startsWith("$ACTION")) obj[k] = v
  }
  return obj
}
