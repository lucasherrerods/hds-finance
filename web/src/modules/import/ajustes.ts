import type { TransacaoCategorizada } from './api'

/** O que a pessoa mudou numa transação. Vive só na memória da aba e vai junto quando o extrato é reenviado. */
export type Ajuste = { chave: string; categoria?: string; oculta?: boolean }

/** Soma a mudança às que já existem, uma entrada por transação. */
export function comAjuste(ajustes: Ajuste[], chaves: string[], mudanca: Omit<Ajuste, 'chave'>): Ajuste[] {
  const novos = new Map(ajustes.map((a) => [a.chave, a]))
  for (const chave of chaves) novos.set(chave, { ...novos.get(chave), ...mudanca, chave })
  return [...novos.values()]
}

/** As de mesma descrição e mesmo sentido: um Pix recebido e um enviado para a mesma pessoa não são iguais. */
export function iguaisA(transacao: TransacaoCategorizada, todas: TransacaoCategorizada[]): TransacaoCategorizada[] {
  return todas.filter((t) => t.descricao === transacao.descricao && t.valor > 0 === transacao.valor > 0)
}

export function formularioDoExtrato(arquivos: File[], ajustes: Ajuste[] = []): FormData {
  const corpo = new FormData()
  for (const arquivo of arquivos) corpo.append('arquivo', arquivo)
  if (ajustes.length > 0) corpo.append('ajustes', JSON.stringify(ajustes))
  return corpo
}
