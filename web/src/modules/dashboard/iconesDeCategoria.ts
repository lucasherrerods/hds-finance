import {
  ArrowDownLeft,
  ArrowLeftRight,
  Banknote,
  CircleDashed,
  Gamepad2,
  GraduationCap,
  HandCoins,
  HeartPulse,
  House,
  MonitorSmartphone,
  Package,
  PawPrint,
  ShoppingBag,
  TramFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

// Cada grupo tem um ícone e um tom. As categorias finas herdam os do grupo; os nomes antigos continuam valendo.
const icones: Record<string, LucideIcon> = {
  Alimentação: UtensilsCrossed,
  Transporte: TramFront,
  Moradia: House,
  Saúde: HeartPulse,
  'Serviços digitais': MonitorSmartphone,
  Assinaturas: MonitorSmartphone,
  Compras: ShoppingBag,
  Lazer: Gamepad2,
  Educação: GraduationCap,
  Pets: PawPrint,
  Finanças: Banknote,
  'Tarifas e impostos': Banknote,
  Outros: Package,
  Empréstimos: HandCoins,
  Entrada: ArrowDownLeft,
  'Investimentos e transferências': ArrowLeftRight,
}

const tons: Record<string, string> = {
  Alimentação: 'bg-grafico-2/15',
  Transporte: 'bg-grafico-4/15',
  Moradia: 'bg-grafico-3/15',
  Saúde: 'bg-grafico-5/15',
  'Serviços digitais': 'bg-grafico-4/15',
  Assinaturas: 'bg-grafico-4/15',
  Compras: 'bg-grafico-5/15',
  Lazer: 'bg-grafico-2/15',
  Educação: 'bg-grafico-3/15',
  Pets: 'bg-grafico-1/15',
  Finanças: 'bg-grafico-1/15',
  Empréstimos: 'bg-grafico-4/15',
  Entrada: 'bg-grafico-1/15',
}

const chave = (categoria: string, grupo?: string) => (grupo && grupo in icones ? grupo : categoria)

/** O fundo da etiqueta. O nome vem sempre escrito, então a cor é só apoio. */
export function tomDaCategoria(categoria: string, grupo?: string): string {
  return tons[chave(categoria, grupo)] ?? 'bg-fundo'
}

/** Categorias criadas pela pessoa caem no ícone genérico. */
export function iconeDaCategoria(categoria: string, grupo?: string): LucideIcon {
  return icones[chave(categoria, grupo)] ?? CircleDashed
}
