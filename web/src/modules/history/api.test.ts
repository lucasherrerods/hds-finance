import { afterEach, describe, expect, it, vi } from 'vitest'
import { adicionarExtrato, buscarHistorico, enviarFechamento } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('buscarHistorico', () => {
  it('lê o histórico guardado no modo pessoal', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const historico = { meses: [], painel: null, transacoes: [] }
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(historico), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await buscarHistorico()).toEqual({ ok: true, historico })
    expect(fetchFalso.mock.calls[0][0]).toBe('http://api.test/pessoal/historico')
  })

  it('avisa quando a api do modo pessoal não está rodando', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('falhou')))

    const resultado = await buscarHistorico()

    expect(resultado.ok).toBe(false)
  })
})

describe('adicionarExtrato', () => {
  it('manda o arquivo para o histórico local e devolve o que aconteceu', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const corpo = { transacoesNovas: 3, duplicadas: 0, fechamento: 'Fechamento de 2026-10 enviado por e-mail.' }
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify(corpo), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)
    const arquivo = new File(['x'], 'outubro.ofx')

    expect(await adicionarExtrato(arquivo)).toEqual({ ok: true, ...corpo })
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/pessoal/extratos')
    expect((opcoes.body as FormData).get('arquivo')).toBe(arquivo)
  })

  it('devolve a linha quando o arquivo é inválido', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Data inválida.', linha: 4 }), { status: 422 })))

    expect(await adicionarExtrato(new File([''], 'a.csv'))).toEqual({ ok: false, mensagem: 'Data inválida. (linha 4)' })
  })
})

describe('enviarFechamento', () => {
  it('envia o fechamento do mês, com ou sem forçar', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mensagem: 'Enviado.' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchFalso)

    expect(await enviarFechamento({ ano: 2026, mes: 10 }, true)).toEqual({ ok: true, mensagem: 'Enviado.' })
    expect(fetchFalso.mock.calls[0][0]).toBe('http://api.test/pessoal/fechamento?mes=2026-10&forcar=true')
    expect(fetchFalso.mock.calls[0][1].method).toBe('POST')
  })

  it('avisa quando o mês já tinha sido enviado', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: 'Já tinha sido enviado.' }), { status: 409 })))

    expect(await enviarFechamento({ ano: 2026, mes: 10 })).toEqual({ ok: false, mensagem: 'Já tinha sido enviado.', jaEnviado: true })
  })
})
