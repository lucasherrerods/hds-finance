import { afterEach, describe, expect, it, vi } from 'vitest'
import { enviarExtrato } from './api'

const resumo = {
  transacoesNovas: 3,
  duplicadas: 0,
  meses: [{ ano: 2026, mes: 10, entradas: 3500, saidas: 123.45, resultado: 3376.55 }],
}

function responderCom(status: number, corpo: unknown) {
  const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fetchFalso)
  return fetchFalso
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('enviarExtrato', () => {
  it('envia o arquivo para a rota da demonstração e devolve o resumo', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = responderCom(200, resumo)
    const arquivo = new File(['conteudo'], 'extrato.ofx')

    const resultado = await enviarExtrato(arquivo)

    expect(resultado).toEqual({ ok: true, resumo })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/demonstracao/resumo')
    expect((opcoes.body as FormData).get('arquivo')).toBe(arquivo)
  })

  it('devolve a mensagem e a linha quando a api recusa o arquivo', async () => {
    responderCom(422, { title: 'Arquivo inválido', detail: 'Valor da transação inválido.', linha: 4 })

    const resultado = await enviarExtrato(new File([''], 'extrato.csv'))

    expect(resultado).toEqual({ ok: false, mensagem: 'Valor da transação inválido. (linha 4)' })
  })

  it('avisa quando a api não responde', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('falhou')))

    const resultado = await enviarExtrato(new File([''], 'extrato.csv'))

    expect(resultado).toEqual({ ok: false, mensagem: 'Não foi possível falar com o servidor. Tente de novo.' })
  })
})
