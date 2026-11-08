import type { ResumoMensal } from '../import'

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
  }
}
