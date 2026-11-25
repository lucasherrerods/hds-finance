import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mesesDeExemplo } from '../landing'
import { CompartilharMes } from './CompartilharMes'

const mesDeExemplo = mesesDeExemplo.at(-1)!

vi.mock('./arquivos', async (original) => ({ ...(await original<object>()), entregar: vi.fn(), gerarPdf: vi.fn() }))
vi.mock('./imagemDoMes', async (original) => ({ ...(await original<object>()), desenharImagem: vi.fn() }))
const { entregar, gerarPdf } = await import('./arquivos')
const { desenharImagem } = await import('./imagemDoMes')

describe('CompartilharMes', () => {
  beforeEach(() => {
    vi.mocked(entregar).mockResolvedValue('baixado')
    vi.mocked(desenharImagem).mockResolvedValue(new Blob(['x']))
  })

  it('a imagem esconde os valores por padrão', async () => {
    render(<CompartilharMes mes={mesDeExemplo} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar imagem/i }))

    expect(await screen.findByText('Arquivo baixado.')).toBeInTheDocument()
    expect(JSON.stringify(vi.mocked(desenharImagem).mock.calls[0][0])).not.toMatch(/\d,\d{2}/)
  })

  it('se o toque venceu enquanto o pdf era montado, pede outro', async () => {
    vi.mocked(gerarPdf).mockResolvedValue({ ok: true, pdf: new Blob(['%PDF-']) })
    vi.mocked(entregar).mockResolvedValueOnce('precisa-de-toque').mockResolvedValueOnce('compartilhado')
    render(<CompartilharMes mes={mesDeExemplo} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar pdf/i }))

    fireEvent.click(await screen.findByRole('button', { name: /toque para enviar/i }))

    await vi.waitFor(() => expect(screen.queryByRole('button', { name: /toque para enviar/i })).not.toBeInTheDocument())
  })

  it('mostra o erro da api', async () => {
    vi.mocked(gerarPdf).mockResolvedValue({ ok: false, mensagem: 'Sem transações.' })
    render(<CompartilharMes mes={mesDeExemplo} />)
    fireEvent.click(screen.getByRole('button', { name: /compartilhar pdf/i }))
    expect(await screen.findByText('Sem transações.')).toBeInTheDocument()
  })
})
