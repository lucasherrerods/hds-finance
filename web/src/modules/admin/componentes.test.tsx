import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdicionarExtrato } from './AdicionarExtrato'
import { EnviarFechamento } from './EnviarFechamento'

vi.mock('./api', () => ({ adicionarExtrato: vi.fn(), adicionarFatura: vi.fn(), enviarFechamento: vi.fn() }))
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

    fireEvent.change(screen.getByLabelText(/incluir extrato/i), { target: { files: [new File(['x'], 'outubro.ofx')] } })

    await vi.waitFor(() =>
      expect(aoImportar).toHaveBeenCalledWith('3 transações novas, 1 já existia. Fechamento de 2026-10 enviado por e-mail.'),
    )
  })

  it('mostra o erro do arquivo', async () => {
    vi.mocked(api.adicionarExtrato).mockResolvedValue({ ok: false, mensagem: 'Data inválida. (linha 4)' })
    render(<AdicionarExtrato aoImportar={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/incluir extrato/i), { target: { files: [new File(['x'], 'a.csv')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Data inválida. (linha 4)')
  })
})

describe('AdicionarExtrato em lote', () => {
  const extrato = { ok: true as const, transacoesNovas: 3, duplicadas: 0, fechamento: 'Fechado.' }
  const fatura = { ok: true as const, transacoesNovas: 5, duplicadas: 0 }
  const pdf = new File(['x'], 'nov.pdf')

  const escolher = (files: File[]) => fireEvent.change(screen.getByLabelText(/incluir extrato/i), { target: { files } })

  it('manda as faturas antes e só o último extrato fecha o mês', async () => {
    vi.mocked(api.adicionarExtrato).mockResolvedValue(extrato)
    vi.mocked(api.adicionarFatura).mockResolvedValue(fatura)
    const aoImportar = vi.fn()
    render(<AdicionarExtrato aoImportar={aoImportar} />)
    const [a, b] = [new File(['x'], 'a.ofx'), new File(['x'], 'b.ofx')]

    escolher([a, pdf, b])

    await vi.waitFor(() =>
      expect(aoImportar).toHaveBeenCalledWith(
        'nov.pdf: 5 transações novas, 0 já existiam. a.ofx: 3 transações novas, 0 já existiam. b.ofx: 3 transações novas, 0 já existiam. Fechado.',
      ),
    )
    expect(api.adicionarExtrato).toHaveBeenNthCalledWith(1, a, false)
    expect(api.adicionarExtrato).toHaveBeenNthCalledWith(2, b, true)
    expect(vi.mocked(api.adicionarFatura).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(api.adicionarExtrato).mock.invocationCallOrder[0])
  })

  it('pede a senha uma vez, tenta de novo e não a deixa na tela', async () => {
    vi.mocked(api.adicionarFatura)
      .mockResolvedValueOnce({ ok: false, mensagem: 'Tem senha.', pedeSenha: true })
      .mockResolvedValueOnce({ ok: false, mensagem: 'Tem senha.', pedeSenha: true })
      .mockResolvedValue(fatura)
    const aoImportar = vi.fn()
    render(<AdicionarExtrato aoImportar={aoImportar} />)

    escolher([pdf])
    fireEvent.change(await screen.findByLabelText(/senha de 1 fatura/i), { target: { value: 'errada' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('A senha não abriu 1 fatura.')
    expect(screen.getByLabelText(/senha de 1 fatura/i)).toHaveValue('')
    fireEvent.change(screen.getByLabelText(/senha de 1 fatura/i), { target: { value: 'certa' } })
    fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))

    await vi.waitFor(() => expect(aoImportar).toHaveBeenCalledWith('5 transações novas, 0 já existiam.'))
    expect(api.adicionarFatura).toHaveBeenLastCalledWith(pdf, 'certa')
    expect(screen.queryByLabelText(/senha/i)).not.toBeInTheDocument()
  })

  it('um arquivo com erro não impede os outros', async () => {
    vi.mocked(api.adicionarFatura).mockResolvedValue({ ok: false, mensagem: 'Não fecha.', pedeSenha: false })
    vi.mocked(api.adicionarExtrato).mockResolvedValue(extrato)
    const aoImportar = vi.fn()
    render(<AdicionarExtrato aoImportar={aoImportar} />)

    escolher([pdf, new File(['x'], 'a.ofx')])

    expect(await screen.findByRole('alert')).toHaveTextContent('nov.pdf: Não fecha.')
    expect(aoImportar).toHaveBeenCalledWith('a.ofx: 3 transações novas, 0 já existiam. Fechado.')
  })
})

describe('EnviarFechamento', () => {
  const mes = { ano: 2026, mes: 10 }

  it('envia o fechamento do mês para o e-mail do admin', async () => {
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
