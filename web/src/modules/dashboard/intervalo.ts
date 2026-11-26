import { formatarData } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'

/** Datas em ISO (aaaa-mm-dd), as duas pontas incluídas. */
export type Intervalo = { inicio: string; fim: string }

export type Atalho = { chave: string; rotulo: string; intervalo: Intervalo }

const iso = (ano: number, mes: number, dia: number) => {
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  return d.toISOString().slice(0, 10)
}

const partes = (data: string) => data.split('-').map(Number) as [number, number, number]

/** O último dia do mês: o dia zero do mês seguinte. */
const fimDoMes = (ano: number, mes: number) => iso(ano, mes + 1, 0)

export const intervaloDoMes = (ano: number, mes: number): Intervalo => ({ inicio: iso(ano, mes, 1), fim: fimDoMes(ano, mes) })

export function hojeEmIso(agora = new Date()): string {
  return iso(agora.getFullYear(), agora.getMonth() + 1, agora.getDate())
}

export function somarDias(data: string, dias: number): string {
  const [a, m, d] = partes(data)
  return iso(a, m, d + dias)
}

/** Os atalhos contam a partir de hoje. "Todo período" vai do primeiro ao último lançamento. */
export function atalhosDePeriodo(hoje: string, primeiro: string, ultimo: string): Atalho[] {
  const [a, m] = partes(hoje)
  return [
    { chave: 'tudo', rotulo: 'Todo período', intervalo: { inicio: primeiro, fim: ultimo } },
    { chave: '30', rotulo: 'Últimos 30 dias', intervalo: { inicio: somarDias(hoje, -29), fim: hoje } },
    { chave: '90', rotulo: 'Últimos 90 dias', intervalo: { inicio: somarDias(hoje, -89), fim: hoje } },
    { chave: 'mes', rotulo: 'Este mês', intervalo: intervaloDoMes(a, m) },
    { chave: 'passado', rotulo: 'Mês passado', intervalo: { inicio: iso(a, m - 1, 1), fim: fimDoMes(a, m - 1) } },
    { chave: '6meses', rotulo: 'Últimos 6 meses', intervalo: { inicio: iso(a, m - 5, 1), fim: fimDoMes(a, m) } },
    { chave: 'ano', rotulo: 'Este ano', intervalo: { inicio: iso(a, 1, 1), fim: iso(a, 12, 31) } },
    { chave: 'anoPassado', rotulo: 'Ano passado', intervalo: { inicio: iso(a - 1, 1, 1), fim: iso(a - 1, 12, 31) } },
  ]
}

export const dentroDo = (intervalo: Intervalo, data: string) => data >= intervalo.inicio && data <= intervalo.fim

export function transacoesNoIntervalo(transacoes: TransacaoCategorizada[], intervalo: Intervalo): TransacaoCategorizada[] {
  return transacoes.filter((t) => dentroDo(intervalo, t.data))
}

/**
 * Os meses do resumo que o intervalo cobre por inteiro. Se o intervalo corta algum mês com dados no meio,
 * devolve null: aí os números do mês não servem e quem chama soma as transações.
 */
export function mesesInteiros(meses: ResumoMensal[], intervalo: Intervalo): ResumoMensal[] | null {
  const tocados = meses.filter((m) => {
    const doMes = intervaloDoMes(m.ano, m.mes)
    return doMes.inicio <= intervalo.fim && doMes.fim >= intervalo.inicio
  })
  const inteiros = tocados.every((m) => {
    const doMes = intervaloDoMes(m.ano, m.mes)
    return doMes.inicio >= intervalo.inicio && doMes.fim <= intervalo.fim
  })
  return inteiros ? tocados : null
}

export type Totais = { entradas: number; saidas: number; resultado: number }

// O que mexe no saldo sem ser receita nem despesa.
const FORA_DAS_SOMAS = new Set(['Investimentos e transferências', 'Empréstimos'])

const centavos = (valor: number) => Math.round(valor * 100) / 100

/**
 * Os números do período. Com meses inteiros, vêm do fechamento que a api calculou.
 * Num recorte de dias, somam as transações com as mesmas regras: sem ocultas, sem investimentos
 * e transferências, sem empréstimo recebido.
 */
export function totaisDoIntervalo(meses: ResumoMensal[], transacoes: TransacaoCategorizada[], intervalo: Intervalo): Totais {
  const inteiros = mesesInteiros(meses, intervalo)
  if (inteiros) {
    const entradas = centavos(inteiros.reduce((s, m) => s + m.entradas, 0))
    const saidas = centavos(inteiros.reduce((s, m) => s + m.saidas, 0))
    return { entradas, saidas, resultado: centavos(inteiros.reduce((s, m) => s + m.resultado, 0)) }
  }
  const contam = transacoesNoIntervalo(transacoes, intervalo).filter(
    (t) => !t.oculta && !(t.categoria === 'Investimentos e transferências') && !(t.valor > 0 && FORA_DAS_SOMAS.has(t.categoria)),
  )
  const entradas = centavos(contam.filter((t) => t.valor > 0 && !t.noCartao).reduce((s, t) => s + t.valor, 0))
  const saidas = centavos(-contam.filter((t) => t.valor < 0 || t.noCartao).reduce((s, t) => s + t.valor, 0))
  return { entradas, saidas, resultado: centavos(entradas - saidas) }
}

/** O mês, quando o intervalo é exatamente um mês do calendário. */
export function mesDoIntervalo(intervalo: Intervalo): { ano: number; mes: number } | null {
  const [a, m, d] = partes(intervalo.inicio)
  return d === 1 && intervalo.fim === fimDoMes(a, m) ? { ano: a, mes: m } : null
}

/** As semanas do mês para o calendário, começando no domingo. Dias de fora do mês vêm como null. */
export function semanasDoMes(ano: number, mes: number): (string | null)[][] {
  const primeiro = new Date(Date.UTC(ano, mes - 1, 1)).getUTCDay()
  const dias = Number(fimDoMes(ano, mes).slice(8))
  const celulas: (string | null)[] = [...Array<null>(primeiro).fill(null), ...Array.from({ length: dias }, (_, i) => iso(ano, mes, i + 1))]
  while (celulas.length % 7) celulas.push(null)
  return Array.from({ length: celulas.length / 7 }, (_, i) => celulas.slice(i * 7, i * 7 + 7))
}

export const rotuloDoIntervalo = ({ inicio, fim }: Intervalo) => (inicio === fim ? formatarData(inicio) : `${formatarData(inicio)} – ${formatarData(fim)}`)
