import type { Painel, ResumoMensal } from '../import'

/**
 * Seis meses inventados para mostrar o resultado sem depender de nenhum extrato real.
 * Cada mês fecha (saldo inicial + resultado + investimentos e transferências = saldo final)
 * e começa com o saldo final do anterior. Só o último mês é exibido com categorias, então
 * só ele as tem; nos outros a lista fica vazia.
 */
export const mesesDeExemplo: ResumoMensal[] = [
  mes(5, 7900, 5120.4, 2779.6, -1500, 800, 2079.6),
  mes(6, 7900, 6210.15, 1689.85, -1000, 2079.6, 2769.45),
  mes(7, 8150, 5480.9, 2669.1, -2500, 2769.45, 2938.55),
  mes(8, 8150, 7020.3, 1129.7, 0, 2938.55, 4068.25),
  mes(9, 8420, 5895.1, 2524.9, -3000, 4068.25, 3593.15),
  {
    ...mes(10, 8420, 5317.8, 3102.2, -2000, 3593.15, 4695.35),
    gastosPorCategoria: [
      { categoria: 'Alimentação', valor: 1820.5 },
      { categoria: 'Moradia', valor: 1650 },
      { categoria: 'Transporte', valor: 712.3 },
      { categoria: 'Saúde', valor: 485 },
      { categoria: 'Sem categoria', valor: 440 },
      { categoria: 'Assinaturas', valor: 210 },
    ],
  },
]

// O acumulado de cada mês soma o que foi aplicado até ele, como a api faz.
mesesDeExemplo.reduce((acumulado, m) => (m.investimentos.aplicadoAcumulado = acumulado + m.investimentos.aplicado), 0)

export const mesDeExemplo = mesesDeExemplo[mesesDeExemplo.length - 1]

function mes(
  numero: number,
  entradas: number,
  saidas: number,
  resultado: number,
  investimentosETransferencias: number,
  saldoInicial: number,
  saldoFinal: number,
): ResumoMensal {
  return {
    ano: 2026,
    mes: numero,
    entradas,
    saidas,
    resultado,
    investimentosETransferencias,
    saldoInicial,
    saldoFinal,
    gastosPorCategoria: [],
    investimentos: { aplicado: -investimentosETransferencias, resgatado: 0, aplicadoAcumulado: 0 },
  }
}

// Gasto de cada dia de outubro e de setembro de 2026 (fictícios). Os totais batem com as saídas dos meses.
const gastosDeOutubro = [
  1650, 45.9, 120.4, 0, 210.3, 38.5, 64.2, 0, 97.8, 185, 42.6, 0, 76.9, 133.2, 210, 54.3, 0, 92.1, 168.4, 39.9, 71.5,
  0, 145.6, 88.2, 210, 47.3, 0, 128.7, 66.4, 95.1, 1235.5,
]
const gastosDeSetembro = [
  1650, 45.9, 120.4, 0, 2023.1, 38.5, 64.2, 0, 97.8, 185, 42.6, 0, 76.9, 133.2, 210, 54.3, 0, 92.1, 168.4, 39.9, 71.5,
  0, 145.6, 88.2, 210, 47.3, 0, 128.7, 66.4, 95.1,
]

const centavos = (valor: number) => Math.round(valor * 100) / 100
const acumulado = (gastos: number[], dia: number) => centavos(gastos.slice(0, dia).reduce((a, b) => a + b, 0))

/** Mesmo formato que a api devolveria para outubro, comparando com setembro. 1º de outubro de 2026 é quinta-feira. */
export const painelDeExemplo: Painel = {
  ano: 2026,
  mes: 10,
  gastoNoMes: 5317.8,
  gastoNoMesAnterior: 5895.1,
  variacaoPercentual: -9.8,
  mediaDiaria: 171.54,
  maiorGasto: { dia: 1, diaDaSemana: 4, semana: 0, valor: 1650 },
  ritmo: gastosDeOutubro.map((_, i) => ({
    dia: i + 1,
    acumuladoAtual: acumulado(gastosDeOutubro, i + 1),
    acumuladoAnterior: i < gastosDeSetembro.length ? acumulado(gastosDeSetembro, i + 1) : 5895.1,
  })),
  mapaDeCalor: gastosDeOutubro.map((valor, i) => ({
    dia: i + 1,
    diaDaSemana: (4 + i) % 7,
    semana: Math.floor((i + 4) / 7),
    valor,
  })),
  principaisCategorias: [
    { categoria: 'Alimentação', atual: 1820.5, anterior: 1490.2, variacaoPercentual: 22.2 },
    { categoria: 'Moradia', atual: 1650, anterior: 1650, variacaoPercentual: 0 },
    { categoria: 'Transporte', atual: 712.3, anterior: 980.4, variacaoPercentual: -27.3 },
    { categoria: 'Saúde', atual: 485, anterior: 1210, variacaoPercentual: -59.9 },
    { categoria: 'Sem categoria', atual: 440, anterior: 354.5, variacaoPercentual: 24.1 },
  ],
  transacoesRecentes: [
    { data: '2026-10-31', descricao: 'Pix enviado - Escola de Idiomas Fictícia', categoria: 'Sem categoria', valor: -980 },
    { data: '2026-10-31', descricao: 'Compra no débito - Mercado Exemplo', categoria: 'Alimentação', valor: -255.5 },
    { data: '2026-10-30', descricao: 'Compra no débito - Uber Viagem', categoria: 'Transporte', valor: -35.1 },
    { data: '2026-10-30', descricao: 'Pix enviado - iFood Restaurante Exemplo', categoria: 'Alimentação', valor: -60 },
    { data: '2026-10-29', descricao: 'Compra no débito - Drogaria Exemplo', categoria: 'Saúde', valor: -66.4 },
    { data: '2026-10-28', descricao: 'Compra no débito - Posto Exemplo', categoria: 'Transporte', valor: -128.7 },
    { data: '2026-10-26', descricao: 'Compra no débito - Padaria Exemplo', categoria: 'Alimentação', valor: -47.3 },
    { data: '2026-10-25', descricao: 'Pix recebido - Cliente Fictício', categoria: 'Entrada', valor: 1200 },
  ],
}

/** Lista do mês de exemplo, a mesma que aparece nas transações recentes do painel. */
