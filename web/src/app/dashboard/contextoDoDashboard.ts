import { createContext, useContext } from 'react'
import type { EdicaoDoHistorico, Saldo } from '../../modules/dashboard'
import type { Painel, ResumoMensal, TransacaoCategorizada } from '../../modules/import'

/** O que as seções mostram, venha do extrato recém-enviado (demonstração) ou do histórico guardado (área admin). */
export type DadosDoDashboard = {
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  quantidade: number
  /** Só na área admin. */
  saldo?: Saldo | null
}

export type ValorDoDashboard = {
  dados: DadosDoDashboard
  /** Só na demonstração: o arquivo é reenviado para gerar o PDF. Na área admin, tudo sai do histórico. */
  arquivo: File | null
  /** Só na área admin: trocar categorias e apagar transações ou meses. */
  edicao?: EdicaoDoHistorico
}

export const ContextoDoDashboard = createContext<ValorDoDashboard | null>(null)

export function useDashboard() {
  const valor = useContext(ContextoDoDashboard)
  if (!valor) throw new Error('useDashboard precisa estar dentro do layout do dashboard.')
  return valor
}
