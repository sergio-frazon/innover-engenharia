type ErroBanco = { code?: string; message: string; details?: string | null; hint?: string | null }

/** Traduz um erro do Supabase/Postgres para mensagem ao usuário. */
export function mensagemDeErro(error: ErroBanco | null | undefined): string {
  if (!error) return "Erro desconhecido."
  switch (error.code) {
    case "P0001":
      return error.message
    case "23505":
      return "Já existe um registro com esses dados."
    case "23503":
      return "Este registro está em uso por outros dados e não pode ser removido."
    case "23514":
      return "Algum valor informado não é permitido. Verifique os campos."
    case "42501":
      return "Você não tem permissão para esta ação."
    case "PGRST116":
      return "Registro não encontrado."
    default:
      console.error("Erro do banco:", error)
      return "Não foi possível concluir a operação. Tente novamente."
  }
}
