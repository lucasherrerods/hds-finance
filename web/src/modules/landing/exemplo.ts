import type { ResumoMensal } from '../import'

/** Mês inventado para mostrar o resultado sem depender de nenhum extrato real. Fecha: 1.250,40 + 3.102,20 − 2.000,00 = 2.352,60. */
export const mesDeExemplo: ResumoMensal = {
  ano: 2026,
  mes: 10,
  entradas: 8420,
  saidas: 5317.8,
  resultado: 3102.2,
  investimentosETransferencias: -2000,
  saldoInicial: 1250.4,
  saldoFinal: 2352.6,
}
