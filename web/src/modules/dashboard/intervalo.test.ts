import { describe, expect, it } from 'vitest'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { atalhosDePeriodo, mesDoIntervalo, mesesInteiros, semanasDoMes, totaisDoIntervalo, transacoesNoIntervalo } from './intervalo'

function mes(ano: number, numero: number, entradas: number, saidas: number): ResumoMensal {
  return {
    ano,
    mes: numero,
    entradas,
    saidas,
    resultado: entradas - saidas,
    investimentosETransferencias: 0,
    saldoInicial: null,
    saldoFinal: null,
    gastosPorCategoria: [],
    investimentos: { aplicado: 0, resgatado: 0, aplicadoAcumulado: 0 },
  }
}

const meses = [mes(2026, 10, 1000, 400), mes(2026, 11, 2000, 500)]
const transacoes: TransacaoCategorizada[] = [
  { data: '2026-11-20', descricao: 'Mercado', categoria: 'Alimentação', valor: -100 },
  { data: '2026-11-18', descricao: 'Salário', categoria: 'Entrada', valor: 2000 },
  { data: '2026-11-17', descricao: 'Aplicação CDB', categoria: 'Investimentos e transferências', valor: -300 },
  { data: '2026-11-16', descricao: 'Empréstimo pessoal', categoria: 'Empréstimos', valor: 900 },
  { data: '2026-11-15', descricao: 'Presente', categoria: 'Compras', valor: -50, oculta: true },
  { data: '2026-11-14', descricao: 'Loja', categoria: 'Compras', valor: -80, noCartao: true },
  { data: '2026-10-30', descricao: 'Uber', categoria: 'Transporte', valor: -20 },
]

describe('atalhos de período', () => {
  const atalhos = Object.fromEntries(atalhosDePeriodo('2026-01-10', '2025-03-02', '2026-01-09').map((a) => [a.chave, a.intervalo]))

  it('contam a partir de hoje e atravessam a virada do ano', () => {
    expect(atalhos.tudo).toEqual({ inicio: '2025-03-02', fim: '2026-01-09' })
    expect(atalhos['30']).toEqual({ inicio: '2025-12-12', fim: '2026-01-10' })
    expect(atalhos.mes).toEqual({ inicio: '2026-01-01', fim: '2026-01-31' })
    expect(atalhos.passado).toEqual({ inicio: '2025-12-01', fim: '2025-12-31' })
    expect(atalhos['6meses']).toEqual({ inicio: '2025-08-01', fim: '2026-01-31' })
    expect(atalhos.anoPassado).toEqual({ inicio: '2025-01-01', fim: '2025-12-31' })
  })
})

describe('totais do intervalo', () => {
  it('com meses inteiros, soma o fechamento da api', () => {
    expect(totaisDoIntervalo(meses, transacoes, { inicio: '2026-10-01', fim: '2026-11-30' })).toEqual({ entradas: 3000, saidas: 900, resultado: 2100 })
  })

  it('num recorte de dias, soma as transações sem ocultas, investimentos e empréstimo recebido', () => {
    expect(totaisDoIntervalo(meses, transacoes, { inicio: '2026-11-10', fim: '2026-11-25' })).toEqual({ entradas: 2000, saidas: 180, resultado: 1820 })
  })

  it('sabe quando os meses são inteiros e quando o intervalo é um mês só', () => {
    expect(mesesInteiros(meses, { inicio: '2026-11-01', fim: '2026-11-30' })).toHaveLength(1)
    expect(mesesInteiros(meses, { inicio: '2026-11-02', fim: '2026-11-30' })).toBeNull()
    expect(mesDoIntervalo({ inicio: '2026-02-01', fim: '2026-02-28' })).toEqual({ ano: 2026, mes: 2 })
    expect(mesDoIntervalo({ inicio: '2026-02-01', fim: '2026-03-31' })).toBeNull()
  })

  it('filtra as transações pelas duas pontas', () => {
    expect(transacoesNoIntervalo(transacoes, { inicio: '2026-10-30', fim: '2026-11-14' }).map((t) => t.descricao)).toEqual(['Loja', 'Uber'])
  })
})

describe('calendário', () => {
  it('novembro de 2026 começa num domingo e tem cinco semanas', () => {
    const semanas = semanasDoMes(2026, 11)
    expect(semanas).toHaveLength(5)
    expect(semanas[0][0]).toBe('2026-11-01')
    expect(semanas[4].filter(Boolean)).toEqual(['2026-11-29', '2026-11-30'])
  })
})
