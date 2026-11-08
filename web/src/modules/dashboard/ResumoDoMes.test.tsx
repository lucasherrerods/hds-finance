import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResumoDoMes } from './ResumoDoMes'

const outubro = {
  ano: 2026,
  mes: 10,
  entradas: 3500,
  saidas: 123.45,
  resultado: 3376.55,
  investimentosETransferencias: -1000,
  saldoInicial: 0,
  saldoFinal: 2376.55,
  gastosPorCategoria: [],
}

describe('ResumoDoMes', () => {
  it('mostra o mês e os valores em reais', () => {
    render(<ResumoDoMes mes={outubro} />)

    expect(screen.getByRole('heading', { name: /outubro de 2026/i })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Entradas' })).toHaveTextContent('+R$ 3.500,00')
    expect(screen.getByRole('group', { name: 'Saídas' })).toHaveTextContent('−R$ 123,45')
    expect(screen.getByRole('group', { name: 'Resultado' })).toHaveTextContent('R$ 3.376,55')
  })

  it('mostra o saldo do início ao fim do mês e o que foi para investimentos', () => {
    render(<ResumoDoMes mes={outubro} />)

    expect(screen.getByRole('group', { name: 'Saldo' })).toHaveTextContent('R$ 0,00 → R$ 2.376,55')
    expect(screen.getByRole('group', { name: 'Investimentos e transferências' })).toHaveTextContent('−R$ 1.000,00')
  })

  it('avisa quando o extrato não informa o saldo', () => {
    render(<ResumoDoMes mes={{ ...outubro, saldoInicial: null, saldoFinal: null }} />)

    expect(screen.getByRole('group', { name: 'Saldo' })).toHaveTextContent('Não informado no extrato')
  })
})

describe('gastos por categoria', () => {
  const comGastos = {
    ...outubro,
    saidas: 1200,
    gastosPorCategoria: [
      { categoria: 'Alimentação', valor: 900 },
      { categoria: 'Transporte', valor: 300 },
    ],
  }

  it('lista cada categoria com valor e participação nas saídas', () => {
    render(<ResumoDoMes mes={comGastos} />)

    const lista = screen.getByRole('list', { name: 'Gastos por categoria' })
    const itens = within(lista).getAllByRole('listitem')
    expect(itens).toHaveLength(2)
    expect(itens[0]).toHaveTextContent('Alimentação')
    expect(itens[0]).toHaveTextContent('R$ 900,00')
    expect(itens[0]).toHaveTextContent('75%')
  })

  it('sem gastos no mês, não mostra a lista', () => {
    render(<ResumoDoMes mes={{ ...outubro, gastosPorCategoria: [] }} />)

    expect(screen.queryByRole('list', { name: 'Gastos por categoria' })).not.toBeInTheDocument()
  })
})

describe('vários meses na mesma página', () => {
  it('cada lista de gastos tem o próprio rótulo', () => {
    const mes = { ...outubro, saidas: 100, gastosPorCategoria: [{ categoria: 'Alimentação', valor: 100 }] }
    render(
      <>
        <ResumoDoMes mes={mes} />
        <ResumoDoMes mes={{ ...mes, mes: 11 }} />
      </>,
    )

    const ids = screen.getAllByRole('list', { name: 'Gastos por categoria' }).map((l) => l.getAttribute('aria-labelledby'))
    expect(new Set(ids).size).toBe(2)
  })
})
