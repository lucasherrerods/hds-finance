import { describe, expect, it } from 'vitest'
import type { ResumoMensal } from '../import'
import { dadosDeEntradasESaidas, dadosDoSaldo } from './dadosDosGraficos'

function mes(ano: number, numero: number, parcial: Partial<ResumoMensal> = {}): ResumoMensal {
  return {
    ano,
    mes: numero,
    entradas: 100,
    saidas: 40,
    resultado: 60,
    investimentosETransferencias: 0,
    saldoInicial: 0,
    saldoFinal: 60,
    gastosPorCategoria: [],
    ...parcial,
  }
}

describe('dadosDeEntradasESaidas', () => {
  it('rotula cada mês de forma curta e mantém os valores da api', () => {
    expect(dadosDeEntradasESaidas([mes(2026, 10, { entradas: 3500, saidas: 123.45 })])).toEqual([
      { rotulo: 'out/26', entradas: 3500, saidas: 123.45 },
    ])
  })

  it('mostra só os últimos 12 meses', () => {
    const meses = Array.from({ length: 14 }, (_, i) => mes(2025 + Math.floor(i / 12), (i % 12) + 1))

    const dados = dadosDeEntradasESaidas(meses)

    expect(dados).toHaveLength(12)
    expect(dados[0].rotulo).toBe('mar/25')
    expect(dados[11].rotulo).toBe('fev/26')
  })
})

describe('dadosDoSaldo', () => {
  it('usa o saldo final de cada mês', () => {
    expect(dadosDoSaldo([mes(2026, 9, { saldoFinal: 500 }), mes(2026, 10, { saldoFinal: 820.5 })])).toEqual([
      { rotulo: 'set/26', saldo: 500 },
      { rotulo: 'out/26', saldo: 820.5 },
    ])
  })

  it('deixa de fora os meses sem saldo informado', () => {
    expect(dadosDoSaldo([mes(2026, 9, { saldoInicial: null, saldoFinal: null }), mes(2026, 10)])).toEqual([
      { rotulo: 'out/26', saldo: 60 },
    ])
  })
})
