import { MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'
import type { Painel, ResumoMensal, TransacaoCategorizada } from '../import'

export type Historico = { meses: ResumoMensal[]; painel: Painel | null; transacoes: TransacaoCategorizada[] }

export type ResultadoDoHistorico = { ok: true; historico: Historico } | { ok: false; mensagem: string }

/** Só existe no modo pessoal: a api lê o histórico do SQLite local. */
export async function buscarHistorico(): Promise<ResultadoDoHistorico> {
  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/pessoal/historico`)
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }
  }

  if (resposta.ok) {
    return { ok: true, historico: (await resposta.json()) as Historico }
  }

  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível ler o histórico.') }
}
