import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BaixarRelatorio } from './BaixarRelatorio'

vi.mock('./api', () => ({ baixarRelatorio: vi.fn(), baixarRelatorioDoHistorico: vi.fn() }))
const { baixarRelatorio, baixarRelatorioDoHistorico } = await import('./api')

const arquivo = new File(['x'], 'extrato.ofx')
const mes = { ano: 2026, mes: 10 }

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:relatorio')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => vi.restoreAllMocks())

describe('BaixarRelatorio', () => {
  it('baixa o pdf do mês com o nome do fechamento', async () => {
    vi.mocked(baixarRelatorio).mockResolvedValue({ ok: true, pdf: new Blob(['%PDF-']) })
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<BaixarRelatorio arquivo={arquivo} mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /baixar pdf/i }))

    await vi.waitFor(() => expect(clicar).toHaveBeenCalled())
    expect(baixarRelatorio).toHaveBeenCalledWith(arquivo, mes)
    expect((clicar.mock.contexts[0] as HTMLAnchorElement).download).toBe('fechamento-2026-10.pdf')
  })

  it('mostra o erro quando a api recusa', async () => {
    vi.mocked(baixarRelatorio).mockResolvedValue({ ok: false, mensagem: 'Sem transações.' })
    render(<BaixarRelatorio arquivo={arquivo} mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /baixar pdf/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Sem transações.')
  })

  it('sem arquivo, gera o pdf a partir do histórico local', async () => {
    vi.mocked(baixarRelatorioDoHistorico).mockResolvedValue({ ok: true, pdf: new Blob(['%PDF-']) })
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<BaixarRelatorio mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /baixar pdf/i }))

    await vi.waitFor(() => expect(clicar).toHaveBeenCalled())
    expect(baixarRelatorioDoHistorico).toHaveBeenCalledWith(mes)
  })
})
