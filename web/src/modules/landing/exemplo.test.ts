import { describe, expect, it } from 'vitest'
import { mesDeExemplo } from './exemplo'

const centavos = (valor: number) => Math.round(valor * 100)

describe('mês de exemplo', () => {
  it('fecha o saldo como a api fecharia', () => {
    const { saldoInicial, resultado, investimentosETransferencias, saldoFinal } = mesDeExemplo
    expect(centavos(saldoInicial! + resultado + investimentosETransferencias)).toBe(centavos(saldoFinal!))
    expect(centavos(mesDeExemplo.entradas - mesDeExemplo.saidas)).toBe(centavos(resultado))
  })

  it('os gastos por categoria somam as saídas', () => {
    const soma = mesDeExemplo.gastosPorCategoria.reduce((total, g) => total + g.valor, 0)
    expect(centavos(soma)).toBe(centavos(mesDeExemplo.saidas))
  })
})
