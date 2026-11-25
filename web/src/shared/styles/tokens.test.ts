/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// As regras do docs/design.md que dá para medir direto nos tokens.
const css = readFileSync('src/shared/styles/tokens.css', 'utf8')
const [base, escuroBruto] = css.split("data-tema='escuro'")
const ler = (trecho: string) => Object.fromEntries([...trecho.matchAll(/--color-([\w-]+): (#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]))
const claro = ler(base)
const temas = { claro, escuro: { ...claro, ...ler(escuroBruto) } }

function hsb(hex: string) {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const maior = Math.max(...canais)
  return { saturacao: maior === 0 ? 0 : ((maior - Math.min(...canais)) / maior) * 100, brilho: maior * 100 }
}

describe.each(Object.entries(temas))('tokens do tema %s', (nome, t) => {
  it('não usa preto nem branco puros', () => {
    for (const cor of Object.values(t)) expect(['#000000', '#ffffff']).not.toContain(cor)
  })

  it('neutros levemente tingidos', () => {
    // Perto do preto, um passo de cor já vale mais de 5% de saturação; daí a folga.
    for (const n of ['fundo', 'superficie', 'borda', 'texto', 'texto-suave']) expect(hsb(t[n]).saturacao, n).toBeLessThan(7)
  })

  it('a superfície é mais clara que o fundo, dentro do limite', () => {
    const diferenca = hsb(t.superficie).brilho - hsb(t.fundo).brilho
    expect(diferenca).toBeGreaterThan(0)
    expect(diferenca).toBeLessThanOrEqual(nome === 'claro' ? 7 : 12)
  })

  it('a borda contrasta com a superfície e com o fundo', () => {
    const [b, s, f] = ['borda', 'superficie', 'fundo'].map((c) => hsb(t[c]).brilho)
    if (nome === 'claro') expect(b).toBeLessThan(Math.min(s, f))
    else expect(b).toBeGreaterThan(Math.max(s, f))
  })

  it('cores dos gráficos têm brilhos distintos', () => {
    const brilhos = [1, 2, 3, 4, 5].map((i) => hsb(t[`grafico-${i}`]).brilho).sort((a, b) => a - b)
    brilhos.slice(1).forEach((b, i) => expect(b - brilhos[i]).toBeGreaterThan(5))
  })
})

it('não há sombras nos tokens', () => expect(css).not.toContain('--shadow'))
