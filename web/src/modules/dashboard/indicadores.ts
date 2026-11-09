import { formatarMesCurto } from '../../shared'
import type { ResumoMensal } from '../import'

export type Indicador = {
  rotulo: string
  valor: number | null
  tipo: 'entrada' | 'saida' | 'neutro'
  /** Em pontos percentuais, comparado com o mês anterior. Nulo quando não há como comparar. */
  variacao: number | null
}

function variacao(atual: number | null, anterior: number | null | undefined): number | null {
  if (atual === null || anterior === null || anterior === undefined || anterior === 0) return null
  return ((atual - anterior) / Math.abs(anterior)) * 100
}

/** Os números do último mês do extrato, cada um comparado com o mês anterior. */
export function indicadoresDoMes(meses: ResumoMensal[]): Indicador[] {
  const atual = meses.at(-1)
  if (!atual) return []
  const anterior = meses.at(-2)

  return [
    { rotulo: 'Entrou', valor: atual.entradas, tipo: 'entrada', variacao: variacao(atual.entradas, anterior?.entradas) },
    { rotulo: 'Saiu', valor: atual.saidas, tipo: 'saida', variacao: variacao(atual.saidas, anterior?.saidas) },
    { rotulo: 'Sobrou', valor: atual.resultado, tipo: 'neutro', variacao: variacao(atual.resultado, anterior?.resultado) },
    { rotulo: 'Saldo final', valor: atual.saldoFinal, tipo: 'neutro', variacao: variacao(atual.saldoFinal, anterior?.saldoFinal) },
  ]
}

export type TotaisDoPeriodo = {
  entradas: number
  saidas: number
  resultado: number
  aplicado: number
  resgatado: number
  aplicadoAcumulado: number
  mediaDeSaidas: number
}

export function totaisDoPeriodo(meses: ResumoMensal[]): TotaisDoPeriodo {
  const somar = (valor: (m: ResumoMensal) => number) => meses.reduce((total, m) => total + valor(m), 0)
  const saidas = somar((m) => m.saidas)
  return {
    entradas: somar((m) => m.entradas),
    saidas,
    resultado: somar((m) => m.resultado),
    aplicado: somar((m) => m.investimentos.aplicado),
    resgatado: somar((m) => m.investimentos.resgatado),
    aplicadoAcumulado: meses.at(-1)?.investimentos.aplicadoAcumulado ?? 0,
    mediaDeSaidas: meses.length > 0 ? saidas / meses.length : 0,
  }
}

export function periodoDosMeses(meses: ResumoMensal[]): string {
  const [primeiro, ultimo] = [meses.at(0), meses.at(-1)]
  if (!primeiro || !ultimo) return ''
  const inicio = formatarMesCurto(primeiro.ano, primeiro.mes)
  const fim = formatarMesCurto(ultimo.ano, ultimo.mes)
  return inicio === fim ? fim : `${inicio} – ${fim}`
}
