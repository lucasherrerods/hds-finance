import type { ResumoMensal, TransacaoCategorizada } from '../import'

export type MesesDoAno = { ano: number; meses: ResumoMensal[] }

/** Os meses chegam da api em ordem cronológica, e os grupos mantêm essa ordem. */
export function agruparMesesPorAno(meses: ResumoMensal[]): MesesDoAno[] {
  const grupos: MesesDoAno[] = []
  for (const mes of meses) {
    const ultimo = grupos.at(-1)
    if (ultimo?.ano === mes.ano) ultimo.meses.push(mes)
    else grupos.push({ ano: mes.ano, meses: [mes] })
  }
  return grupos
}

export function transacoesDoMes(transacoes: TransacaoCategorizada[], ano: number, mes: number): TransacaoCategorizada[] {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}-`
  return transacoes.filter((t) => t.data.startsWith(prefixo))
}

export function categoriasDe(transacoes: TransacaoCategorizada[]): string[] {
  return [...new Set(transacoes.map((t) => t.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

export type Ordem = 'recentes' | 'antigas' | 'maior' | 'menor'

export type Filtros = { busca: string; categoria: string; ordem: Ordem }

const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** A api já manda da mais nova para a mais antiga; "antigas" inverte por data mantendo a ordem do mesmo dia. */
export function filtrarTransacoes(transacoes: TransacaoCategorizada[], filtros: Filtros): TransacaoCategorizada[] {
  const busca = semAcento(filtros.busca.trim())
  const filtradas = transacoes.filter(
    (t) =>
      (!busca || semAcento(t.descricao).includes(busca)) && (!filtros.categoria || t.categoria === filtros.categoria),
  )

  const porData = (a: TransacaoCategorizada, b: TransacaoCategorizada) => a.data.localeCompare(b.data)
  switch (filtros.ordem) {
    case 'antigas':
      return filtradas.toSorted(porData)
    case 'maior':
      return filtradas.toSorted((a, b) => Math.abs(b.valor) - Math.abs(a.valor))
    case 'menor':
      return filtradas.toSorted((a, b) => Math.abs(a.valor) - Math.abs(b.valor))
    default:
      return filtradas.toSorted((a, b) => porData(b, a))
  }
}
