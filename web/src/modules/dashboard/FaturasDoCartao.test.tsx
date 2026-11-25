import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FaturasDoCartao } from './FaturasDoCartao'
import type { Fatura } from './faturas'

const compra = { data: '2026-10-05', descricao: 'Lanche', categoria: 'Alimentação', valor: -30, noCartao: true }
const fatura = (vencimento: string, extra: Partial<Fatura> = {}): Fatura => ({
  vencimento,
  total: 30,
  gasto: 30,
  paga: true,
  compras: [compra],
  gastosPorCategoria: [{ categoria: 'Alimentação', valor: 30 }],
  ...extra,
})

describe('FaturasDoCartao', () => {
  it('destaca a mais nova e mostra um cartão por banco', () => {
    render(<FaturasDoCartao faturas={[fatura('2026-11-02', { total: 99 }), fatura('2026-10-02'), fatura('2024-06-22', { banco: 'Nubank' })]} />)

    expect(screen.getByRole('region', { name: 'Fatura mais recente' })).toHaveTextContent(/R\$\s99,00.*02\/11\/2026.*Paga/)
    expect(screen.getByRole('button', { name: /cartão inter/i })).toHaveTextContent('2 faturas incluídas')
    expect(screen.getByRole('button', { name: /cartão nubank/i })).toHaveTextContent('1 fatura incluída')
  })

  it('clicar numa barra abre a fatura com categorias e lançamentos, e fechar volta', () => {
    render(<FaturasDoCartao faturas={[fatura('2026-11-02'), fatura('2026-10-02')]} />)

    fireEvent.click(screen.getByRole('button', { name: /fatura de outubro de 2026/i }))

    const painel = within(screen.getByRole('dialog', { name: /fatura de outubro de 2026/i }))
    expect(painel.getByRole('region', { name: 'Gastos por categoria da fatura' })).toHaveTextContent('Alimentação')
    expect(painel.getByText('Lanche')).toBeInTheDocument()

    fireEvent.click(painel.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('diz se o pagamento foi encontrado, e cala quando não dá para saber', () => {
    const { rerender } = render(<FaturasDoCartao faturas={[fatura('2026-11-02', { paga: false })]} />)
    expect(screen.getAllByText('Pagamento não encontrado').length).toBeGreaterThan(0)

    rerender(<FaturasDoCartao faturas={[fatura('2026-11-02', { paga: null })]} />)
    expect(screen.queryByText(/^paga|pagamento/i)).not.toBeInTheDocument()
  })

  it('o gráfico é de um banco por vez', () => {
    render(<FaturasDoCartao faturas={[fatura('2026-11-02'), fatura('2024-06-22', { banco: 'Nubank' })]} />)
    const barras = () => within(screen.getByRole('list', { name: 'Faturas do período' })).getAllByRole('button')
    expect(barras()).toHaveLength(1)

    fireEvent.change(screen.getByRole('combobox', { name: 'Cartão do gráfico' }), { target: { value: 'Nubank' } })

    expect(barras()[0]).toHaveAccessibleName(/junho de 2024/i)
  })

  it('anda pelas faturas antigas', () => {
    render(<FaturasDoCartao faturas={['08', '07', '06', '05', '04', '03', '02'].map((m) => fatura(`2026-${m}-02`))} />)
    expect(screen.queryByRole('button', { name: /fatura de fevereiro/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Faturas seguintes' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Faturas anteriores' }))

    expect(screen.getByRole('button', { name: /fatura de fevereiro/i })).toBeInTheDocument()
  })
})
