import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdicionarExtrato } from './AdicionarExtrato'
import { EnviarFechamento } from './EnviarFechamento'

vi.mock('./api', () => ({ adicionarExtrato: vi.fn(), enviarFechamento: vi.fn() }))
const api = await import('./api')

afterEach(() => vi.resetAllMocks())

describe('AdicionarExtrato', () => {
  it('importa o arquivo escolhido e conta o que aconteceu', async () => {
    vi.mocked(api.adicionarExtrato).mockResolvedValue({
      ok: true,
      transacoesNovas: 3,
      duplicadas: 1,
      fechamento: 'Fechamento de 2026-10 enviado por e-mail.',
    })
    const aoImportar = vi.fn()
    render(<AdicionarExtrato aoImportar={aoImportar} />)

    fireEvent.change(screen.getByLabelText(/adicionar extrato/i), { target: { files: [new File(['x'], 'outubro.ofx')] } })

    await vi.waitFor(() =>
      expect(aoImportar).toHaveBeenCalledWith('3 transações novas, 1 já existia. Fechamento de 2026-10 enviado por e-mail.'),
    )
  })

  it('mostra o erro do arquivo', async () => {
    vi.mocked(api.adicionarExtrato).mockResolvedValue({ ok: false, mensagem: 'Data inválida. (linha 4)' })
    render(<AdicionarExtrato aoImportar={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/adicionar extrato/i), { target: { files: [new File(['x'], 'a.csv')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Data inválida. (linha 4)')
  })
})

describe('EnviarFechamento', () => {
  const mes = { ano: 2026, mes: 10 }

  it('envia o fechamento do mês para o e-mail do dono', async () => {
    vi.mocked(api.enviarFechamento).mockResolvedValue({ ok: true, mensagem: 'Fechamento de 2026-10 enviado por e-mail.' })
    render(<EnviarFechamento mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /enviar fechamento/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Fechamento de 2026-10 enviado por e-mail.')
    expect(api.enviarFechamento).toHaveBeenCalledWith(mes, false)
  })

  it('quando o mês já foi enviado, oferece enviar de novo', async () => {
    vi.mocked(api.enviarFechamento)
      .mockResolvedValueOnce({ ok: false, mensagem: 'Já tinha sido enviado.', jaEnviado: true })
      .mockResolvedValueOnce({ ok: true, mensagem: 'Enviado.' })
    render(<EnviarFechamento mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /enviar fechamento/i }))
    fireEvent.click(await screen.findByRole('button', { name: /enviar de novo/i }))

    expect(await screen.findByRole('status')).toHaveTextContent('Enviado.')
    expect(api.enviarFechamento).toHaveBeenLastCalledWith(mes, true)
  })
})
