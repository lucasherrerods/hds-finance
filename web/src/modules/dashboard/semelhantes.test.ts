import { describe, expect, it } from 'vitest'
import { semelhantes } from './semelhantes'

const pedagio = (data: string, chave: string) => ({ data, descricao: 'Compra no débito Rodoanel Pedagio', categoria: 'Pedágios', valor: -3.65, chave })

describe('semelhantes', () => {
  it('acha as de mesma descrição, sem a própria, da mais nova para a mais antiga', () => {
    const atual = pedagio('2026-10-17', 'b')
    const todas = [pedagio('2026-09-12', 'a'), atual, { ...pedagio('2026-11-22', 'c'), descricao: 'COMPRA NO DEBITO  RODOANEL PEDAGIO' }, { data: '2026-11-01', descricao: 'Mercado', categoria: 'Supermercado', valor: -50, chave: 'd' }]

    expect(semelhantes(atual, todas).map((t) => t.chave)).toEqual(['c', 'a'])
  })

  it('para no limite', () => {
    const todas = Array.from({ length: 30 }, (_, i) => pedagio(`2026-10-${String((i % 28) + 1).padStart(2, '0')}`, String(i)))

    expect(semelhantes(todas[0], todas, 5)).toHaveLength(5)
  })
})
