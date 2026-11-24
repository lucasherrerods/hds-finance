import { afterEach, describe, expect, it, vi } from 'vitest'
import { chamarAdmin } from './admin'

describe('chamarAdmin', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('manda o cookie de sessão e o cabeçalho do admin', async () => {
    vi.stubEnv('VITE_URL_DA_API', 'http://api.test')
    const fetchFalso = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchFalso)

    await chamarAdmin('/historico', { method: 'DELETE', headers: { 'Content-Type': 'application/json' } })

    expect(fetchFalso).toHaveBeenCalledWith('http://api.test/admin/historico', {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Hds-Admin': '1' },
    })
  })

  it('sem servidor, devolve nulo em vez de lançar erro', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))

    expect(await chamarAdmin('/historico')).toBeNull()
  })
})
