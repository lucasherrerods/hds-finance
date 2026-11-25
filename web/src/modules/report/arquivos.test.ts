import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { entregar } from './arquivos'

const arquivo = new File(['x'], 'resumo.png', { type: 'image/png' })
const recusa = (nome: string) => Object.assign(new Error(nome), { name: nome })

function aparelho(share?: () => Promise<void>) {
  vi.stubGlobal('navigator', share ? { canShare: () => true, share } : {})
}

describe('entregar', () => {
  let clicar: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    URL.revokeObjectURL = vi.fn()
    clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('abre o menu do aparelho quando ele existe', async () => {
    aparelho(() => Promise.resolve())
    expect(await entregar(arquivo)).toBe('compartilhado')
    expect(clicar).not.toHaveBeenCalled()
  })

  it('sem menu, ou se ele falha, baixa o arquivo', async () => {
    aparelho()
    expect(await entregar(arquivo)).toBe('baixado')
    aparelho(() => Promise.reject(recusa('DataError')))
    expect(await entregar(arquivo)).toBe('baixado')
    expect(clicar).toHaveBeenCalledTimes(2)
  })

  it('desistir não baixa nada, e o toque vencido pede outro', async () => {
    aparelho(() => Promise.reject(recusa('AbortError')))
    expect(await entregar(arquivo)).toBe('cancelado')
    aparelho(() => Promise.reject(recusa('NotAllowedError')))
    expect(await entregar(arquivo)).toBe('precisa-de-toque')
    expect(clicar).not.toHaveBeenCalled()
  })
})
