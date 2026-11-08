import { describe, expect, it } from 'vitest'
import { formatarData, formatarMoeda } from './formatar'

describe('formatarMoeda', () => {
  it('usa o padrão pt-BR com R$', () => {
    expect(formatarMoeda(1234.56)).toBe('R$ 1.234,56')
  })

  it('mostra o sinal de negativo', () => {
    expect(formatarMoeda(-10)).toBe('-R$ 10,00')
  })
})

describe('formatarData', () => {
  it('formata data ISO como dd/MM/yyyy sem deslocar o fuso', () => {
    expect(formatarData('2026-10-01')).toBe('01/10/2026')
  })
})
