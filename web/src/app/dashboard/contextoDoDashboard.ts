import { createContext, useContext } from 'react'
import type { EdicaoDeCategoria } from '../../modules/dashboard'
import type { Painel, ResumoMensal, TransacaoCategorizada } from '../../modules/import'

/** O que as seções mostram, venha do extrato recém-enviado (demonstração) ou do histórico local (modo pessoal). */
export type DadosDoDashboard = {
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  quantidade: number
}

export type ValorDoDashboard = {
  dados: DadosDoDashboard
  /** Só na demonstração: o arquivo é reenviado para gerar o PDF ou o e-mail. No modo pessoal, tudo sai do histórico. */
  arquivo: File | null
  /** Só no modo pessoal: trocar a categoria de uma transação e lembrar da escolha. */
  edicao?: EdicaoDeCategoria
}

export const ContextoDoDashboard = createContext<ValorDoDashboard | null>(null)

export function useDashboard() {
  const valor = useContext(ContextoDoDashboard)
  if (!valor) throw new Error('useDashboard precisa estar dentro do layout do dashboard.')
  return valor
}
