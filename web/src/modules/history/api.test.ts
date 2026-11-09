import { afterEach, describe, expect, it, vi } from 'vitest'
import { buscarHistorico } from './api'

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
