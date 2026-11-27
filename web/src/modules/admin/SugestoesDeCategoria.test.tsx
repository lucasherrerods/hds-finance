import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SugestoesDeCategoria } from './SugestoesDeCategoria'

vi.mock('./api', () => ({ buscarSugestoes: vi.fn(), buscarMesesSemCategoria: vi.fn(), corrigirCategoria: vi.fn() }))
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
  vi.mocked(api.buscarMesesSemCategoria).mockResolvedValue({
    ok: true,
    meses: [
      { ano: 2026, mes: 11, quantidade: 2 },
      { ano: 2026, mes: 10, quantidade: 1 },
    ],
  })
  vi.mocked(api.corrigirCategoria).mockResolvedValue({ ok: true })
})

const escolher = async (nome: RegExp) => fireEvent.click(await screen.findByRole('button', { name: nome }))

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
  it('antes de chamar a IA, mostra os meses com gasto sem categoria', async () => {
    abrir()

    expect(await screen.findByRole('button', { name: /todos os meses.*3/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /novembro de 2026.*2/i })).toBeInTheDocument()
    expect(api.buscarSugestoes).not.toHaveBeenCalled()
  })

  it('com um mês escolhido, a IA recebe só ele, e dá para voltar e trocar', async () => {
    abrir()

    await escolher(/novembro de 2026/i)
    expect(await screen.findByRole('button', { name: 'Aplicar para Pagamento XPTO' })).toBeInTheDocument()
    expect(api.buscarSugestoes).toHaveBeenCalledWith('2026-11')

    fireEvent.click(screen.getByRole('button', { name: /trocar o mês/i }))
    expect(await screen.findByRole('button', { name: /todos os meses/i })).toBeInTheDocument()
  })

  it('sem gasto sem categoria, nem pergunta o mês', async () => {
    vi.mocked(api.buscarMesesSemCategoria).mockResolvedValue({ ok: true, meses: [] })
    abrir()

    expect(await screen.findByText(/tudo categorizado/i)).toBeInTheDocument()
  })

  it('aplica a categoria sugerida', async () => {
    const aoAceitar = vi.fn()
    abrir(aoAceitar)
    await escolher(/todos os meses/i)

    fireEvent.click(await screen.findByRole('button', { name: 'Aplicar para Pagamento XPTO' }))

    await vi.waitFor(() => expect(aoAceitar).toHaveBeenCalled())
    expect(api.corrigirCategoria).toHaveBeenCalledWith('Pagamento XPTO', 'Jogos')
  })

  it('troca a sugestão antes de aplicar', async () => {
    abrir()
    await escolher(/todos os meses/i)

    fireEvent.change(await screen.findByLabelText('Categoria para Pagamento XPTO'), { target: { value: 'Lojas' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar para Pagamento XPTO' }))

    await vi.waitFor(() => expect(api.corrigirCategoria).toHaveBeenCalledWith('Pagamento XPTO', 'Lojas'))
  })

  it('sem sugestões, avisa', async () => {
    vi.mocked(api.buscarSugestoes).mockResolvedValue({ ok: true, sugestoes: [] })
    abrir()
    await escolher(/todos os meses/i)

    expect(await screen.findByText(/Nenhuma sugestão/)).toBeInTheDocument()
    expect(api.buscarSugestoes).toHaveBeenCalledWith(undefined)
  })
})
