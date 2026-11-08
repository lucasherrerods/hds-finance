import { formatarMesCurto } from '../../shared'
import type { ResumoMensal } from '../import'

export type PontoDeEntradasESaidas = { rotulo: string; entradas: number; saidas: number }
export type PontoDoSaldo = { rotulo: string; saldo: number }

const MESES_NO_GRAFICO = 12

/** Os meses chegam da api em ordem cronológica; aqui só se escolhe o recorte e o rótulo. */
export function dadosDeEntradasESaidas(meses: ResumoMensal[]): PontoDeEntradasESaidas[] {
  return meses.slice(-MESES_NO_GRAFICO).map((m) => ({
    rotulo: formatarMesCurto(m.ano, m.mes),
    entradas: m.entradas,
    saidas: m.saidas,
  }))
}

export function dadosDoSaldo(meses: ResumoMensal[]): PontoDoSaldo[] {
  return meses
    .slice(-MESES_NO_GRAFICO)
    .filter((m) => m.saldoFinal !== null)
    .map((m) => ({ rotulo: formatarMesCurto(m.ano, m.mes), saldo: m.saldoFinal! }))
}
