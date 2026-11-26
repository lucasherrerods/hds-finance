import { describe, expect, it } from 'vitest'
import type { ResumoMensal } from '../import'
import { movimentacoesDeInvestimento, resumoDosInvestimentos } from './investimentos'

function mes(numero: number, entradas: number, aplicado: number, resgatado: number): ResumoMensal {
  return {
    ano: 2026,
    mes: numero,
    entradas,
    saidas: 0,
    resultado: entradas,
    investimentosETransferencias: resgatado - aplicado,
    saldoInicial: null,
    saldoFinal: null,
    gastosPorCategoria: [],
    investimentos: { aplicado, resgatado, aplicadoAcumulado: 0 },
  }
}

describe('investimentos', () => {
  it('junta os meses e diz quanto do que entrou foi investido', () => {
    expect(resumoDosInvestimentos([mes(9, 4000, 1000, 0), mes(10, 4000, 500, 300), mes(11, 2000, 0, 0)])).toEqual({
      aplicado: 1500,
      resgatado: 300,
      liquido: 1200,
      taxaDeInvestimento: 12,
      mesesComAplicacao: 2,
      maiorAplicacao: { ano: 2026, mes: 9, valor: 1000 },
    })
  })

  it('sem aplicação líquida, não há taxa', () => {
    expect(resumoDosInvestimentos([mes(9, 4000, 0, 500)]).taxaDeInvestimento).toBeNull()
  })

  it('lista só as movimentações internas, da mais nova para a mais antiga', () => {
    const lista = movimentacoesDeInvestimento([
      { data: '2026-10-01', descricao: 'Aplicação CDB', categoria: 'Investimentos e transferências', valor: -1000 },
      { data: '2026-10-05', descricao: 'Mercado', categoria: 'Supermercado', valor: -50 },
      { data: '2026-10-09', descricao: 'Resgate CDB', categoria: 'Investimentos e transferências', valor: 300 },
    ])
    expect(lista.map((t) => t.descricao)).toEqual(['Resgate CDB', 'Aplicação CDB'])
  })
})
