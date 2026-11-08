import { describe, expect, it } from 'vitest'
import type { Painel } from '../import'
import { agruparPorDia, comparacaoDoRitmo, nivelDeCalor, textoDoDestaque } from './painel'

function painel(parcial: Partial<Painel> = {}): Painel {
  return {
    ano: 2026,
    mes: 10,
    gastoNoMes: 1000,
    gastoNoMesAnterior: 1100,
    variacaoPercentual: -9.1,
    mediaDiaria: 50,
    maiorGasto: null,
    ritmo: [],
    mapaDeCalor: [],
    principaisCategorias: [],
    transacoesRecentes: [],
    ...parcial,
  }
}

describe('textoDoDestaque', () => {
  it('aponta as categorias que mais subiram', () => {
    const texto = textoDoDestaque(
      painel({
        principaisCategorias: [
          { categoria: 'Moradia', atual: 900, anterior: 900, variacaoPercentual: 0 },
          { categoria: 'Delivery', atual: 193, anterior: 118, variacaoPercentual: 63.6 },
          { categoria: 'Assinaturas', atual: 88, anterior: 36, variacaoPercentual: 146 },
        ],
      }),
    )

    expect(texto.titulo).toMatch(/pode trabalhar melhor/i)
    expect(texto.frase).toBe('Assinaturas subiu 146% e Delivery 64% em relação ao mês anterior. Vale revisar esses gastos.')
  })

  it('comemora quando o gasto caiu e nenhuma categoria disparou', () => {
    const texto = textoDoDestaque(painel({ variacaoPercentual: -9.1 }))

    expect(texto.titulo).toMatch(/bom mês/i)
    expect(texto.frase).toBe('Você gastou 9% a menos que no mês anterior.')
  })

  it('sem mês anterior, sugere enviar um período maior', () => {
    const texto = textoDoDestaque(painel({ gastoNoMesAnterior: null, variacaoPercentual: null }))

    expect(texto.frase).toMatch(/envie também o mês anterior/i)
  })
})

describe('nivelDeCalor', () => {
  it('divide os gastos em cinco níveis em relação ao maior dia', () => {
    expect(nivelDeCalor(0, 100)).toBe(0)
    expect(nivelDeCalor(10, 100)).toBe(1)
    expect(nivelDeCalor(50, 100)).toBe(2)
    expect(nivelDeCalor(70, 100)).toBe(3)
    expect(nivelDeCalor(100, 100)).toBe(4)
    expect(nivelDeCalor(0, 0)).toBe(0)
  })
})

describe('agruparPorDia', () => {
  it('agrupa as transações por data, mantendo a ordem da api', () => {
    const grupos = agruparPorDia([
      { data: '2026-10-30', descricao: 'A', categoria: 'X', valor: -1 },
      { data: '2026-10-30', descricao: 'B', categoria: 'X', valor: -2 },
      { data: '2026-10-29', descricao: 'C', categoria: 'X', valor: -3 },
    ])

    expect(grupos.map((g) => [g.rotulo, g.transacoes.length])).toEqual([
      ['sex, 30 out', 2],
      ['qui, 29 out', 1],
    ])
  })
})

describe('comparacaoDoRitmo', () => {
  it('compara o acumulado do último dia com movimento com o mesmo dia do mês anterior', () => {
    expect(
      comparacaoDoRitmo([
        { dia: 1, acumuladoAtual: 100, acumuladoAnterior: 50 },
        { dia: 2, acumuladoAtual: 150, acumuladoAnterior: 120 },
        { dia: 3, acumuladoAtual: null, acumuladoAnterior: 200 },
      ]),
    ).toEqual({ dia: 2, diferenca: 30, percentual: 25 })
  })

  it('sem mês anterior não há comparação', () => {
    expect(comparacaoDoRitmo([{ dia: 1, acumuladoAtual: 100, acumuladoAnterior: null }])).toBeNull()
  })
})
