import type { NomeDoBanco } from '../../shared'
import type { GastoPorCategoria, TransacaoCategorizada } from '../import'

export type Fatura = {
  vencimento: string
  total: number | null
  gasto: number
  /** Nulo quando não dá para saber. */
  paga: boolean | null
  compras: TransacaoCategorizada[]
  banco?: NomeDoBanco
  gastosPorCategoria?: GastoPorCategoria[]
}

export const FATURAS_NO_GRAFICO = 6

export const bancoDaFatura = (f: Fatura): NomeDoBanco => f.banco ?? 'Inter'
export const chaveDaFatura = (f: Fatura) => `${bancoDaFatura(f)}-${f.vencimento}`
export const valorDaFatura = (f: Fatura) => f.total ?? f.gasto
export const mesDaFatura = (f: Fatura) => f.vencimento.split('-').map(Number) as [number, number, number]

/** A mais nova de cada banco. A api já manda da mais nova para a mais antiga. */
export function ultimaDeCadaBanco(faturas: Fatura[]): Fatura[] {
  return faturas.filter((f, i) => faturas.findIndex((outra) => bancoDaFatura(outra) === bancoDaFatura(f)) === i)
}

export type Janela = { faturas: Fatura[]; temAntes: boolean; temDepois: boolean }

/** A página zero traz as mais novas. Dentro da janela, a ordem é a do calendário. */
export function janelaDeFaturas(faturas: Fatura[], pagina: number): Janela {
  const inicio = pagina * FATURAS_NO_GRAFICO
  return {
    faturas: faturas.slice(inicio, inicio + FATURAS_NO_GRAFICO).toReversed(),
    temAntes: faturas.length > inicio + FATURAS_NO_GRAFICO,
    temDepois: pagina > 0,
  }
}
