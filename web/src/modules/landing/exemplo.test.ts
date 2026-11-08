import { describe, expect, it } from 'vitest'
import { mesDeExemplo, mesesDeExemplo } from './exemplo'

const centavos = (valor: number) => Math.round(valor * 100)

describe('meses de exemplo', () => {
  it.each(mesesDeExemplo)('$mes/$ano fecha o saldo como a api fecharia', (mes) => {
    expect(centavos(mes.entradas - mes.saidas)).toBe(centavos(mes.resultado))
    expect(centavos(mes.saldoInicial! + mes.resultado + mes.investimentosETransferencias)).toBe(centavos(mes.saldoFinal!))
  })

  it('cada mês começa com o saldo final do anterior', () => {
    for (let i = 1; i < mesesDeExemplo.length; i++) {
      expect(mesesDeExemplo[i].saldoInicial).toBe(mesesDeExemplo[i - 1].saldoFinal)
    }
  })

  it('os gastos por categoria do mês exibido somam as saídas', () => {
    const soma = mesDeExemplo.gastosPorCategoria.reduce((total, g) => total + g.valor, 0)
    expect(centavos(soma)).toBe(centavos(mesDeExemplo.saidas))
  })
})
