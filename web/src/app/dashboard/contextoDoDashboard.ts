import { createContext, useContext } from 'react'
import type { EdicaoDoHistorico, Fatura, Saldo } from '../../modules/dashboard'
import type { Ajuste, Painel, ResumoMensal, TransacaoCategorizada } from '../../modules/import'

/** O que as seções mostram, venha do extrato recém-enviado (demonstração) ou do histórico guardado (área admin). */
export type DadosDoDashboard = {
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  quantidade: number
  /** Só na área admin. */
  saldo?: Saldo | null
  faturas?: Fatura[]
}

export type ValorDoDashboard = {
  dados: DadosDoDashboard
  /** Só na demonstração: os arquivos são reenviados para gerar o PDF. Na área admin, tudo sai do histórico. */
  arquivos: File[] | null
  /** Só na demonstração: o que a pessoa mudou, para o PDF sair igual à tela. */
  ajustes?: Ajuste[]
  /** Trocar categorias e ocultar; apagar, só na área admin. */
  edicao?: EdicaoDoHistorico
  /** Só na área admin: avisa e busca o histórico de novo depois de uma mudança feita fora da lista de transações. */
  aoHistoricoMudar?: (mensagem: string) => void
}

export const ContextoDoDashboard = createContext<ValorDoDashboard | null>(null)

export function useDashboard() {
  const valor = useContext(ContextoDoDashboard)
  if (!valor) throw new Error('useDashboard precisa estar dentro do layout do dashboard.')
  return valor
}
