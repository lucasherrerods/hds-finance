import { describe, expect, it } from 'vitest'
import { mesDeExemplo, mesesDeExemplo, painelDeExemplo } from './exemplo'

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

describe('painel de exemplo', () => {
  it('bate com o mês de exemplo e com o anterior', () => {
    const ultimo = painelDeExemplo.ritmo.at(-1)!
    expect(centavos(ultimo.acumuladoAtual!)).toBe(centavos(mesDeExemplo.saidas))
    expect(centavos(ultimo.acumuladoAnterior!)).toBe(centavos(mesesDeExemplo.at(-2)!.saidas))
    expect(painelDeExemplo.gastoNoMes).toBe(mesDeExemplo.saidas)
  })

  it('o mapa de calor soma o gasto do mês e começa numa quinta-feira', () => {
    const soma = painelDeExemplo.mapaDeCalor.reduce((total, d) => total + d.valor, 0)
    expect(centavos(soma)).toBe(centavos(mesDeExemplo.saidas))
    expect(painelDeExemplo.mapaDeCalor[0].diaDaSemana).toBe(new Date(Date.UTC(2026, 9, 1)).getUTCDay())
  })
})
