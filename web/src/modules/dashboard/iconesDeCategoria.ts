import {
  ArrowDownLeft,
  ArrowLeftRight,
  CircleDashed,
  HeartPulse,
  House,
  Repeat,
  ShoppingBag,
  TramFront,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react'

const icones: Record<string, LucideIcon> = {
  Alimentação: UtensilsCrossed,
  Transporte: TramFront,
  Moradia: House,
  Saúde: HeartPulse,
  Assinaturas: Repeat,
  Compras: ShoppingBag,
  Entrada: ArrowDownLeft,
  'Investimentos e transferências': ArrowLeftRight,
}

const tons: Record<string, string> = {
  Alimentação: 'bg-grafico-2/15',
  Transporte: 'bg-grafico-4/15',
  Moradia: 'bg-grafico-3/15',
  Saúde: 'bg-grafico-5/15',
  Assinaturas: 'bg-grafico-4/15',
  Compras: 'bg-grafico-5/15',
  Lazer: 'bg-grafico-2/15',
  Educação: 'bg-grafico-3/15',
  Entrada: 'bg-grafico-1/15',
}

/** O fundo da etiqueta. O nome vem sempre escrito, então a cor é só apoio. */
export function tomDaCategoria(categoria: string): string {
  return tons[categoria] ?? 'bg-fundo'
}

/** Categorias criadas pela configuração caem no ícone genérico. */
export function iconeDaCategoria(categoria: string): LucideIcon {
  return icones[categoria] ?? CircleDashed
}
