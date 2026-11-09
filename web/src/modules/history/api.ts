import { MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'
import type { Painel, ResumoMensal, TransacaoCategorizada } from '../import'

export type Historico = {
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  /** As categorias que dá para escolher ao corrigir uma transação. */
  categorias: string[]
}

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

export type ResultadoDaImportacao =
  | { ok: true; transacoesNovas: number; duplicadas: number; fechamento: string }
  | { ok: false; mensagem: string }

/** Importa no SQLite local pelo mesmo caminho do Worker: guarda, anota a cobertura e fecha o mês completo. */
export async function adicionarExtrato(arquivo: File): Promise<ResultadoDaImportacao> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)

  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/pessoal/extratos`, { method: 'POST', body: corpo })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }
  }

  if (resposta.ok) return { ok: true, ...((await resposta.json()) as Omit<Extract<ResultadoDaImportacao, { ok: true }>, 'ok'>) }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível importar o extrato.') }
}

export type MesDoFechamento = { ano: number; mes: number }

export type ResultadoDoFechamento = { ok: true; mensagem: string } | { ok: false; mensagem: string; jaEnviado: boolean }

export async function enviarFechamento(mes: MesDoFechamento, forcar = false): Promise<ResultadoDoFechamento> {
  const consulta = `mes=${mes.ano}-${String(mes.mes).padStart(2, '0')}${forcar ? '&forcar=true' : ''}`

  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/pessoal/fechamento?${consulta}`, { method: 'POST' })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR, jaEnviado: false }
  }

  if (resposta.ok) return { ok: true, mensagem: ((await resposta.json()) as { mensagem: string }).mensagem }
  return {
    ok: false,
    mensagem: await mensagemDoProblema(resposta, 'Não foi possível enviar o fechamento.'),
    jaEnviado: resposta.status === 409,
  }
}

/** Guarda a categoria escolhida para essa descrição; daqui pra frente ela vence as regras. */
export async function corrigirCategoria(descricao: string, categoria: string): Promise<{ ok: true } | { ok: false; mensagem: string }> {
  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/pessoal/categorias`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ descricao, categoria }),
    })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }
  }

  if (resposta.ok) return { ok: true }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível trocar a categoria.') }
}
