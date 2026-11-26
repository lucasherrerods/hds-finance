import { describe, expect, it } from 'vitest'
import { comAjuste, formularioDoExtrato, iguaisA } from './ajustes'

const t = (descricao: string, valor: number, chave: string) => ({ data: '2026-10-01', descricao, categoria: 'Entrada', valor, chave })

describe('ajustes', () => {
  it('guarda um ajuste por transação e junta as mudanças', () => {
    const primeiro = comAjuste([], ['a'], { categoria: 'Lazer' })
    expect(comAjuste(primeiro, ['a', 'b'], { oculta: true })).toEqual([
      { chave: 'a', categoria: 'Lazer', oculta: true },
      { chave: 'b', oculta: true },
    ])
  })

  it('iguais têm a mesma descrição e o mesmo sentido', () => {
    const todas = [t('Pix Fulano', 10, '1'), t('Pix Fulano', 20, '2'), t('Pix Fulano', -5, '3'), t('Outro', 10, '4')]
    expect(iguaisA(todas[0], todas).map((x) => x.chave)).toEqual(['1', '2'])
  })

  it('só manda o campo de ajustes quando há algum', () => {
    const arquivo = new File(['x'], 'e.csv')
    expect(formularioDoExtrato([arquivo]).get('ajustes')).toBeNull()
    expect(formularioDoExtrato([arquivo], [{ chave: 'a', oculta: true }]).get('ajustes')).toBe('[{"chave":"a","oculta":true}]')
  })
})
