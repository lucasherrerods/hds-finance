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
  aoOcultar: vi.fn(),
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

  it('oculta e mostra de novo, e avisa o que está fora da soma', () => {
    const aoOcultar = vi.fn()
    const oculta = { ...transacoes[1], oculta: true }
    render(<ListaDeTransacoes transacoes={[transacoes[0], oculta]} mes={mes} edicao={edicao({ aoOcultar })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar Pix enviado Joao' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Aplicação CDB' }))

    expect(aoOcultar.mock.calls).toEqual([[transacoes[0], true], [oculta, false]])
    expect(screen.getAllByText('Fora da soma')).toHaveLength(1)
  })

  it('uma entrada pode voltar para a categoria automática', () => {
    render(<ListaDeTransacoes transacoes={[{ ...transacoes[0], valor: 60, categoria: 'Moradia' }]} mes={mes} edicao={edicao()} />)

    expect(screen.getByRole('option', { name: 'Entrada' })).toBeInTheDocument()
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

    expect(aoMudar).toHaveBeenCalledWith(transacoes[0], 'Moradia')
  })

  it('investimentos e transferências não têm categoria para trocar', () => {
    render(<ListaDeTransacoes transacoes={transacoes} mes={mes} edicao={edicao()} />)

    expect(screen.queryByRole('combobox', { name: /categoria de aplicação cdb/i })).not.toBeInTheDocument()
  })
})
