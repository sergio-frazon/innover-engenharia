/**
 * Ataques diretos à API do Supabase (sem passar pelas telas), com cada perfil do seed.
 * Cada caso descreve o que um usuário mal-intencionado tentaria e confere que foi barrado.
 *
 * SOMENTE LOCAL. Precisa do banco recém-resetado (`npx supabase db reset`) e do .env.local.
 *   npx tsx scripts/teste-seguranca.ts
 */
import { readFileSync } from "node:fs"

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
)
const URL_API = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!/127\.0\.0\.1|localhost/.test(URL_API)) throw new Error("Este teste só roda contra o Supabase local.")

const SENHA = "Teste@2026"
const OBRA_A = "60000000-0000-0000-0000-00000000000a"
const OBRA_C = "60000000-0000-0000-0000-00000000000c"

type Resposta = { status: number; corpo: unknown }
async function req(metodo: string, caminho: string, token: string | null, corpo?: unknown, extra: Record<string, string> = {}): Promise<Resposta> {
  const r = await fetch(`${URL_API}${caminho}`, {
    method: metodo,
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...extra,
    },
    body: corpo === undefined ? undefined : typeof corpo === "string" ? corpo : JSON.stringify(corpo),
  })
  const texto = await r.text()
  let json: unknown = texto
  try {
    json = JSON.parse(texto)
  } catch {}
  return { status: r.status, corpo: json }
}

async function entrar(email: string): Promise<string | null> {
  const r = await req("POST", "/auth/v1/token?grant_type=password", null, { email, password: SENHA })
  return (r.corpo as { access_token?: string }).access_token ?? null
}

