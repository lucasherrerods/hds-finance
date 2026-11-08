import { render, screen, within } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import type { Painel } from '../import'
import { PainelDoMes } from './PainelDoMes'

const painel: Painel = {
  ano: 2026,
  mes: 10,
  gastoNoMes: 886.06,
  gastoNoMesAnterior: 814.91,
  variacaoPercentual: 8.7,
  mediaDiaria: 147.68,
  maiorGasto: { dia: 1, diaDaSemana: 4, semana: 0, valor: 297.3 },
  ritmo: [
    { dia: 1, acumuladoAtual: 297.3, acumuladoAnterior: 100 },
    { dia: 2, acumuladoAtual: 400, acumuladoAnterior: 380 },
    { dia: 3, acumuladoAtual: null, acumuladoAnterior: 814.91 },
  ],
  mapaDeCalor: [
    { dia: 1, diaDaSemana: 4, semana: 0, valor: 297.3 },
    { dia: 2, diaDaSemana: 5, semana: 0, valor: 0 },
    { dia: 3, diaDaSemana: 6, semana: 0, valor: 102.7 },
  ],
  principaisCategorias: [
    { categoria: 'Alimentação', atual: 193, anterior: 118, variacaoPercentual: 63.6 },
    { categoria: 'Transporte', atual: 91, anterior: 432, variacaoPercentual: -78.9 },
    { categoria: 'Sem categoria', atual: 20, anterior: null, variacaoPercentual: null },
  ],
  transacoesRecentes: [
    { data: '2026-10-03', descricao: 'Uber Viagem', categoria: 'Transporte', valor: -34.41 },
    { data: '2026-10-01', descricao: 'Pix recebido Fulano Ficticio', categoria: 'Entrada', valor: 3000 },
  ],
}

describe('PainelDoMes', () => {
  beforeAll(async () => {
    // O ritmo usa o Recharts, carregado sob demanda; carregar antes evita esperar o import no meio do teste.
    await import('./RitmoDeGastos')
  })

  it('o destaque traz a frase e os números principais do mês', () => {
    render(<PainelDoMes painel={painel} />)

    const destaque = screen.getByRole('region', { name: 'Destaque do mês' })
    expect(destaque).toHaveTextContent('Alimentação subiu 64%')
    expect(within(destaque).getByRole('group', { name: 'Gasto em outubro' })).toHaveTextContent('R$ 886,06')
    expect(within(destaque).getByRole('group', { name: 'Vs. mês anterior' })).toHaveTextContent('+9%')
    expect(within(destaque).getByRole('group', { name: 'Maior categoria' })).toHaveTextContent('Alimentação')
  })

  it('o ritmo compara o acumulado de hoje com o mesmo dia do mês anterior', async () => {
    render(<PainelDoMes painel={painel} />)

    const ritmo = screen.getByRole('region', { name: 'Ritmo de gastos' })
    expect(ritmo).toHaveTextContent('R$ 20,00 acima')
    expect(await within(ritmo).findByRole('table', { name: 'Gasto acumulado por dia' })).toBeInTheDocument()
  })

  it('o mapa de calor descreve cada dia para leitores de tela', () => {
    render(<PainelDoMes painel={painel} />)

    const mapa = screen.getByRole('region', { name: 'Mapa de calor' })
    expect(within(mapa).getByLabelText('Dia 1: R$ 297,30')).toBeInTheDocument()
    expect(within(mapa).getByLabelText('Dia 2: sem gastos')).toBeInTheDocument()
    expect(mapa).toHaveTextContent('Média diária')
    expect(mapa).toHaveTextContent('R$ 147,68')
  })

  it('as categorias mostram a variação com sinal, não só com cor', () => {
    render(<PainelDoMes painel={painel} />)

    const linhas = within(screen.getByRole('table', { name: 'Principais categorias' })).getAllByRole('row')
    expect(linhas[1]).toHaveTextContent('Alimentação')
    expect(linhas[1]).toHaveTextContent('+64%')
    expect(within(linhas[1]).getByLabelText('subiu')).toBeInTheDocument()
    expect(linhas[2]).toHaveTextContent('−79%')
    expect(within(linhas[2]).getByLabelText('caiu')).toBeInTheDocument()
    expect(linhas[3]).toHaveTextContent('—')
  })

  it('as transações recentes vêm agrupadas por dia, com entrada e saída marcadas por sinal', () => {
    render(<PainelDoMes painel={painel} />)

    const lista = screen.getByRole('region', { name: 'Transações recentes' })
    expect(within(lista).getByText('sáb, 03 out')).toBeInTheDocument()
    expect(within(lista).getByText('qui, 01 out')).toBeInTheDocument()
    expect(lista).toHaveTextContent('−R$ 34,41')
    expect(lista).toHaveTextContent('+R$ 3.000,00')
  })
})
