import { afterEach, describe, expect, it, vi } from 'vitest'
import { baixarRelatorio } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('baixarRelatorio', () => {
  it('envia o extrato para a rota do relatório e devolve o pdf', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    // Corpo em texto: o Blob do jsdom não é aceito pelo Response do Node em todas as versões.
    const resposta = new Response('%PDF-', { status: 200, headers: { 'Content-Type': 'application/pdf' } })
    const fetchFalso = vi.fn().mockResolvedValue(resposta)
    vi.stubGlobal('fetch', fetchFalso)
    const arquivo = new File(['conteudo'], 'extrato.ofx')

    const resultado = await baixarRelatorio(arquivo, { ano: 2026, mes: 10 })

    expect(resultado.ok).toBe(true)
    if (resultado.ok) expect(resultado.pdf.size).toBe(5)
    const [url, opcoes] = fetchFalso.mock.calls[0]
    expect(url).toBe('http://api.test/demonstracao/relatorio?mes=2026-10')
    expect((opcoes.body as FormData).get('arquivo')).toBe(arquivo)
  })

  it('devolve a mensagem quando a api recusa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ title: 'Mês sem dados', detail: 'Sem transações.' }), { status: 404 })),
    )

    expect(await baixarRelatorio(new File([''], 'extrato.ofx'))).toEqual({ ok: false, mensagem: 'Sem transações.' })
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('falhou')))

    const resultado = await baixarRelatorio(new File([''], 'extrato.ofx'))

    expect(resultado).toEqual({ ok: false, mensagem: 'Não foi possível falar com o servidor. Tente de novo.' })
  })
})
