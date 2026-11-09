import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { EnvioDeExtrato } from './EnvioDeExtrato'

vi.mock('./api', () => ({ enviarExtrato: vi.fn() }))
const { enviarExtrato } = await import('./api')

function escolherArquivo() {
  const campo = screen.getByLabelText(/extrato/i)
  fireEvent.change(campo, { target: { files: [new File(['x'], 'extrato.ofx')] } })
  fireEvent.click(screen.getByRole('button', { name: /ver resumo/i }))
}

describe('EnvioDeExtrato', () => {
  it('entrega o resumo devolvido pela api', async () => {
    const resumo = { transacoesNovas: 1, duplicadas: 0, meses: [], painel: null, transacoes: [] }
    vi.mocked(enviarExtrato).mockResolvedValue({ ok: true, resumo })
    const aoResumir = vi.fn()
    render(<EnvioDeExtrato aoResumir={aoResumir} />)

    escolherArquivo()

    await vi.waitFor(() => expect(aoResumir).toHaveBeenCalledWith(resumo, expect.any(File)))
  })

  it('mostra o erro devolvido pela api', async () => {
    vi.mocked(enviarExtrato).mockResolvedValue({ ok: false, mensagem: 'Data da transação inválida. (linha 3)' })
    render(<EnvioDeExtrato aoResumir={vi.fn()} />)

    escolherArquivo()

    expect(await screen.findByRole('alert')).toHaveTextContent('Data da transação inválida. (linha 3)')
  })

  it('só libera o envio depois de escolher um arquivo', () => {
    render(<EnvioDeExtrato aoResumir={vi.fn()} />)

    expect(screen.getByRole('button', { name: /ver resumo/i })).toBeDisabled()
  })

  it('aceita o arquivo arrastado e mostra o nome dele', () => {
    render(<EnvioDeExtrato aoResumir={vi.fn()} />)

    fireEvent.drop(screen.getByTestId('area-do-arquivo'), {
      dataTransfer: { files: [new File(['x'], 'outubro.ofx')] },
    })

    expect(screen.getByText('outubro.ofx')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ver resumo/i })).toBeEnabled()
  })

  it('se a api demora, avisa que o servidor pode estar acordando', async () => {
    vi.useFakeTimers()
    vi.mocked(enviarExtrato).mockReturnValue(new Promise(() => {}))
    render(<EnvioDeExtrato aoResumir={vi.fn()} />)

    escolherArquivo()
    expect(screen.queryByText(/acordando/i)).not.toBeInTheDocument()
    await vi.advanceTimersByTimeAsync(5000)

    expect(screen.getByText(/acordando/i)).toBeInTheDocument()
    vi.useRealTimers()
  })
})
