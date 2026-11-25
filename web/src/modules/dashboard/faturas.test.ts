import { describe, expect, it } from 'vitest'
import { janelaDeFaturas, ultimaDeCadaBanco, type Fatura } from './faturas'

const fatura = (vencimento: string, banco?: Fatura['banco']): Fatura => ({ vencimento, total: 1, gasto: 1, paga: true, compras: [], banco })
const oito = ['08', '07', '06', '05', '04', '03', '02', '01'].map((m) => fatura(`2026-${m}-02`))
const meses = (faturas: Fatura[]) => faturas.map((f) => f.vencimento.slice(5, 7))

describe('janelaDeFaturas', () => {
  it('começa nas seis mais novas, em ordem de calendário', () => {
    const janela = janelaDeFaturas(oito, 0)

    expect(meses(janela.faturas)).toEqual(['03', '04', '05', '06', '07', '08'])
    expect(janela).toMatchObject({ temAntes: true, temDepois: false })
  })

  it('a página seguinte traz as que faltam', () => {
    const janela = janelaDeFaturas(oito, 1)

    expect(meses(janela.faturas)).toEqual(['01', '02'])
    expect(janela).toMatchObject({ temAntes: false, temDepois: true })
  })
})

describe('ultimaDeCadaBanco', () => {
  it('fica com a primeira de cada um; sem banco é do Inter', () => {
    const faturas = [fatura('2026-02-02'), fatura('2026-01-02', 'Inter'), fatura('2024-06-22', 'Nubank'), fatura('2024-05-22', 'Nubank')]

    expect(ultimaDeCadaBanco(faturas)).toEqual([faturas[0], faturas[2]])
  })
})
