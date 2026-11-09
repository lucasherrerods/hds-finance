import { afterEach, describe, expect, it, vi } from 'vitest'
import { esquecerEmail, lerEmailConfirmado, lerEmailDigitado, salvarConfirmacao, salvarEmailDigitado } from './armazenamento'

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe('armazenamento do e-mail', () => {
  it('guarda o e-mail digitado e a confirmação só no navegador', () => {
    salvarEmailDigitado('pessoa@exemplo.com')
    salvarConfirmacao('pessoa@exemplo.com', 'token-assinado')

    expect(lerEmailDigitado()).toBe('pessoa@exemplo.com')
    expect(lerEmailConfirmado()).toEqual({ email: 'pessoa@exemplo.com', token: 'token-assinado' })
  })

  it('esquecer apaga o e-mail e o token', () => {
    salvarConfirmacao('pessoa@exemplo.com', 'token-assinado')

    esquecerEmail()

    expect(lerEmailConfirmado()).toBeNull()
    expect(lerEmailDigitado()).toBe('')
  })

  it('sem acesso ao armazenamento, segue funcionando sem lembrar nada', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })

    expect(() => salvarConfirmacao('pessoa@exemplo.com', 't')).not.toThrow()
    expect(lerEmailConfirmado()).toBeNull()
    expect(lerEmailDigitado()).toBe('')
  })
})
