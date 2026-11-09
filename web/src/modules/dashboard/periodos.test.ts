import { describe, expect, it } from 'vitest'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { agruparMesesPorAno, categoriasDe, filtrarTransacoes, transacoesDoMes } from './periodos'

const mes = (ano: number, numero: number) => ({ ano, mes: numero }) as ResumoMensal

const transacao = (data: string, descricao: string, categoria: string, valor: number): TransacaoCategorizada => ({
  data,
  descricao,
  categoria,
  valor,
})

const lista = [
  transacao('2026-11-08', 'Pix enviado - Fulano Ficticio', 'Moradia', -152.5),
  transacao('2026-11-06', 'Compra no débito - Lanchonete Exemplo', 'Alimentação', -49),
  transacao('2026-11-06', 'Pix recebido - Cliente', 'Entrada', 3000),
  transacao('2026-10-30', 'Uber Viagem', 'Transporte', -35.1),
]

describe('agruparMesesPorAno', () => {
  it('separa os meses por ano, em ordem cronológica', () => {
    const grupos = agruparMesesPorAno([mes(2025, 11), mes(2025, 12), mes(2026, 1), mes(2026, 2)])

    expect(grupos.map((g) => [g.ano, g.meses.map((m) => m.mes)])).toEqual([
      [2025, [11, 12]],
      [2026, [1, 2]],
    ])
  })
})

describe('transacoesDoMes', () => {
  it('fica só com as transações do mês escolhido', () => {
    expect(transacoesDoMes(lista, 2026, 11).map((t) => t.data)).toEqual(['2026-11-08', '2026-11-06', '2026-11-06'])
  })
})

describe('categoriasDe', () => {
  it('lista as categorias presentes, sem repetir e em ordem alfabética', () => {
    expect(categoriasDe(lista)).toEqual(['Alimentação', 'Entrada', 'Moradia', 'Transporte'])
  })
})

describe('filtrarTransacoes', () => {
  const padrao = { busca: '', categoria: '', ordem: 'recentes' as const }

  it('busca na descrição sem diferenciar maiúsculas e acentos', () => {
    expect(filtrarTransacoes(lista, { ...padrao, busca: 'DEBITO' }).map((t) => t.descricao)).toEqual([
      'Compra no débito - Lanchonete Exemplo',
    ])
  })

  it('filtra pela categoria escolhida', () => {
    expect(filtrarTransacoes(lista, { ...padrao, categoria: 'Transporte' })).toHaveLength(1)
  })

  it('ordena por data ou pelo tamanho do valor', () => {
    expect(filtrarTransacoes(lista, { ...padrao, ordem: 'antigas' })[0].data).toBe('2026-10-30')
    expect(filtrarTransacoes(lista, { ...padrao, ordem: 'maior' })[0].valor).toBe(3000)
    expect(filtrarTransacoes(lista, { ...padrao, ordem: 'menor' })[0].valor).toBe(-35.1)
  })

  it('a ordem por data mantém a ordem original dentro do mesmo dia', () => {
    const dia6 = filtrarTransacoes(lista, { ...padrao, ordem: 'antigas' }).filter((t) => t.data === '2026-11-06')
    expect(dia6.map((t) => t.valor)).toEqual([-49, 3000])
  })
})
