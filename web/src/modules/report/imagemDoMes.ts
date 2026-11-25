import { formatarMes, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal } from '../import'

const ESCONDIDO = 'R$ •••'
const CATEGORIAS = 5

export type ConteudoDaImagem = {
  titulo: string
  chamada: string
  resultado: string
  linhas: { rotulo: string; valor: string; tom: 'entrada' | 'saida' }[]
  categorias: { nome: string; valor: string; proporcao: number }[]
}

/** Escondendo os valores, sobram as proporções: dá para mostrar o mês sem contar quanto a pessoa ganha. */
export function conteudoDaImagem(mes: ResumoMensal, esconder: boolean): ConteudoDaImagem {
  const maior = Math.max(1, ...mes.gastosPorCategoria.map((g) => g.valor))
  const total = mes.gastosPorCategoria.reduce((soma, g) => soma + g.valor, 0)
  const dinheiro = (texto: string) => (esconder ? ESCONDIDO : texto)
  return {
    titulo: formatarMes(mes.ano, mes.mes),
    chamada: mes.resultado < 0 ? 'Faltou no mês' : 'Sobrou no mês',
    resultado: dinheiro(formatarMoeda(Math.abs(mes.resultado))),
    linhas: [
      { rotulo: 'Entrou', valor: dinheiro(formatarMoedaComSinal(mes.entradas, 'entrada')), tom: 'entrada' },
      { rotulo: 'Saiu', valor: dinheiro(formatarMoedaComSinal(mes.saidas, 'saida')), tom: 'saida' },
    ],
    categorias: mes.gastosPorCategoria.slice(0, CATEGORIAS).map((g) => ({
      nome: g.categoria,
      valor: esconder ? `${Math.round((g.valor / total) * 100)}%` : formatarMoeda(g.valor),
      proporcao: g.valor / maior,
    })),
  }
}

const LARGURA = 1080
const ALTURA = 1350
const MARGEM = 96

/** Desenhada no navegador, com as cores do tema em uso: nada vai ao servidor. */
export async function desenharImagem(conteudo: ConteudoDaImagem): Promise<Blob | null> {
  await document.fonts?.ready
  const tela = document.createElement('canvas')
  tela.width = LARGURA
  tela.height = ALTURA
  const c = tela.getContext('2d')
  if (!c) return null

  const estilo = getComputedStyle(document.documentElement)
  const cor = (nome: string) => estilo.getPropertyValue(`--color-${nome}`).trim()
  const direita = LARGURA - MARGEM

  function escrever(texto: string, x: number, y: number, tamanho: number, tom: string, peso = 400, alinhar: CanvasTextAlign = 'left', largura?: number) {
    c!.font = `${peso} ${tamanho}px 'Inter Variable', system-ui, sans-serif`
    c!.fillStyle = cor(tom)
    c!.textAlign = alinhar
    c!.fillText(texto, x, y, largura)
  }

  function barra(x: number, y: number, largura: number, altura: number, tom: string) {
    c!.fillStyle = cor(tom)
    c!.beginPath()
    c!.roundRect(x, y, largura, altura, altura / 2)
    c!.fill()
  }

  c.fillStyle = cor('fundo')
  c.fillRect(0, 0, LARGURA, ALTURA)
  escrever('hds finance', MARGEM, 128, 36, 'primaria', 600)
  escrever(conteudo.titulo, direita, 128, 36, 'texto-suave', 400, 'right')
  escrever(conteudo.chamada, MARGEM, 264, 40, 'texto-suave')
  escrever(conteudo.resultado, MARGEM, 368, 104, 'texto', 700, 'left', direita - MARGEM)
  conteudo.linhas.forEach((l, i) => {
    const y = 472 + i * 64
    escrever(l.rotulo, MARGEM, y, 40, 'texto-suave')
    escrever(l.valor, direita, y, 40, l.tom, 600, 'right')
  })
  if (conteudo.categorias.length > 0) escrever('Onde foi parar', MARGEM, 664, 40, 'texto', 600)
  conteudo.categorias.forEach((g, i) => {
    const y = 752 + i * 112
    escrever(g.nome, MARGEM, y, 36, 'texto', 400, 'left', 560)
    escrever(g.valor, direita, y, 36, 'texto', 600, 'right')
    barra(MARGEM, y + 24, direita - MARGEM, 16, 'borda')
    barra(MARGEM, y + 24, Math.max(16, (direita - MARGEM) * g.proporcao), 16, 'primaria')
  })

  return new Promise((resolver) => tela.toBlob(resolver, 'image/png'))
}
