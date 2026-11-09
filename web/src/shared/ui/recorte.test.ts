import { describe, expect, it } from 'vitest'
import { recorteDaAbertura } from './recorte'

describe('recorteDaAbertura', () => {
  it('começa recolhido de todos os lados', () => {
    expect(recorteDaAbertura(0)).toBe('inset(12% 12% 12% 12% round 24px)')
  })

  it('termina aberto, só com os cantos arredondados', () => {
    expect(recorteDaAbertura(1)).toBe('inset(0% 0% 0% 0% round 24px)')
  })

  it('não passa dos limites quando o progresso sai de 0 a 1', () => {
    expect(recorteDaAbertura(1.3)).toBe(recorteDaAbertura(1))
    expect(recorteDaAbertura(-0.5)).toBe(recorteDaAbertura(0))
  })
})
