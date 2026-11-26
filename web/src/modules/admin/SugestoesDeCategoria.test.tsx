import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SugestoesDeCategoria } from './SugestoesDeCategoria'

vi.mock('./api', () => ({ buscarSugestoes: vi.fn(), corrigirCategoria: vi.fn() }))
const api = await import('./api')

const grupos = [
  { nome: 'Lazer', categorias: ['Cinema e eventos', 'Jogos'] },
  { nome: 'Compras', categorias: ['Lojas'] },
]

beforeEach(() => {
  vi.mocked(api.buscarSugestoes).mockResolvedValue({
    ok: true,
    sugestoes: [{ descricao: 'Pagamento XPTO', categoria: 'Jogos', quantidade: 2, valor: 30 }],
  })
  vi.mocked(api.corrigirCategoria).mockResolvedValue({ ok: true })
})

afterEach(() => vi.resetAllMocks())

const abrir = (aoAceitar = vi.fn()) =>
  render(
    <SugestoesDeCategoria
      categorias={['Cinema e eventos', 'Jogos', 'Lojas', 'Sem categoria']}
      grupos={grupos}
      aoAceitar={aoAceitar}
      aoFechar={vi.fn()}
    />,
  )

describe('SugestoesDeCategoria', () => {
  it('aplica a categoria sugerida', async () => {
    const aoAceitar = vi.fn()
    abrir(aoAceitar)

    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar para Pagamento XPTO' }))

    await vi.waitFor(() => expect(aoAceitar).toHaveBeenCalled())
    expect(api.corrigirCategoria).toHaveBeenCalledWith('Pagamento XPTO', 'Jogos')
  })

  it('troca a sugestão antes de aplicar', async () => {
    abrir()

    fireEvent.change(await screen.findByLabelText('Categoria para Pagamento XPTO'), { target: { value: 'Lojas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar para Pagamento XPTO' }))

    await vi.waitFor(() => expect(api.corrigirCategoria).toHaveBeenCalledWith('Pagamento XPTO', 'Lojas'))
  })

  it('sem sugestões, avisa', async () => {
    vi.mocked(api.buscarSugestoes).mockResolvedValue({ ok: true, sugestoes: [] })
    abrir()

    expect(await screen.findByText(/Nenhuma sugestão/)).toBeInTheDocument()
  })
})
