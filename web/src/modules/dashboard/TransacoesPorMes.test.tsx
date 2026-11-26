import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { ListaDeTransacoes } from './ListaDeTransacoes'
import { TransacoesPorMes } from './TransacoesPorMes'

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

describe('TransacoesPorMes', () => {
  const periodo = () => screen.getByRole('button', { name: /^Período:/ })
  const tabela = () => screen.getByRole('table', { name: 'Transações' })

  it('abre no último mês do extrato, com os números do fechamento', () => {
    render(<TransacoesPorMes meses={meses} transacoes={transacoes} hoje="2026-03-10" />)

    expect(periodo()).toHaveTextContent('janeiro de 2026')
    expect(tabela()).toHaveTextContent('Uber Viagem')
    expect(screen.queryByText(/mercado exemplo/i)).not.toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Resultado do mês' })).toHaveTextContent('-R$ 111,63')
  })

  it('chama o mês de "Este mês" quando ele é o atual', () => {
    render(<TransacoesPorMes meses={meses} transacoes={transacoes} hoje="2026-01-25" />)
    expect(periodo()).toHaveTextContent('Este mês')
  })

  it('um atalho só vale depois de Aplicar', async () => {
    render(<TransacoesPorMes meses={meses} transacoes={transacoes} hoje="2026-01-25" />)

    fireEvent.click(periodo())
    const painel = within(screen.getByRole('dialog', { name: 'Escolher período' }))
    fireEvent.click(painel.getByRole('button', { name: 'Todo período' }))
    expect(screen.queryByText(/mercado exemplo/i)).not.toBeInTheDocument()

    fireEvent.click(painel.getByRole('button', { name: 'Aplicar' }))

    expect(await screen.findByText(/mercado exemplo/i)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Receitas no período' })).toBeInTheDocument()
  })

  it('no calendário, dois cliques fazem o intervalo', async () => {
    render(<TransacoesPorMes meses={meses} transacoes={transacoes} hoje="2026-01-25" />)

    fireEvent.click(periodo())
    const painel = within(screen.getByRole('dialog', { name: 'Escolher período' }))
    fireEvent.click(painel.getByRole('button', { name: '15/01/2026' }))
    expect(painel.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
    fireEvent.click(painel.getByRole('button', { name: '25/01/2026' }))
    fireEvent.click(painel.getByRole('button', { name: 'Aplicar' }))

    expect(await screen.findByRole('button', { name: 'Período: 15/01/2026 – 25/01/2026' })).toBeInTheDocument()
    expect(tabela()).toHaveTextContent('Uber Viagem')
    expect(tabela()).not.toHaveTextContent('Cliente')
  })
})

describe('ListaDeTransacoes', () => {
  const doMes = transacoes.slice(0, 2)
  const janeiro = meses[2]

  it('os indicadores vêm do resumo do mês que a api calculou', () => {
    render(<ListaDeTransacoes transacoes={doMes} totais={janeiro} />)

    expect(screen.getByRole('group', { name: 'Total' })).toHaveTextContent('2')
    expect(screen.getByRole('group', { name: 'Despesas do mês' })).toHaveTextContent('−R$ 1.741,63')
    expect(screen.getByRole('group', { name: 'Receitas do mês' })).toHaveTextContent('+R$ 1.630,00')
    expect(screen.getByRole('group', { name: 'Resultado do mês' })).toHaveTextContent('-R$ 111,63')
  })

  it('busca, filtra por categoria e avisa quando não encontra nada', () => {
    render(<ListaDeTransacoes transacoes={doMes} totais={janeiro} />)

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar transações' }), { target: { value: 'uber' } })
    expect(within(screen.getByRole('table', { name: 'Transações' })).getAllByRole('row')).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'Total' })).toHaveTextContent('1')

    fireEvent.change(screen.getByRole('combobox', { name: 'Categoria' }), { target: { value: 'Entrada' } })
    expect(screen.getByText('Nenhuma transação encontrada.')).toBeInTheDocument()
  })

  it('ordena pelo maior valor', () => {
    render(<ListaDeTransacoes transacoes={doMes} totais={janeiro} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Ordenar por' }), { target: { value: 'maior' } })

    const linhas = within(screen.getByRole('table', { name: 'Transações' })).getAllByRole('row')
    expect(linhas[1]).toHaveTextContent('Pix recebido')
    expect(linhas[1]).toHaveTextContent('+R$ 1.630,00')
    expect(linhas[1]).toHaveTextContent('05/01/2026')
  })
})
