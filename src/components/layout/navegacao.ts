import type { Papel } from "@/lib/rotulos"

export type ItemMenu = { rotulo: string; href: string; icone: string; papeis?: Papel[] }
export type GrupoMenu = { titulo?: string; itens: ItemMenu[] }

const MENU: GrupoMenu[] = [
  {
    itens: [
      { rotulo: "Painel", href: "/painel", icone: "painel" },
      { rotulo: "Obras", href: "/obras", icone: "obras" },
      { rotulo: "Diário de hoje", href: "/diario-hoje", icone: "diario", papeis: ["admin", "gestor", "campo"] },
      { rotulo: "Alertas", href: "/alertas", icone: "alertas" },
    ],
  },
  {
    titulo: "Financeiro",
    itens: [
      { rotulo: "Contas a pagar e receber", href: "/financeiro", icone: "financeiro", papeis: ["admin", "financeiro"] },
      { rotulo: "Fluxo de caixa", href: "/financeiro/fluxo-caixa", icone: "fluxo", papeis: ["admin", "financeiro"] },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { rotulo: "Clientes e fornecedores", href: "/cadastros/pessoas", icone: "pessoas", papeis: ["admin", "gestor", "financeiro"] },
      { rotulo: "Profissionais", href: "/cadastros/profissionais", icone: "profissionais", papeis: ["admin", "gestor"] },
      { rotulo: "Materiais", href: "/cadastros/materiais", icone: "materiais", papeis: ["admin", "gestor"] },
      { rotulo: "Equipamentos", href: "/cadastros/equipamentos", icone: "equipamentos", papeis: ["admin", "gestor"] },
      { rotulo: "Categorias financeiras", href: "/cadastros/categorias", icone: "categorias", papeis: ["admin", "financeiro"] },
    ],
  },
  {
    titulo: "Administração",
    itens: [{ rotulo: "Usuários", href: "/admin/usuarios", icone: "usuarios", papeis: ["admin"] }],
  },
]

export function menuDoPapel(papel: Papel): GrupoMenu[] {
  return MENU.map((g) => ({ ...g, itens: g.itens.filter((i) => !i.papeis || i.papeis.includes(papel)) })).filter(
    (g) => g.itens.length > 0,
  )
}
