import { formatarMesCurto } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'

export type ResumoDosInvestimentos = {
  aplicado: number
  resgatado: number
  liquido: number
  /** Quanto do que entrou no período foi para investimento, em %. Null sem entradas ou sem aplicação líquida. */
  taxaDeInvestimento: number | null
  mesesComAplicacao: number
  maiorAplicacao: { ano: number; mes: number; valor: number } | null
}

const centavos = (valor: number) => Math.round(valor * 100) / 100

/** Tudo sai do que a api calculou por mês; aqui só se juntam os meses do período. */
export function resumoDosInvestimentos(meses: ResumoMensal[]): ResumoDosInvestimentos {
  const aplicado = centavos(meses.reduce((s, m) => s + m.investimentos.aplicado, 0))
  const resgatado = centavos(meses.reduce((s, m) => s + m.investimentos.resgatado, 0))
  const liquido = centavos(aplicado - resgatado)
  const entradas = meses.reduce((s, m) => s + m.entradas, 0)
  const comAplicacao = meses.filter((m) => m.investimentos.aplicado > 0)
  const maior = comAplicacao.toSorted((a, b) => b.investimentos.aplicado - a.investimentos.aplicado)[0]
  return {
    aplicado,
    resgatado,
    liquido,
    taxaDeInvestimento: entradas > 0 && liquido > 0 ? Math.round((liquido / entradas) * 1000) / 10 : null,
    mesesComAplicacao: comAplicacao.length,
    maiorAplicacao: maior ? { ano: maior.ano, mes: maior.mes, valor: maior.investimentos.aplicado } : null,
  }
}

export type PontoDosInvestimentos = { rotulo: string; aplicado: number; resgatado: number; acumulado: number }

export function dadosDosInvestimentos(meses: ResumoMensal[]): PontoDosInvestimentos[] {
  return meses.map((m) => ({
    rotulo: formatarMesCurto(m.ano, m.mes),
    aplicado: m.investimentos.aplicado,
    resgatado: m.investimentos.resgatado,
    acumulado: m.investimentos.aplicadoAcumulado,
  }))
}

const MOVIMENTACAO_INTERNA = 'Investimentos e transferências'

/** Aplicações, resgates e transferências entre contas próprias, da mais nova para a mais antiga. */
export function movimentacoesDeInvestimento(transacoes: TransacaoCategorizada[]): TransacaoCategorizada[] {
  return transacoes.filter((t) => t.categoria === MOVIMENTACAO_INTERNA && !t.noCartao).toSorted((a, b) => b.data.localeCompare(a.data))
}

/** Quanto aplicar por mês para a sequência contar. */
export const META_MENSAL = 1500

const liquidoDo = (m: ResumoMensal) => centavos(m.investimentos.aplicado - m.investimentos.resgatado)

export type Sequencia = { atual: number; recorde: number }

/**
 * Meses seguidos com aplicado líquido na meta. O último mês sem nenhuma aplicação fica de fora:
 * costuma ser o mês em andamento, e ainda dá tempo de aplicar.
 */
export function sequenciaDeAplicacao(meses: ResumoMensal[], meta = META_MENSAL): Sequencia {
  const ultimo = meses.at(-1)
  const contados = ultimo && ultimo.investimentos.aplicado === 0 ? meses.slice(0, -1) : meses
  let atual = 0
  let recorde = 0
  for (const m of contados) {
    atual = liquidoDo(m) >= meta ? atual + 1 : 0
    recorde = Math.max(recorde, atual)
  }
  return { atual, recorde }
}
