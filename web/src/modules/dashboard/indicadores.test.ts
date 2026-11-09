import { describe, expect, it } from 'vitest'
import type { ResumoMensal } from '../import'
import { indicadoresDoMes, periodoDosMeses, totaisDoPeriodo } from './indicadores'

function mes(numero: number, entradas: number, saidas: number, saldoFinal: number | null, aplicado = 0, resgatado = 0, acumulado = 0): ResumoMensal {
  return {
    ano: 2026,
    mes: numero,
    entradas,
    saidas,
    resultado: entradas - saidas,
    investimentosETransferencias: resgatado - aplicado,
    saldoInicial: null,
    saldoFinal,
    gastosPorCategoria: [],
    investimentos: { aplicado, resgatado, aplicadoAcumulado: acumulado },
  }
}

describe('indicadoresDoMes', () => {
  it('mostra o último mês e quanto cada valor mudou em relação ao anterior', () => {
    const [entrou, saiu, sobrou, saldo] = indicadoresDoMes([mes(9, 8000, 4000, 3000), mes(10, 8000, 5000, 4000)])

    expect(entrou).toEqual({ rotulo: 'Entrou', valor: 8000, tipo: 'entrada', variacao: 0 })
    expect(saiu).toEqual({ rotulo: 'Saiu', valor: 5000, tipo: 'saida', variacao: 25 })
    expect(sobrou).toEqual({ rotulo: 'Sobrou', valor: 3000, tipo: 'neutro', variacao: -25 })
    expect(saldo).toEqual({ rotulo: 'Saldo final', valor: 4000, tipo: 'neutro', variacao: 33.33333333333333 })
  })

  it('com um mês só, não há variação', () => {
    expect(indicadoresDoMes([mes(10, 8000, 5000, null)]).map((i) => i.variacao)).toEqual([null, null, null, null])
  })

  it('saldo não informado fica nulo', () => {
    expect(indicadoresDoMes([mes(10, 1, 1, null)])[3].valor).toBeNull()
  })

  it('sem meses não há indicador', () => {
    expect(indicadoresDoMes([])).toEqual([])
  })
})

describe('totaisDoPeriodo', () => {
  it('soma entradas, saídas e investimentos de todos os meses', () => {
    const totais = totaisDoPeriodo([mes(9, 8000, 4000, 3000, 1500, 0, 1500), mes(10, 8000, 5000, 4000, 2000, 700, 2800)])

    expect(totais).toEqual({
      entradas: 16000,
      saidas: 9000,
      resultado: 7000,
      aplicado: 3500,
      resgatado: 700,
      aplicadoAcumulado: 2800,
      mediaDeSaidas: 4500,
    })
  })
})

describe('periodoDosMeses', () => {
  it('escreve o primeiro e o último mês', () => {
    expect(periodoDosMeses([mes(9, 0, 0, null), mes(10, 0, 0, null)])).toBe('set/26 – out/26')
  })

  it('com um mês só, escreve só ele', () => {
    expect(periodoDosMeses([mes(10, 0, 0, null)])).toBe('out/26')
  })
})
