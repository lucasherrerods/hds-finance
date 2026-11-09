import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { lerEmailConfirmado, salvarConfirmacao } from './armazenamento'
import { EnviarPorEmail } from './EnviarPorEmail'

vi.mock('./api', () => ({ pedirCodigo: vi.fn(), confirmarCodigo: vi.fn(), enviarRelatorioPorEmail: vi.fn() }))
const api = await import('./api')

const arquivo = new File(['x'], 'extrato.ofx')
const mes = { ano: 2026, mes: 10 }

afterEach(() => {
  localStorage.clear()
  vi.resetAllMocks()
})

describe('EnviarPorEmail', () => {
  it('na primeira vez confirma o e-mail com um código e depois envia', async () => {
    vi.mocked(api.pedirCodigo).mockResolvedValue({ ok: true, desafio: 'd1' })
    vi.mocked(api.confirmarCodigo).mockResolvedValue({ ok: true, token: 't1' })
    vi.mocked(api.enviarRelatorioPorEmail).mockResolvedValue({ ok: true })
    render(<EnviarPorEmail arquivo={arquivo} mes={mes} />)

    fireEvent.change(screen.getByLabelText(/seu e-mail/i), { target: { value: 'pessoa@exemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: /mandar código/i }))
    fireEvent.change(await screen.findByLabelText(/código/i), { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: /confirmar/i }))
    fireEvent.click(await screen.findByRole('button', { name: /enviar pdf para pessoa@exemplo.com/i }))

    expect(await screen.findByText(/enviado para pessoa@exemplo.com/i)).toBeInTheDocument()
    expect(api.confirmarCodigo).toHaveBeenCalledWith('pessoa@exemplo.com', '123456', 'd1')
    expect(api.enviarRelatorioPorEmail).toHaveBeenCalledWith(arquivo, mes, 'pessoa@exemplo.com', 't1')
    expect(lerEmailConfirmado()).toEqual({ email: 'pessoa@exemplo.com', token: 't1' })
  })

  it('com o e-mail já confirmado, vai direto para o envio', () => {
    salvarConfirmacao('pessoa@exemplo.com', 't1')

    render(<EnviarPorEmail arquivo={arquivo} mes={mes} />)

    expect(screen.getByRole('button', { name: /enviar pdf para pessoa@exemplo.com/i })).toBeInTheDocument()
  })

  it('trocar de e-mail esquece a confirmação', () => {
    salvarConfirmacao('pessoa@exemplo.com', 't1')
    render(<EnviarPorEmail arquivo={arquivo} mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /trocar e-mail/i }))

    expect(screen.getByLabelText(/seu e-mail/i)).toBeInTheDocument()
    expect(lerEmailConfirmado()).toBeNull()
  })

  it('confirmação vencida volta para o pedido de código', async () => {
    salvarConfirmacao('pessoa@exemplo.com', 'velho')
    vi.mocked(api.enviarRelatorioPorEmail).mockResolvedValue({ ok: false, mensagem: 'Confirme o e-mail.', confirmarDeNovo: true })
    render(<EnviarPorEmail arquivo={arquivo} mes={mes} />)

    fireEvent.click(screen.getByRole('button', { name: /enviar pdf/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Confirme o e-mail.')
    expect(screen.getByLabelText(/seu e-mail/i)).toHaveValue('pessoa@exemplo.com')
    expect(lerEmailConfirmado()).toBeNull()
  })

  it('mostra o erro do pedido de código', async () => {
    vi.mocked(api.pedirCodigo).mockResolvedValue({ ok: false, mensagem: 'Confira o endereço digitado.' })
    render(<EnviarPorEmail arquivo={arquivo} mes={mes} />)

    fireEvent.change(screen.getByLabelText(/seu e-mail/i), { target: { value: 'pessoa@exemplo' } })
    fireEvent.click(screen.getByRole('button', { name: /mandar código/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Confira o endereço digitado.')
  })
})
