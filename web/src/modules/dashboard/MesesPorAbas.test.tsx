import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { ListaDeTransacoes } from './ListaDeTransacoes'
import { MesesPorAbas } from './MesesPorAbas'

function mes(ano: number, numero: number, parcial: Partial<ResumoMensal> = {}): ResumoMensal {
  return {
    ano,
    mes: numero,
    entradas: 3000,
    saidas: 1200,
    resultado: 1800,
    investimentosETransferencias: 0,
    saldoInicial: null,
    saldoFinal: null,
    gastosPorCategoria: [],
    investimentos: { aplicado: 0, resgatado: 0, aplicadoAcumulado: 0 },
    ...parcial,
  }
}

const transacoes: TransacaoCategorizada[] = [
  { data: '2026-01-20', descricao: 'Uber Viagem', categoria: 'Transporte', valor: -63.99 },
  { data: '2026-01-05', descricao: 'Pix recebido - Cliente', categoria: 'Entrada', valor: 1630 },
  { data: '2025-12-10', descricao: 'Compra no débito - Mercado Exemplo', categoria: 'Alimentação', valor: -200 },
]

const meses = [mes(2025, 11), mes(2025, 12), mes(2026, 1, { entradas: 1630, saidas: 1741.63, resultado: -111.63 })]

describe('MesesPorAbas', () => {
  it('abre no último mês, com uma aba por ano e uma por mês do ano escolhido', () => {
    render(<MesesPorAbas meses={meses} transacoes={transacoes} />)

    const anos = within(screen.getByRole('tablist', { name: 'Anos' })).getAllByRole('tab')
    expect(anos.map((a) => a.textContent)).toEqual(['2025', '2026'])
    expect(anos[1]).toHaveAttribute('aria-selected', 'true')

    const mesesDoAno = within(screen.getByRole('tablist', { name: 'Meses de 2026' })).getAllByRole('tab')
    expect(mesesDoAno.map((m) => m.textContent)).toEqual(['jan'])
    expect(screen.getByRole('heading', { name: /janeiro de 2026/i })).toBeInTheDocument()
  })

  it('ao trocar de ano, abre o último mês daquele ano', async () => {
    render(<MesesPorAbas meses={meses} transacoes={transacoes} />)

    fireEvent.click(screen.getByRole('tab', { name: '2025' }))

    const mesesDoAno = within(screen.getByRole('tablist', { name: 'Meses de 2025' })).getAllByRole('tab')
    expect(mesesDoAno.map((m) => m.textContent)).toEqual(['nov', 'dez'])
    expect(mesesDoAno[1]).toHaveAttribute('aria-selected', 'true')
    expect(await screen.findByRole('heading', { name: /dezembro de 2025/i })).toBeInTheDocument()
  })

  it('mostra só as transações do mês escolhido', async () => {
    render(<MesesPorAbas meses={meses} transacoes={transacoes} />)

    expect(screen.getByRole('table', { name: 'Transações' })).toHaveTextContent('Uber Viagem')
    fireEvent.click(screen.getByRole('tab', { name: '2025' }))
    await screen.findByRole('heading', { name: /dezembro de 2025/i })
    const tabela = screen.getByRole('table', { name: 'Transações' })
    expect(tabela).toHaveTextContent('Mercado Exemplo')
    expect(tabela).not.toHaveTextContent('Uber Viagem')
  })
})

describe('ListaDeTransacoes', () => {
  const doMes = transacoes.slice(0, 2)
  const janeiro = meses[2]

  it('os indicadores vêm do resumo do mês que a api calculou', () => {
    render(<ListaDeTransacoes transacoes={doMes} mes={janeiro} />)

    expect(screen.getByRole('group', { name: 'Total' })).toHaveTextContent('2')
    expect(screen.getByRole('group', { name: 'Despesas' })).toHaveTextContent('−R$ 1.741,63')
    expect(screen.getByRole('group', { name: 'Receitas' })).toHaveTextContent('+R$ 1.630,00')
    expect(screen.getByRole('group', { name: 'Resultado' })).toHaveTextContent('-R$ 111,63')
  })

  it('busca, filtra por categoria e avisa quando não encontra nada', () => {
    render(<ListaDeTransacoes transacoes={doMes} mes={janeiro} />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar transações' }), { target: { value: 'uber' } })
    expect(within(screen.getByRole('table', { name: 'Transações' })).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'Total' })).toHaveTextContent('1')

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoria' }), { target: { value: 'Entrada' } })
    expect(screen.getByText('Nenhuma transação encontrada.')).toBeInTheDocument()
  })

  it('ordena pelo maior valor', () => {
    render(<ListaDeTransacoes transacoes={doMes} mes={janeiro} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Ordenar por' }), { target: { value: 'maior' } })

    const linhas = within(screen.getByRole('table', { name: 'Transações' })).getAllByRole('row')
    expect(linhas[1]).toHaveTextContent('Pix recebido')
    expect(linhas[1]).toHaveTextContent('+R$ 1.630,00')
    expect(linhas[1]).toHaveTextContent('05/01/2026')
  })
})
