import { describe, expect, it } from 'vitest'
import {
  formatarData,
  formatarDiaCurto,
  formatarMes,
  formatarMesCurto,
  formatarMoeda,
  formatarMoedaComSinal,
  formatarPercentual,
} from './formatar'

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

describe('formatarDiaCurto', () => {
  it('mostra o dia da semana, o dia e o mês abreviados', () => {
    expect(formatarDiaCurto('2026-10-30')).toBe('sex, 30 out')
    expect(formatarDiaCurto('2026-11-01')).toBe('dom, 01 nov')
  })
})

describe('formatarPercentual', () => {
  it('mostra o sinal e arredonda para inteiro', () => {
    expect(formatarPercentual(22.2)).toBe('+22%')
    expect(formatarPercentual(-59.9)).toBe('−60%')
    expect(formatarPercentual(0)).toBe('0%')
  })
})
