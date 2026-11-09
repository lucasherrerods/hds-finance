import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListaDeTransacoes } from './ListaDeTransacoes'

const mes = {
  ano: 2026,
  mes: 10,
  entradas: 0,
  saidas: 60,
  resultado: -60,
  investimentosETransferencias: -1000,
  saldoInicial: null,
  saldoFinal: null,
  gastosPorCategoria: [],
  investimentos: { aplicado: 1000, resgatado: 0, aplicadoAcumulado: 1000 },
}

const transacoes = [
  { data: '2026-10-05', descricao: 'Pix enviado Joao', categoria: 'Sem categoria', valor: -60 },
  { data: '2026-10-09', descricao: 'Aplicação CDB', categoria: 'Investimentos e transferências', valor: -1000 },
]

describe('ListaDeTransacoes', () => {
  it('sem edição, a categoria é só texto', () => {
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} />)

    expect(screen.queryByRole('combobox', { name: /categoria de pix enviado joao/i })).not.toBeInTheDocument()
  })

  it('com edição, troca a categoria de um gasto', () => {
    const aoMudar = vi.fn()
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} edicao={{ categorias: ['Moradia', 'Sem categoria'], aoMudar }} />)

    fireEvent.change(screen.getByRole('combobox', { name: /categoria de pix enviado joao/i }), { target: { value: 'Moradia' } })

    expect(aoMudar).toHaveBeenCalledWith('Pix enviado Joao', 'Moradia')
  })

  it('investimentos e transferências não têm categoria para trocar', () => {
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} edicao={{ categorias: ['Moradia'], aoMudar: vi.fn() }} />)

    expect(screen.queryByRole('combobox', { name: /categoria de aplicação cdb/i })).not.toBeInTheDocument()
  })
})
