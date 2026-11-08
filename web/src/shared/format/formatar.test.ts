import { describe, expect, it } from 'vitest'
import { formatarData, formatarMes, formatarMesCurto, formatarMoeda, formatarMoedaComSinal } from './formatar'

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

describe('formatarMoedaComSinal', () => {
  it('prefixa entradas com + e saídas com o sinal de menos tipográfico', () => {
    expect(formatarMoedaComSinal(3500, 'entrada')).toBe('+R$ 3.500,00')
    expect(formatarMoedaComSinal(123.45, 'saida')).toBe('−R$ 123,45')
  })
})

describe('formatarMes', () => {
  it('escreve o mês por extenso com o ano', () => {
    expect(formatarMes(2026, 10)).toBe('outubro de 2026')
  })
})

describe('formatarMesCurto', () => {
  it('usa a abreviação do mês e o ano com dois dígitos', () => {
    expect(formatarMesCurto(2026, 10)).toBe('out/26')
    expect(formatarMesCurto(2025, 3)).toBe('mar/25')
  })
})
