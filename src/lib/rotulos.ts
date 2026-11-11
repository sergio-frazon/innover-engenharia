// Rótulos e cores de status (docs/06-telas.md: cores consistentes, sempre com texto)

export type Papel = "admin" | "gestor" | "campo" | "financeiro"

export const PAPEIS: Record<Papel, string> = {
  admin: "Administrador",
  gestor: "Gestor / Engenheiro",
  campo: "Equipe de campo",
  financeiro: "Financeiro",
}

export type Tom = "cinza" | "ambar" | "verde" | "vermelho" | "laranja" | "azul"

export const CLASSES_TOM: Record<Tom, string> = {
  cinza: "bg-slate-100 text-slate-700 border-slate-200",
  ambar: "bg-amber-100 text-amber-800 border-amber-200",
  verde: "bg-emerald-100 text-emerald-800 border-emerald-200",
  vermelho: "bg-red-100 text-red-800 border-red-200",
  laranja: "bg-orange-100 text-orange-800 border-orange-200",
  azul: "bg-blue-100 text-blue-800 border-blue-200",
}

type Rotulo = { texto: string; tom: Tom }

export const SITUACAO_OBRA: Record<string, Rotulo> = {
  planejamento: { texto: "Planejamento", tom: "cinza" },
  em_andamento: { texto: "Em andamento", tom: "azul" },
  paralisada: { texto: "Paralisada", tom: "laranja" },
  concluida: { texto: "Concluída", tom: "verde" },
  cancelada: { texto: "Cancelada", tom: "vermelho" },
}

export const STATUS_VERSAO: Record<string, Rotulo> = {
  rascunho: { texto: "Rascunho", tom: "cinza" },
  aprovada: { texto: "Aprovada", tom: "verde" },
  substituida: { texto: "Substituída", tom: "ambar" },
}

export const STATUS_DIARIO: Record<string, Rotulo> = {
  rascunho: { texto: "Rascunho", tom: "cinza" },
  enviado: { texto: "Aguardando conferência", tom: "ambar" },
  correcao_solicitada: { texto: "Correção solicitada", tom: "laranja" },
  aprovado: { texto: "Aprovado", tom: "verde" },
}

export const STATUS_MEDICAO: Record<string, Rotulo> = {
  rascunho: { texto: "Rascunho", tom: "cinza" },
  enviada: { texto: "Aguardando aprovação", tom: "ambar" },
  aprovada: { texto: "Aprovada", tom: "verde" },
  rejeitada: { texto: "Rejeitada", tom: "vermelho" },
}

export const SITUACAO_PRAZO: Record<string, Rotulo> = {
  concluido: { texto: "Concluído", tom: "verde" },
  sem_cronograma: { texto: "Sem cronograma", tom: "cinza" },
  atrasado: { texto: "Atrasado", tom: "vermelho" },
  inicio_atrasado: { texto: "Início atrasado", tom: "vermelho" },
  a_iniciar: { texto: "A iniciar", tom: "cinza" },
  em_risco: { texto: "Em risco", tom: "ambar" },
  no_prazo: { texto: "No prazo", tom: "azul" },
}

export const SITUACAO_PARCELA: Record<string, Rotulo> = {
  aberta: { texto: "Aberta", tom: "azul" },
  parcial: { texto: "Parcial", tom: "ambar" },
  paga: { texto: "Paga", tom: "verde" },
  vencida: { texto: "Vencida", tom: "vermelho" },
  cancelada: { texto: "Cancelada", tom: "cinza" },
}

export const NATUREZA: Record<string, string> = {
  material: "Material",
  mao_de_obra: "Mão de obra",
  equipamento: "Equipamento",
  outro: "Outro",
}

export const CLIMA: Record<string, string> = {
  bom: "Bom",
  nublado: "Nublado",
  chuva_fraca: "Chuva fraca",
  chuva_forte: "Chuva forte",
  impraticavel: "Impraticável",
}

export const TIPO_OCORRENCIA: Record<string, string> = {
  ocorrencia: "Ocorrência",
  impedimento: "Impedimento",
  visita: "Visita",
  acidente: "Acidente",
  entrega: "Entrega",
  outro: "Outro",
}

export const CATEGORIA_DOCUMENTO: Record<string, string> = {
  projeto: "Projeto",
  planta: "Planta",
  memorial: "Memorial",
  contrato: "Contrato",
  licenca: "Licença",
  outro: "Outro",
}

export const FORMA_PAGAMENTO: Record<string, string> = {
  pix: "Pix",
  boleto: "Boleto",
  transferencia: "Transferência",
  dinheiro: "Dinheiro",
  cartao: "Cartão",
  cheque: "Cheque",
  outro: "Outro",
}

export const UNIDADES = ["un", "m", "m²", "m³", "kg", "t", "l", "h", "dia", "mês", "vb", "cj", "pç"]

export const GRAVIDADE: Record<string, Rotulo> = {
  alta: { texto: "Alta", tom: "vermelho" },
  media: { texto: "Média", tom: "ambar" },
  baixa: { texto: "Baixa", tom: "cinza" },
}
