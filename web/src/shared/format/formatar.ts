const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor: number): string {
  return moeda.format(valor)
}

// Lê a data ISO pelas partes para não cair no dia anterior por causa do fuso.
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}

export function formatarMoedaComSinal(valor: number, tipo: 'entrada' | 'saida'): string {
  return `${tipo === 'entrada' ? '+' : '−'}${moeda.format(Math.abs(valor))}`
}

const mesPorExtenso = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export function formatarMes(ano: number, mes: number): string {
  return mesPorExtenso.format(new Date(Date.UTC(ano, mes - 1, 1)))
}
