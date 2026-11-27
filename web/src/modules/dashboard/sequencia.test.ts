import { describe, expect, it } from 'vitest'
import type { ResumoMensal } from '../import'
import { dadosDaMeta, sequenciaDeAplicacao } from './investimentos'

const mes = (numero: number, aplicado: number, resgatado = 0) =>
  ({ ano: 2026, mes: numero, entradas: 4000, investimentos: { aplicado, resgatado, aplicadoAcumulado: 0 } }) as ResumoMensal

describe('sequenciaDeAplicacao', () => {
  it('conta os meses seguidos até o último que bateram a meta, e guarda o recorde', () => {
    const meses = [mes(1, 2000), mes(2, 1600), mes(3, 1800), mes(4, 500), mes(5, 1500), mes(6, 2400)]

    expect(sequenciaDeAplicacao(meses, 1500)).toEqual({ atual: 2, recorde: 3 })
  })

  it('o que foi resgatado no mês desconta da aplicação', () => {
    expect(sequenciaDeAplicacao([mes(1, 2000, 600)], 1500)).toEqual({ atual: 0, recorde: 0 })
  })

  it('o mês corrente ainda sem aplicação não quebra a sequência', () => {
    expect(sequenciaDeAplicacao([mes(1, 2000), mes(2, 2000), mes(3, 0)], 1500)).toEqual({ atual: 2, recorde: 2 })
  })
})

describe('dadosDaMeta', () => {
  it('traz o aplicado líquido, a parte da renda e se bateu a meta', () => {
    expect(dadosDaMeta([mes(1, 2000, 200), mes(2, 1000)], 1500)).toEqual([
      { rotulo: expect.any(String), liquido: 1800, taxa: 45, bateu: true },
      { rotulo: expect.any(String), liquido: 1000, taxa: 25, bateu: false },
    ])
  })
})
