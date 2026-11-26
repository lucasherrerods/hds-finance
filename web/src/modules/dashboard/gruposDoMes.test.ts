import { describe, expect, it } from 'vitest'
import { gruposDoMes } from './gruposDoMes'

describe('gruposDoMes', () => {
  it('soma por grupo e ordena grupos e categorias do maior para o menor', () => {
    const grupos = gruposDoMes([
      { categoria: 'Supermercado', valor: 248.16, grupo: 'Alimentação' },
      { categoria: 'Combustível', valor: 300, grupo: 'Transporte' },
      { categoria: 'Restaurantes, bares e lanchonetes', valor: 344.76, grupo: 'Alimentação' },
      { categoria: 'Besteira', valor: 67.96 },
    ])

    expect(grupos.map((g) => [g.grupo, g.total])).toEqual([
      ['Alimentação', 592.92],
      ['Transporte', 300],
      ['Outros', 67.96],
    ])
    expect(grupos[0].categorias.map((c) => c.categoria)).toEqual(['Restaurantes, bares e lanchonetes', 'Supermercado'])
  })
})
