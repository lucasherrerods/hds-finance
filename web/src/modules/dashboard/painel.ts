import { formatarDiaCurto } from '../../shared'
import type { Painel, PontoDoRitmo, TransacaoDoPainel } from '../import'

const ALTA_RELEVANTE = 15

export type TextoDoDestaque = { titulo: string; frase: string }

/** Monta a frase a partir das variações que a api já calculou. */
export function textoDoDestaque(painel: Painel): TextoDoDestaque {
  const altas = painel.principaisCategorias
    .filter((c) => (c.variacaoPercentual ?? 0) >= ALTA_RELEVANTE)
    .sort((a, b) => b.variacaoPercentual! - a.variacaoPercentual!)
    .slice(0, 2)

  if (altas.length > 0) {
    const [primeira, segunda] = altas.map((c) => ({ nome: c.categoria, pct: Math.round(c.variacaoPercentual!) }))
    const frase = segunda
      ? `${primeira.nome} subiu ${primeira.pct}% e ${segunda.nome} ${segunda.pct}% em relação ao mês anterior. Vale revisar esses gastos.`
      : `${primeira.nome} subiu ${primeira.pct}% em relação ao mês anterior. Vale revisar esse gasto.`
    return { titulo: 'Seu dinheiro pode trabalhar melhor por você.', frase }
  }

  if (painel.variacaoPercentual === null) {
    return {
      titulo: 'Seu primeiro fechamento está pronto.',
      frase: 'Envie também o mês anterior para comparar os gastos e ver o que mudou.',
    }
  }

  const pct = Math.round(Math.abs(painel.variacaoPercentual))
  return painel.variacaoPercentual < 0
    ? { titulo: 'Bom mês para o seu bolso.', frase: `Você gastou ${pct}% a menos que no mês anterior.` }
    : {
        titulo: 'Gastos sob controle.',
        frase: `Você gastou ${pct}% a mais que no mês anterior, sem nenhuma categoria disparando.`,
      }
}

/** 0 é dia sem gasto; de 1 a 4, a fração do maior dia do mês. */
export function nivelDeCalor(valor: number, maximo: number): 0 | 1 | 2 | 3 | 4 {
  if (valor <= 0 || maximo <= 0) return 0
  const fracao = valor / maximo
  if (fracao <= 0.25) return 1
  if (fracao <= 0.5) return 2
  if (fracao <= 0.75) return 3
  return 4
}

export type GrupoDeTransacoes = { data: string; rotulo: string; transacoes: TransacaoDoPainel[] }

export function agruparPorDia(transacoes: TransacaoDoPainel[]): GrupoDeTransacoes[] {
  const grupos: GrupoDeTransacoes[] = []
  for (const transacao of transacoes) {
    const ultimo = grupos[grupos.length - 1]
    if (ultimo?.data === transacao.data) ultimo.transacoes.push(transacao)
    else grupos.push({ data: transacao.data, rotulo: formatarDiaCurto(transacao.data), transacoes: [transacao] })
  }
  return grupos
}

export type ComparacaoDoRitmo = { dia: number; diferenca: number; percentual: number | null }

/** Diferença entre o acumulado no último dia com movimento e o mesmo dia do mês anterior. */
export function comparacaoDoRitmo(ritmo: PontoDoRitmo[]): ComparacaoDoRitmo | null {
  const ultimo = ritmo.filter((p) => p.acumuladoAtual !== null).at(-1)
  if (!ultimo || ultimo.acumuladoAnterior === null) return null
  const diferenca = Math.round((ultimo.acumuladoAtual! - ultimo.acumuladoAnterior) * 100) / 100
  const percentual = ultimo.acumuladoAnterior > 0 ? Math.round((diferenca / ultimo.acumuladoAnterior) * 1000) / 10 : null
  return { dia: ultimo.dia, diferenca, percentual }
}
