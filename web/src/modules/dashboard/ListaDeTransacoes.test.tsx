import { fireEvent, render, screen, within } from '@testing-library/react'
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
  it('clicar numa transação abre os detalhes com as semelhantes do histórico, sem chamar a api', () => {
    const anterior = { data: '2026-09-05', descricao: 'Pix enviado Joao', categoria: 'Sem categoria', valor: -40, chave: 'a' }
    render(<ListaDeTransacoes transacoes={transacoes} historico={[anterior, ...transacoes]} totais={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /detalhes de pix enviado joao/i }))

    const dialogo = screen.getByRole('dialog', { name: /detalhes da transação/i })
    expect(dialogo).toHaveTextContent('05/10/2026')
    expect(within(dialogo).getByRole('list', { name: /semelhantes/i })).toHaveTextContent('40,00')
  })

  it('nos detalhes, a categoria troca e a transação pode ser ocultada', () => {
    const aoMudar = vi.fn()
    const aoOcultar = vi.fn()
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} edicao={edicao({ aoMudar, aoOcultar })} />)

    fireEvent.click(screen.getByRole('button', { name: /detalhes de pix enviado joao/i }))
    const dialogo = screen.getByRole('dialog', { name: /detalhes da transação/i })
    fireEvent.click(within(dialogo).getByRole('button', { name: /^ocultar$/i }))
    fireEvent.click(within(dialogo).getByRole('button', { name: /categoria de pix enviado joao/i }))
    fireEvent.change(within(dialogo).getByRole('searchbox', { name: /buscar categoria/i }), { target: { value: 'mora' } })
    expect(within(dialogo).getAllByRole('option')).toHaveLength(1)
    fireEvent.click(within(dialogo).getByRole('option', { name: 'Moradia' }))

    expect(aoOcultar).toHaveBeenCalledWith(transacoes[0], true)
    expect(aoMudar).toHaveBeenCalledWith(transacoes[0], 'Moradia')
  })

  it('sem edição, a categoria é só texto', () => {
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} />)

    expect(screen.queryByRole('button', { name: /categoria de pix enviado joao/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /apagar/i })).not.toBeInTheDocument()
  })

  it('com mais de um banco, mostra e filtra por ele', () => {
    render(<ListaDeTransacoes transacoes={[transacoes[0], { ...transacoes[1], banco: 'Nubank' }]} totais={mes} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Banco' }), { target: { value: 'Nubank' } })

    expect(screen.getByText('Aplicação CDB')).toBeInTheDocument()
    expect(screen.queryByText('Pix enviado Joao')).not.toBeInTheDocument()
  })

  it('filtra por tipo; cartão só aparece quando há compra nele', () => {
    render(<ListaDeTransacoes transacoes={[transacoes[0], { ...transacoes[1], noCartao: true }]} totais={mes} />)

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo' }), { target: { value: 'cartao' } })
    expect(screen.queryByText('Pix enviado Joao')).not.toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Tipo' }), { target: { value: 'entradas' } })
    expect(screen.getByText('Nenhuma transação encontrada.')).toBeInTheDocument()
  })

  it('sem ocultas, não há o que mostrar de novo', () => {
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} />)

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Só no cartão' })).not.toBeInTheDocument()
  })

  it('com um banco só, não há filtro de banco', () => {
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} />)

    expect(screen.queryByRole('combobox', { name: 'Banco' })).not.toBeInTheDocument()
  })

  it('oculta e mostra de novo, e avisa o que está fora da soma', () => {
    const aoOcultar = vi.fn()
    const oculta = { ...transacoes[1], oculta: true }
    render(<ListaDeTransacoes transacoes={[transacoes[0], oculta]} totais={mes} edicao={edicao({ aoOcultar })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar Pix enviado Joao' }))
    expect(screen.queryByText('Aplicação CDB')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('switch', { name: 'Mostrar ocultas (1)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar Aplicação CDB' }))

    expect(aoOcultar.mock.calls).toEqual([[transacoes[0], true], [oculta, false]])
    expect(screen.getAllByText('Fora da soma')).toHaveLength(1)
  })

  it('uma entrada pode voltar para a categoria automática', () => {
    render(<ListaDeTransacoes transacoes={[{ ...transacoes[0], valor: 60, categoria: 'Moradia' }]} totais={mes} edicao={edicao()} />)

    fireEvent.click(screen.getByRole('button', { name: /detalhes de pix enviado joao/i }))
    fireEvent.click(screen.getByRole('button', { name: /categoria de pix enviado joao/i }))
    expect(screen.getByRole('option', { name: 'Entrada' })).toBeInTheDocument()
  })

  it('marca o que foi comprado no cartão', () => {
    render(<ListaDeTransacoes transacoes={[{ ...transacoes[0], noCartao: true }, transacoes[1]]} totais={mes} />)

    expect(screen.getAllByText('Cartão')).toHaveLength(1)
  })

  it('com edição, apaga uma transação do histórico', () => {
    const aoApagar = vi.fn()
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} edicao={edicao({ aoApagar })} />)

    fireEvent.click(screen.getByRole('button', { name: 'Apagar Pix enviado Joao' }))

    expect(aoApagar).toHaveBeenCalledWith(transacoes[0])
  })

  it('com edição, a categoria só troca nos detalhes, não na lista', () => {
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} edicao={edicao()} />)

    expect(screen.queryByRole('button', { name: /categoria de pix enviado joao/i })).not.toBeInTheDocument()
  })

  it('investimentos e transferências não têm categoria para trocar', () => {
    render(<ListaDeTransacoes transacoes={transacoes} totais={mes} edicao={edicao()} />)

    fireEvent.click(screen.getByRole('button', { name: /detalhes de aplicação cdb/i }))

    expect(screen.queryByRole('button', { name: /categoria de aplicação cdb/i })).not.toBeInTheDocument()
  })
})
