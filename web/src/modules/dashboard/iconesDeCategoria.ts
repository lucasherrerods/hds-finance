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

/** Categorias criadas pela configuração caem no ícone genérico. */
export function iconeDaCategoria(categoria: string): LucideIcon {
  return icones[categoria] ?? CircleDashed
}