async function servico<T>(caminho: string): Promise<T> {
  const r = await fetch(`${URL_API}/rest/v1/${caminho}`, { headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}` } })
  return (await r.json()) as T
}

let falhas = 0
let total = 0
function conferir(descricao: string, barrado: boolean, detalhe?: unknown) {
  total++
  if (barrado) console.log(`  ok    ${descricao}`)
  else {
    falhas++
    console.log(`  FALHA ${descricao}\n        ${JSON.stringify(detalhe ?? ultima).slice(0, 300)}`)
  }
}
let ultima: Resposta | null = null
const vazioOuNegado = (r: Resposta) => (ultima = r) && r.status >= 400 || (Array.isArray(r.corpo) && r.corpo.length === 0)
const negado = (r: Resposta) => (ultima = r) && r.status >= 400 || (Array.isArray(r.corpo) && r.corpo.length === 0)

const TABELAS = [
  "perfis", "auditoria", "pessoas", "v_pessoas_basico", "v_materiais_basico", "profissionais", "materiais", "equipamentos", "categorias_financeiras",
  "obras", "obra_membros", "etapas", "servicos", "documentos", "v_documentos_atuais", "orcamento_versoes", "orcamento_itens",
  "cronograma_versoes", "cronograma_atividades", "cronograma_dependencias", "diarios", "diario_equipe", "diario_equipamentos",
  "diario_materiais", "diario_ocorrencias", "medicoes", "lancamentos", "parcelas", "baixas", "v_alertas", "v_custo_obra",
  "v_custo_previsto_realizado", "v_fluxo_caixa", "v_parcelas_situacao", "v_orcamento_totais_etapa", "v_orcamento_totais_servico",
]
const FINANCEIRAS = [
  "orcamento_versoes", "orcamento_itens", "lancamentos", "parcelas", "baixas", "v_custo_obra", "v_custo_previsto_realizado",
  "v_fluxo_caixa", "v_parcelas_situacao", "v_orcamento_totais_etapa", "v_orcamento_totais_servico", "pessoas",
]

async function main() {
  // Ids reais (lidos com a chave de serviço) para os ataques mirarem em dados que existem
  const [diarioA] = await servico<{ id: string }[]>(`diarios?obra_id=eq.${OBRA_A}&status=eq.enviado&select=id&limit=1`)
  const [servicoC] = await servico<{ id: string }[]>(`servicos?obra_id=eq.${OBRA_C}&select=id&limit=1`)
  const [servicoA] = await servico<{ id: string }[]>(`servicos?obra_id=eq.${OBRA_A}&select=id&limit=1`)
  const [lancA] = await servico<{ id: string; valor_total: number }[]>(`lancamentos?obra_id=eq.${OBRA_A}&cancelado=eq.false&select=id,valor_total&limit=1`)
  const [baixa] = await servico<{ id: string }[]>(`baixas?select=id&limit=1`)
  const [orcA] = await servico<{ id: string }[]>(`orcamento_versoes?obra_id=eq.${OBRA_A}&status=eq.aprovada&select=id&limit=1`)
  const [catPagar] = await servico<{ id: string }[]>(`categorias_financeiras?tipo=eq.despesa&select=id&limit=1`)
  const [perfilAdmin] = await servico<{ id: string }[]>(`perfis?email=eq.admin@teste.local&select=id`)

  // ---------------------------------------------------------------------------
  console.log("\nVisitante sem login (anon)")
  for (const t of TABELAS) conferir(`não lê ${t}`, vazioOuNegado(await req("GET", `/rest/v1/${t}?select=*&limit=1`, null)))
  conferir("não cria obra", negado(await req("POST", "/rest/v1/obras", null, { nome: "x" })))
  conferir("não cria lançamento por RPC", negado(await req("POST", "/rest/v1/rpc/criar_lancamento", null, {
    p_dados: { tipo: "pagar", descricao: "anon", categoria_id: catPagar.id, valor_total: 1 }, p_parcelas: [{ valor: 1, vencimento: "2030-01-01" }],
  })))
  conferir("não chama progresso_obras", negado(await req("POST", "/rest/v1/rpc/progresso_obras", null, {})))
  conferir("não se cadastra sozinho", negado(await req("POST", "/auth/v1/signup", null, { email: "invasor@teste.local", password: "Invasor@12345" })))
  conferir("não lista arquivos de documentos", negado(await req("POST", "/storage/v1/object/list/documentos", null, { prefix: OBRA_A })))
  conferir("não lista comprovantes", negado(await req("POST", "/storage/v1/object/list/comprovantes", null, { prefix: "" })))

  // ---------------------------------------------------------------------------
  console.log("\nUsuário desativado")
  const inativo = await entrar("inativo@teste.local")
  conferir("não consegue token de acesso", inativo === null)
  if (inativo) for (const t of ["obras", "perfis", "lancamentos"]) conferir(`com token, não lê ${t}`, vazioOuNegado(await req("GET", `/rest/v1/${t}?select=id`, inativo)))

  // ---------------------------------------------------------------------------
  console.log("\nEquipe de campo (obra A)")
  const campo = (await entrar("campo@teste.local"))!
  for (const t of FINANCEIRAS) conferir(`não lê ${t} (valores em R$)`, vazioOuNegado(await req("GET", `/rest/v1/${t}?select=*&limit=1`, campo)))
  const mat = await req("GET", "/rest/v1/materiais?select=custo_unitario&limit=1", campo)
  conferir("não lê custo unitário de materiais", mat.status >= 400 || (mat.corpo as { custo_unitario: unknown }[]).every((m) => m.custo_unitario === null), mat.corpo)
  conferir("não lê auditoria", vazioOuNegado(await req("GET", "/rest/v1/auditoria?select=id", campo)))
  conferir("não vê obra C", vazioOuNegado(await req("GET", `/rest/v1/obras?id=eq.${OBRA_C}&select=id`, campo)))
  conferir("não vira admin editando o próprio perfil", negado(await req("PATCH", "/rest/v1/perfis?email=eq.campo@teste.local", campo, { papel: "admin" })))
  conferir("não se reativa/altera e-mail", negado(await req("PATCH", "/rest/v1/perfis?email=eq.campo@teste.local", campo, { email: "outro@teste.local" })))
  conferir("não aprova diário mudando o status direto", negado(await req("PATCH", `/rest/v1/diarios?id=eq.${diarioA.id}`, campo, { status: "aprovado" })))
  conferir("não aprova diário pela RPC", negado(await req("POST", "/rest/v1/rpc/aprovar_diario", campo, { p_diario: diarioA.id })))
  conferir("não lança medição na obra C", negado(await req("POST", "/rest/v1/medicoes", campo, {
    obra_id: OBRA_C, servico_id: servicoC.id, quantidade: 1, periodo_inicio: "2026-11-01", periodo_fim: "2026-11-01",
  })))
  conferir("não cria lançamento financeiro", negado(await req("POST", "/rest/v1/rpc/criar_lancamento", campo, {
    p_dados: { tipo: "pagar", descricao: "campo", categoria_id: catPagar.id, obra_id: OBRA_A, valor_total: 1 }, p_parcelas: [{ valor: 1, vencimento: "2030-01-01" }],
  })))
  conferir("não cria obra", negado(await req("POST", "/rest/v1/obras", campo, { nome: "x", responsavel_id: perfilAdmin.id })))
  conferir("não chama função interna atualizar_datas_reais_servico", negado(await req("POST", "/rest/v1/rpc/atualizar_datas_reais_servico", campo, { p_servico: servicoA.id })))
  conferir("não chama função interna gravar_parcelas", negado(await req("POST", "/rest/v1/rpc/gravar_parcelas", campo, { p_lancamento: lancA.id, p_parcelas: [{ valor: 1, vencimento: "2030-01-01" }] })))
  conferir("não liga o modo RPC (ligar_via_rpc)", negado(await req("POST", "/rest/v1/rpc/ligar_via_rpc", campo, {})))
  conferir("não lê progresso da obra C", negado(await req("POST", "/rest/v1/rpc/progresso_servicos", campo, { p_obra: OBRA_C })))
  const prog = await req("POST", "/rest/v1/rpc/progresso_servicos", campo, { p_obra: OBRA_A })
  conferir("progresso da obra A não traz valores em R$", !/valor|custo|preco/i.test(JSON.stringify(prog.corpo)), prog.corpo)

  // ---------------------------------------------------------------------------
  console.log("\nGestor de outra obra (gestor2, só obra C)")
  const gestor2 = (await entrar("gestor2@teste.local"))!
  for (const t of ["obras", "servicos", "diarios", "medicoes", "orcamento_itens", "lancamentos", "documentos"]) {
    conferir(`não lê ${t} da obra A`, vazioOuNegado(await req("GET", `/rest/v1/${t}?obra_id=eq.${OBRA_A}&select=id`.replace("obras?obra_id", "obras?id"), gestor2)))
  }
  conferir("não edita a obra A", negado(await req("PATCH", `/rest/v1/obras?id=eq.${OBRA_A}`, gestor2, { nome: "invadida" })))
  conferir("não aprova diário da obra A", negado(await req("POST", "/rest/v1/rpc/aprovar_diario", gestor2, { p_diario: diarioA.id })))
  conferir("não cria revisão de orçamento na obra A", negado(await req("POST", "/rest/v1/rpc/criar_revisao_orcamento", gestor2, { p_obra: OBRA_A, p_descricao: "x" })))
  conferir("não se coloca como membro da obra A", negado(await req("POST", "/rest/v1/obra_membros", gestor2, { obra_id: OBRA_A, perfil_id: perfilAdmin.id })))
  conferir("não lê progresso da obra A", negado(await req("POST", "/rest/v1/rpc/progresso_servicos", gestor2, { p_obra: OBRA_A })))

  // ---------------------------------------------------------------------------
  console.log("\nFinanceiro (obras A e B)")
  const fin = (await entrar("financeiro@teste.local"))!
  conferir("não aprova diário", negado(await req("POST", "/rest/v1/rpc/aprovar_diario", fin, { p_diario: diarioA.id })))
  conferir("não aprova orçamento / cria revisão", negado(await req("POST", "/rest/v1/rpc/criar_revisao_orcamento", fin, { p_obra: OBRA_A, p_descricao: "x" })))
  conferir("não altera itens do orçamento aprovado", negado(await req("PATCH", `/rest/v1/orcamento_itens?versao_id=eq.${orcA.id}`, fin, { valor_unitario: 1 })))
  conferir("não lê financeiro da obra C", vazioOuNegado(await req("GET", `/rest/v1/lancamentos?obra_id=eq.${OBRA_C}&select=id`, fin)))
  conferir("não altera valor do lançamento direto na tabela", negado(await req("PATCH", `/rest/v1/lancamentos?id=eq.${lancA.id}`, fin, { valor_total: 1 })))
  conferir("não apaga pagamento (só estorno)", negado(await req("DELETE", `/rest/v1/baixas?id=eq.${baixa.id}`, fin)))

  // ---------------------------------------------------------------------------
  console.log("\nGestor (obras A e B)")
  const gestor = (await entrar("gestor@teste.local"))!
  conferir("não vira admin", negado(await req("PATCH", "/rest/v1/perfis?email=eq.gestor@teste.local", gestor, { papel: "admin" })))
  conferir("não altera perfil de outra pessoa", negado(await req("PATCH", "/rest/v1/perfis?email=eq.campo@teste.local", gestor, { nome: "x" })))
  conferir("não apaga auditoria", negado(await req("DELETE", "/rest/v1/auditoria?id=not.is.null", gestor)))
  conferir("não forja auditoria", negado(await req("POST", "/rest/v1/auditoria", gestor, { tabela: "obras", operacao: "UPDATE" })))
  conferir("não apaga obra (só cancela)", negado(await req("DELETE", `/rest/v1/obras?id=eq.${OBRA_A}`, gestor)))
  conferir("não edita orçamento aprovado", negado(await req("PATCH", `/rest/v1/orcamento_itens?versao_id=eq.${orcA.id}`, gestor, { valor_unitario: 1 })))
  conferir("não registra pagamento (perfil sem permissão)", negado(await req("POST", "/rest/v1/baixas", gestor, { parcela_id: lancA.id, valor: 1, data_pagamento: "2026-11-01" })))

  // ---------------------------------------------------------------------------
  console.log("\nArquivos (Storage)")
  const PDF = "%PDF-1.4\n%teste\n"
  const envio = (bucket: string, caminho: string, token: string | null, tipo = "application/pdf", conteudo = PDF) =>
    req("POST", `/storage/v1/object/${bucket}/${caminho}`, token, conteudo, { "Content-Type": tipo, "x-upsert": "false" })
  const docA = `${OBRA_A}/${crypto.randomUUID()}/teste.pdf`
  const legitimo = await envio("documentos", docA, gestor)
  conferir("(controle) gestor envia documento na própria obra", legitimo.status === 200, legitimo)
  conferir("visitante sem login não baixa o documento", negado(await req("GET", `/storage/v1/object/documentos/${docA}`, null)))
  conferir("gestor2 não baixa documento da obra A", negado(await req("GET", `/storage/v1/object/authenticated/documentos/${docA}`, gestor2)))
  conferir("gestor2 não gera link assinado do documento da obra A", negado(await req("POST", `/storage/v1/object/sign/documentos/${docA}`, gestor2, { expiresIn: 60 })))
  const listaG2 = await req("POST", "/storage/v1/object/list/documentos", gestor2, { prefix: `${OBRA_A}/` })
  conferir("gestor2 não lista documentos da obra A", negado(listaG2))
  conferir("campo não envia documento na obra C", negado(await envio("documentos", `${OBRA_C}/${crypto.randomUUID()}/x.pdf`, campo)))
  conferir("campo não envia arquivo fora da pasta de uma obra", negado(await envio("documentos", `qualquer/${crypto.randomUUID()}/x.pdf`, campo)))
  conferir("não aceita página HTML (risco de script)", negado(await envio("documentos", `${OBRA_A}/${crypto.randomUUID()}/x.html`, gestor, "text/html", "<script>alert(1)</script>")))
  conferir("não aceita SVG (pode conter script)", negado(await envio("documentos", `${OBRA_A}/${crypto.randomUUID()}/x.svg`, gestor, "image/svg+xml", "<svg/>")))
  conferir("gestor não sobrescreve documento existente", negado(await req("PUT", `/storage/v1/object/documentos/${docA}`, gestor, "%PDF-1.4\nalterado", { "Content-Type": "application/pdf" })))
  conferir("gestor não apaga documento", negado(await req("DELETE", `/storage/v1/object/documentos/${docA}`, gestor)))
  conferir("campo não envia comprovante", negado(await envio("comprovantes", `${OBRA_A}/${crypto.randomUUID()}/c.pdf`, campo)))
  const compA = `${OBRA_A}/${crypto.randomUUID()}/comprovante.pdf`
  const compOk = await envio("comprovantes", compA, fin)
  conferir("(controle) financeiro envia comprovante da própria obra", compOk.status === 200, compOk)
  conferir("campo não baixa comprovante", negado(await req("GET", `/storage/v1/object/authenticated/comprovantes/${compA}`, campo)))
  conferir("gestor não baixa comprovante", negado(await req("GET", `/storage/v1/object/authenticated/comprovantes/${compA}`, gestor)))
  conferir("financeiro não envia comprovante na obra C", negado(await envio("comprovantes", `${OBRA_C}/${crypto.randomUUID()}/c.pdf`, fin)))

  // Conferência final: nada foi alterado de fato
  const [depois] = await servico<{ valor_total: number }[]>(`lancamentos?id=eq.${lancA.id}&select=valor_total`)
  conferir("valor do lançamento atacado continua o mesmo", Number(depois.valor_total) === Number(lancA.valor_total), depois)
  const [admin] = await servico<{ papel: string }[]>(`perfis?email=eq.campo@teste.local&select=papel`)
  conferir("campo continua campo", admin.papel === "campo", admin)

  console.log(`\n${total - falhas}/${total} ataques barrados.`)
  if (falhas) process.exit(1)
}

main()
