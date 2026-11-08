import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ResumoMensal } from '../import'
import { GraficosDoPeriodo } from './GraficosDoPeriodo'

function mes(numero: number, parcial: Partial<ResumoMensal> = {}): ResumoMensal {
  return {
    ano: 2026,
    mes: numero,
    entradas: 3000,
    saidas: 1200,
    resultado: 1800,
    investimentosETransferencias: 0,
    saldoInicial: 0,
    saldoFinal: 1800,
    gastosPorCategoria: [],
    ...parcial,
  }
}

describe('GraficosDoPeriodo', () => {
  it('com um mês só, não mostra gráficos de evolução', () => {
    const { container } = render(<GraficosDoPeriodo meses={[mes(10)]} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('mostra entradas x saídas com os valores numa tabela acessível', () => {
    render(<GraficosDoPeriodo meses={[mes(9), mes(10, { entradas: 4200.5, saidas: 980 })]} />)

    const tabela = screen.getByRole('table', { name: 'Entradas e saídas por mês' })
    const linhas = within(tabela).getAllByRole('row')
    expect(linhas).toHaveLength(3)
    expect(linhas[2]).toHaveTextContent('out/26')
    expect(linhas[2]).toHaveTextContent('+R$ 4.200,50')
    expect(linhas[2]).toHaveTextContent('−R$ 980,00')
  })

  it('mostra a evolução do saldo quando o extrato informa', () => {
    render(<GraficosDoPeriodo meses={[mes(9, { saldoFinal: 500 }), mes(10, { saldoFinal: 2300 })]} />)

    const tabela = screen.getByRole('table', { name: 'Saldo no fim de cada mês' })
    expect(within(tabela).getAllByRole('row')[2]).toHaveTextContent('R$ 2.300,00')
  })

  it('sem saldo informado, não mostra o gráfico de saldo', () => {
    const semSaldo = { saldoInicial: null, saldoFinal: null }
    render(<GraficosDoPeriodo meses={[mes(9, semSaldo), mes(10, semSaldo)]} />)

    expect(screen.queryByRole('table', { name: 'Saldo no fim de cada mês' })).not.toBeInTheDocument()
  })
})
