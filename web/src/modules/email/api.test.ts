import { afterEach, describe, expect, it, vi } from 'vitest'
import { confirmarCodigo, enviarRelatorioPorEmail, pedirCodigo } from './api'

function responderCom(status: number, corpo: unknown) {
  const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('api do e-mail', () => {
  it('pede o código e devolve o desafio assinado', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = responderCom(200, { desafio: 'd1' })

    expect(await pedirCodigo('pessoa@exemplo.com')).toEqual({ ok: true, desafio: 'd1' })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/demonstracao/email/codigo')
    expect(JSON.parse(opcoes.body as string)).toEqual({ email: 'pessoa@exemplo.com' })
  })

  it('confirma o código e devolve o token', async () => {
    const fetchFalso = responderCom(200, { token: 't1' })

    expect(await confirmarCodigo('pessoa@exemplo.com', '123456', 'd1')).toEqual({ ok: true, token: 't1' })
    expect(JSON.parse(fetchFalso.mock.calls[0][1].body as string)).toEqual({
      email: 'pessoa@exemplo.com',
      codigo: '123456',
      desafio: 'd1',
    })
  })

  it('manda o extrato, o e-mail e o token para enviar o relatório', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = responderCom(200, { mes: '2026-10' })
    const arquivo = new File(['x'], 'extrato.ofx')

    expect(await enviarRelatorioPorEmail(arquivo, { ano: 2026, mes: 10 }, 'pessoa@exemplo.com', 't1')).toEqual({ ok: true })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/demonstracao/relatorio/email?mes=2026-10')
    const corpo = opcoes.body as FormData
    expect(corpo.get('arquivo')).toBe(arquivo)
    expect(corpo.get('email')).toBe('pessoa@exemplo.com')
    expect(corpo.get('token')).toBe('t1')
  })

  it('avisa quando a confirmação não vale mais', async () => {
    responderCom(401, { title: 'E-mail não confirmado', detail: 'Confirme o e-mail antes de enviar o relatório.' })

    const resultado = await enviarRelatorioPorEmail(new File([''], 'a.ofx'), { ano: 2026, mes: 10 }, 'a@b.com', 'velho')

    expect(resultado).toEqual({ ok: false, mensagem: 'Confirme o e-mail antes de enviar o relatório.', confirmarDeNovo: true })
  })
})
