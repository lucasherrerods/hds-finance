const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarMoeda(valor: number): string {
  return moeda.format(valor)
}

// Lê a data ISO pelas partes para não cair no dia anterior por causa do fuso.
export function formatarData(dataIso: string): string {
  const [ano, mes, dia] = dataIso.split('-')
  return `${dia}/${mes}/${ano}`
}
