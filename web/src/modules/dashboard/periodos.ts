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

export type Recorte = { chave: string; rotulo: string; meses: ResumoMensal[] }

const MESES_RECENTES = 12

/** Os períodos que dá para ver na evolução. Com um ano só, sobra o recorte padrão. */
export function recortesDaEvolucao(meses: ResumoMensal[]): Recorte[] {
  const recentes = { chave: 'recentes', rotulo: 'Últimos 12 meses', meses: meses.slice(-MESES_RECENTES) }
  const anos = agruparMesesPorAno(meses)
  if (anos.length < 2) return [recentes]
  // Até 12 meses, todo o período é igual aos últimos 12 e só repetiria a aba.
  const todos = meses.length > MESES_RECENTES ? [{ chave: 'todos', rotulo: 'Todo o período', meses }] : []
  return [recentes, ...todos, ...anos.toReversed().map((a) => ({ chave: String(a.ano), rotulo: String(a.ano), meses: a.meses }))]
}

export function transacoesDoMes(transacoes: TransacaoCategorizada[], ano: number, mes: number): TransacaoCategorizada[] {
  const prefixo = `${ano}-${String(mes).padStart(2, '0')}-`
  return transacoes.filter((t) => t.data.startsWith(prefixo))
}

export function categoriasDe(transacoes: TransacaoCategorizada[]): string[] {
  return [...new Set(transacoes.map((t) => t.categoria))].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

const bancoDa = (t: TransacaoCategorizada) => t.banco ?? 'Inter'

export function bancosDe(transacoes: TransacaoCategorizada[]): string[] {
  return [...new Set(transacoes.map(bancoDa))].sort()
}

export type Ordem = 'recentes' | 'antigas' | 'maior' | 'menor'

export type Filtros = { busca: string; categoria: string; ordem: Ordem; banco?: string; tipo?: TipoDeFiltro; comOcultas?: boolean; grupo?: string }

export type TipoDeFiltro = '' | 'entradas' | 'saidas' | 'cartao'

export const semAcento = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

function doTipo(t: TransacaoCategorizada, tipo: TipoDeFiltro = '') {
  switch (tipo) {
    case 'entradas':
      return t.valor > 0 && !t.noCartao
    case 'saidas':
      return t.valor < 0
    case 'cartao':
      return t.noCartao === true
    default:
      return true
  }
}

/** A api já manda da mais nova para a mais antiga; "antigas" inverte por data mantendo a ordem do mesmo dia. */
export function filtrarTransacoes(transacoes: TransacaoCategorizada[], filtros: Filtros): TransacaoCategorizada[] {
  const busca = semAcento(filtros.busca.trim())
  const filtradas = transacoes.filter(
    (t) =>
      (filtros.comOcultas !== false || !t.oculta) &&
      doTipo(t, filtros.tipo) &&
      (!busca || semAcento(t.descricao).includes(busca)) &&
      (!filtros.categoria || t.categoria === filtros.categoria) &&
      (!filtros.grupo || (t.grupo ?? t.categoria) === filtros.grupo) &&
      (!filtros.banco || bancoDa(t) === filtros.banco),
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
