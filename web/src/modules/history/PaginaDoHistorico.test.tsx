import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PaginaDoHistorico } from './PaginaDoHistorico'

vi.mock('./api', () => ({ buscarHistorico: vi.fn() }))
const { buscarHistorico } = await import('./api')

const outubro = {
  ano: 2026,
  mes: 10,
  entradas: 3500,
  saidas: 120,
  resultado: 3380,
  investimentosETransferencias: 0,
  saldoInicial: null,
  saldoFinal: null,
  gastosPorCategoria: [],
  investimentos: { aplicado: 0, resgatado: 0, aplicadoAcumulado: 0 },
}

describe('PaginaDoHistorico', () => {
  it('mostra quantos meses estão guardados e o mês a mês', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue({ ok: true, historico: { meses: [outubro], painel: null, transacoes: [] } })

    render(<PaginaDoHistorico />)

    expect(await screen.findByRole('heading', { level: 1, name: /seu histórico/i })).toBeInTheDocument()
    expect(screen.getByText(/1 mês guardado/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /outubro de 2026/i })).toBeInTheDocument()
  })

  it('sem nada importado, explica como começar', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue({ ok: true, historico: { meses: [], painel: null, transacoes: [] } })

    render(<PaginaDoHistorico />)

    expect(await screen.findByText(/pasta de extratos/i)).toBeInTheDocument()
  })

  it('mostra o erro quando a api não responde', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue({ ok: false, mensagem: 'Não foi possível falar com o servidor.' })

    render(<PaginaDoHistorico />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível falar com o servidor.')
  })
})
