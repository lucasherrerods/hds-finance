import { afterEach, describe, expect, it, vi } from 'vitest'
import { aplicarTema, lerTemaSalvo, salvarTema, temaInicial } from './tema'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('tema', () => {
  it('usa o tema salvo quando existe', () => {
    salvarTema('escuro')
    expect(temaInicial(false)).toBe('escuro')
  })

  it('sem tema salvo, segue a preferência do sistema', () => {
    expect(temaInicial(true)).toBe('escuro')
    expect(temaInicial(false)).toBe('claro')
  })

  it('ignora valores estranhos no armazenamento', () => {
    localStorage.setItem('hds-finance:tema', 'roxo')
    expect(lerTemaSalvo()).toBeNull()
  })

  it('não quebra quando o armazenamento está bloqueado', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => salvarTema('escuro')).not.toThrow()
    expect(temaInicial(true)).toBe('escuro')
  })

  it('aplica o tema no elemento raiz', () => {
    aplicarTema('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
    aplicarTema('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
  })
})
