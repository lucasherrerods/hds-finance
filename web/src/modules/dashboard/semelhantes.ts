import type { TransacaoCategorizada } from '../import'
import { semAcento } from './periodos'

const normalizar = (descricao: string) => semAcento(descricao).replace(/\s+/g, ' ').trim()

/** Mesma descrição, fora a própria transação. Usa o que já está na tela, sem chamar a api. */
export function semelhantes(transacao: TransacaoCategorizada, todas: TransacaoCategorizada[], limite = 20): TransacaoCategorizada[] {
  const descricao = normalizar(transacao.descricao)
  const mesma = (t: TransacaoCategorizada) => t === transacao || (t.chave !== undefined && t.chave === transacao.chave)
  return todas
    .filter((t) => !mesma(t) && normalizar(t.descricao) === descricao)
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, limite)
}
