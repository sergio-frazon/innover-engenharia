import { z } from "zod"
import { lerNumero } from "./format"

/** Retorno de toda Server Action: sucesso (com mensagem/id opcionais) ou erro geral + erros por campo. */
export type Resultado = { ok: true; id?: string; mensagem?: string } | { ok: false; erro: string; campos?: Record<string, string> }

/** Primeiro erro de cada campo, pela chave do campo ("parcelas.0.valor"). */
function errosDeCampo(erro: z.ZodError): Record<string, string> {
  const campos: Record<string, string> = {}
  for (const issue of erro.issues) {
    const chave = issue.path.join(".")
    if (!campos[chave]) campos[chave] = issue.message
  }
  return campos
}

/** Falha de validação do zod no formato que os formulários exibem. */
export function falhaValidacao(erro: z.ZodError): Resultado {
  return { ok: false, erro: "Verifique os campos destacados.", campos: errosDeCampo(erro) }
}

// Campos de formulário ------------------------------------------------------
// FormData só traz texto: estes construtores convertem (número pt-BR, vazio → null, "on" → true)
// e já carregam as mensagens em português mostradas abaixo de cada campo.

const vazioParaNull = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v)

/** Texto obrigatório (espaços nas pontas são removidos). */
export const texto = (mensagem = "Campo obrigatório.") => z.string({ error: mensagem }).trim().min(1, mensagem)

/** Texto opcional: vazio vira null. */
export const textoOpcional = z.preprocess(vazioParaNull, z.string().trim().nullable().optional()).transform((v) => v ?? null)

/** Id obrigatório (select). `z.guid` aceita os ids fixos do seed, que não são UUID v4. */
export const uuid = (mensagem = "Selecione uma opção.") => z.guid({ error: mensagem })

/** Id opcional: vazio vira null. */
export const uuidOpcional = z.preprocess(vazioParaNull, z.guid().nullable().optional()).transform((v) => v ?? null)

/** Data obrigatória no formato do <input type="date"> (aaaa-mm-dd). */
export const dataISO = (mensagem = "Informe a data.") =>
  z.string({ error: mensagem }).regex(/^\d{4}-\d{2}-\d{2}$/, mensagem)

/** Data opcional: vazio vira null. */
export const dataOpcional = z
  .preprocess(vazioParaNull, z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.").nullable().optional())
  .transform((v) => v ?? null)

/** Hora opcional (hh:mm ou hh:mm:ss): vazio vira null. */
export const horaOpcional = z
  .preprocess(vazioParaNull, z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida.").nullable().optional())
  .transform((v) => v ?? null)

/** Número digitado em pt-BR ("1.234,56"), com limites opcionais. */
export const numeroBR = (opcoes: { min?: number; positivo?: boolean; mensagem?: string } = {}) =>
  z.preprocess(
    (v) => lerNumero(v),
    z
      .number({ error: opcoes.mensagem ?? "Informe um número." })
      .refine((n) => (opcoes.positivo ? n > 0 : true), "Informe um valor maior que zero.")
      .refine((n) => (opcoes.min !== undefined ? n >= opcoes.min : true), `O valor mínimo é ${opcoes.min}.`),
  )

/** Número pt-BR opcional: vazio vira null. */
export const numeroOpcional = z.preprocess((v) => lerNumero(v), z.number().nullable()).transform((v) => v ?? null)

/** Checkbox: marcado chega como "on". */
export const booleano = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean())
