import { formatarMesCurto } from '../../shared'
import type { ResumoMensal } from '../import'

export type PontoDeEntradasESaidas = { rotulo: string; entradas: number; saidas: number }

const MESES_NO_GRAFICO = 12

/** Os meses chegam da api em ordem cronológica; aqui só se escolhe o recorte e o rótulo. */
export function dadosDeEntradasESaidas(meses: ResumoMensal[]): PontoDeEntradasESaidas[] {
  return meses.slice(-MESES_NO_GRAFICO).map((m) => ({
    rotulo: formatarMesCurto(m.ano, m.mes),
    entradas: m.entradas,
    saidas: m.saidas,
  }))
}
