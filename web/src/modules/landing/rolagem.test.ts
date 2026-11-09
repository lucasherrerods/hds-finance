import { describe, expect, it } from 'vitest'
import { passoDaRolagem } from './rolagem'

describe('passoDaRolagem', () => {
  it('começa no primeiro passo', () => {
    expect(passoDaRolagem(0, 3)).toBe(0)
  })

  it('divide a rolagem em partes iguais', () => {
    expect(passoDaRolagem(0.34, 3)).toBe(1)
    expect(passoDaRolagem(0.7, 3)).toBe(2)
  })

  it('não passa do último passo nem volta antes do primeiro', () => {
    expect(passoDaRolagem(1, 3)).toBe(2)
    expect(passoDaRolagem(1.4, 3)).toBe(2)
    expect(passoDaRolagem(-0.2, 3)).toBe(0)
  })
})
