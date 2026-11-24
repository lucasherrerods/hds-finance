import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FaturasDoCartao, type Fatura } from './FaturasDoCartao'

const compra = { data: '2026-10-05', descricao: 'Lanche', categoria: 'Alimentação', valor: -30, noCartao: true }
const fatura = (vencimento: string, paga: boolean | null = true): Fatura => ({ vencimento, total: 30, gasto: 30, paga, compras: [compra] })

describe('FaturasDoCartao', () => {
  it('abre a mais nova e deixa as outras fechadas', () => {
    render(<FaturasDoCartao faturas={[fatura('2026-11-02'), fatura('2026-10-02')]} />)

    expect(screen.getByRole('button', { name: /novembro de 2026/i })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /outubro de 2026/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByText('Lanche')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /outubro de 2026/i }))
    expect(screen.getAllByText('Lanche')).toHaveLength(2)
  })

  it('diz se o pagamento foi encontrado', () => {
    render(<FaturasDoCartao faturas={[fatura('2026-11-02', false), fatura('2026-10-02', true), fatura('2026-09-02', null)]} />)

    expect(within(screen.getByRole('button', { name: /novembro/i })).getByText('Pagamento não encontrado')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /outubro/i })).getByText('Paga')).toBeInTheDocument()
    expect(within(screen.getByRole('button', { name: /setembro/i })).queryByText(/paga/i)).not.toBeInTheDocument()
  })

  it('faturas de bancos diferentes no mesmo dia ficam separadas', () => {
    render(<FaturasDoCartao faturas={[{ ...fatura('2026-11-02'), banco: 'Nubank' }, { ...fatura('2026-11-02'), banco: 'Inter' }]} />)

    expect(screen.getByRole('button', { name: /nubank/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /inter/i })).toBeInTheDocument()
  })

  it('separa por ano quando há mais de um', () => {
    render(<FaturasDoCartao faturas={[fatura('2026-01-02'), fatura('2025-12-02')]} />)

    expect(screen.queryByRole('button', { name: /dezembro de 2025/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: '2025' }))
    expect(screen.getByRole('button', { name: /dezembro de 2025/i })).toBeInTheDocument()
  })
})
