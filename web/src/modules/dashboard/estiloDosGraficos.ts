const compacto = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' })

export const valorCompacto = (valor: number) => compacto.format(valor)

export const eixoDosGraficos = {
  stroke: 'var(--color-texto-suave)',
  tick: { fill: 'var(--color-texto-suave)', fontSize: 14 },
  tickLine: false,
  axisLine: false,
}
