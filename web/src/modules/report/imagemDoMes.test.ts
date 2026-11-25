import { describe, expect, it } from 'vitest'
import { mesesDeExemplo } from '../landing'
import { conteudoDaImagem } from './imagemDoMes'

const mesDeExemplo = mesesDeExemplo.at(-1)!

describe('conteudoDaImagem', () => {
  it('traz o resultado, as somas e até cinco categorias', () => {
    const conteudo = conteudoDaImagem(mesDeExemplo, false)
    expect(conteudo.chamada).toBe('Sobrou no mês')
    expect(conteudo.resultado).toMatch(/3\.102,20/)
    expect(conteudo.categorias).toHaveLength(5)
    expect(conteudo.categorias[0]).toMatchObject({ nome: 'Alimentação', proporcao: 1 })
  })

  it('escondendo os valores, não sobra nenhum número em reais', () => {
    const texto = JSON.stringify(conteudoDaImagem(mesDeExemplo, true))
    expect(texto).not.toMatch(/\d,\d{2}/)
    expect(texto).toContain('%')
  })

  it('mês no vermelho diz que faltou', () => {
    expect(conteudoDaImagem({ ...mesDeExemplo, resultado: -10 }, false).chamada).toBe('Faltou no mês')
  })
})
