import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ListaDeTransacoes, type EdicaoDoHistorico } from './ListaDeTransacoes'

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

const edicao = (extra: Partial<EdicaoDoHistorico> = {}): EdicaoDoHistorico => ({
  categorias: ['Moradia', 'Sem categoria'],
  aoMudar: vi.fn(),
  aoApagar: vi.fn(),
  aoApagarMes: vi.fn(),
  ...extra,
})

describe('ListaDeTransacoes', () => {
  it('sem edição, a categoria é só texto', () => {
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} />)

    expect(screen.queryByRole('combobox', { name: /categoria de pix enviado joao/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apagar/i })).not.toBeInTheDocument()
  })

  it('marca o que foi comprado no cartão', () => {
    render(<ListaDeTransacoes transacoes={[{ ...transacoes[0], noCartao: true }, transacoes[1]]} mes={mes} />)

    expect(screen.getAllByText('Cartão')).toHaveLength(1)
  })

  it('com edição, apaga uma transação do histórico', () => {
    const aoApagar = vi.fn()
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} edicao={edicao({ aoApagar })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Apagar Pix enviado Joao' }))

    expect(aoApagar).toHaveBeenCalledWith(transacoes[0])
  })

  it('com edição, troca a categoria de um gasto', () => {
    const aoMudar = vi.fn()
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} edicao={edicao({ aoMudar })} />)

    fireEvent.change(screen.getByRole('combobox', { name: /categoria de pix enviado joao/i }), { target: { value: 'Moradia' } })

    expect(aoMudar).toHaveBeenCalledWith('Pix enviado Joao', 'Moradia')
  })

  it('investimentos e transferências não têm categoria para trocar', () => {
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} edicao={edicao()} />)

    expect(screen.queryByRole('combobox', { name: /categoria de aplicação cdb/i })).not.toBeInTheDocument()
  })
})
