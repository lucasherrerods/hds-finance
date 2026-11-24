import { chamarAdmin, MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'
import type { Painel, ResumoMensal, TransacaoCategorizada } from '../import'

export type Historico = {
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  /** As categorias que dá para escolher ao corrigir uma transação. */
  categorias: string[]
}

type Falha = { ok: false; mensagem: string }

const falhaSemServidor: Falha = { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }

const json = (corpo: unknown): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
})

/** Manda o código só se o e-mail for o do admin, mas a resposta é sempre a mesma. */
export async function pedirCodigo(email: string): Promise<{ ok: true } | Falha> {
  const resposta = await chamarAdmin('/acesso/codigo', { method: 'POST', ...json({ email }) })
  if (!resposta) return falhaSemServidor
  return resposta.ok ? { ok: true } : { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível mandar o código.') }
}

/** A api responde com o cookie de sessão; o front nunca vê o token. */
export async function confirmarCodigo(codigo: string): Promise<{ ok: true } | Falha> {
  const resposta = await chamarAdmin('/acesso/confirmar', { method: 'POST', ...json({ codigo }) })
  if (!resposta) return falhaSemServidor
  return resposta.ok ? { ok: true } : { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível confirmar o código.') }
}

export async function sessaoAberta(): Promise<boolean> {
  return (await chamarAdmin('/acesso/sessao'))?.ok ?? false
}

export async function sair(): Promise<void> {
  await chamarAdmin('/acesso/sair', { method: 'POST' })
}

export type ResultadoDoHistorico = { ok: true; historico: Historico } | Falha

export async function buscarHistorico(): Promise<ResultadoDoHistorico> {
  const resposta = await chamarAdmin('/historico')
  if (!resposta) return falhaSemServidor
  if (resposta.ok) return { ok: true, historico: (await resposta.json()) as Historico }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível ler o histórico.') }
}

export type ResultadoDaImportacao = { ok: true; transacoesNovas: number; duplicadas: number; fechamento: string } | Falha

/** Guarda as transações novas, anota até onde o extrato vai e fecha o mês se ele ficou completo. */
export async function adicionarExtrato(arquivo: File): Promise<ResultadoDaImportacao> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)

  const resposta = await chamarAdmin('/extratos', { method: 'POST', body: corpo })
  if (!resposta) return falhaSemServidor
  if (resposta.ok) return { ok: true, ...((await resposta.json()) as Omit<Extract<ResultadoDaImportacao, { ok: true }>, 'ok'>) }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível importar o extrato.') }
}

export type ResultadoDaRemocao = { ok: true; apagadas: number } | Falha

type TransacaoParaApagar = Pick<TransacaoCategorizada, 'data' | 'valor' | 'descricao'>

export async function apagarTransacao({ data, valor, descricao }: TransacaoParaApagar): Promise<ResultadoDaRemocao> {
  // No corpo, nunca na URL: ela vai parar nos logs de acesso.
  return remover('/transacoes/apagar', { method: 'POST', ...json({ data, valor, descricao }) }, 'Não foi possível apagar a transação.')
}

export async function apagarMes({ ano, mes }: MesDoFechamento): Promise<ResultadoDaRemocao> {
  return remover(`/meses/${ano}-${String(mes).padStart(2, '0')}`, { method: 'DELETE' }, 'Não foi possível apagar o mês.')
}

async function remover(caminho: string, opcoes: RequestInit, padrao: string): Promise<ResultadoDaRemocao> {
  const resposta = await chamarAdmin(caminho, opcoes)
  if (!resposta) return falhaSemServidor
  if (resposta.ok) return { ok: true, apagadas: ((await resposta.json()) as { apagadas: number }).apagadas }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, padrao) }
}

export type MesDoFechamento = { ano: number; mes: number }

export type ResultadoDoFechamento = { ok: true; mensagem: string } | { ok: false; mensagem: string; jaEnviado: boolean }

export async function enviarFechamento(mes: MesDoFechamento, forcar = false): Promise<ResultadoDoFechamento> {
  const consulta = `mes=${mes.ano}-${String(mes.mes).padStart(2, '0')}${forcar ? '&forcar=true' : ''}`

  const resposta = await chamarAdmin(`/fechamento?${consulta}`, { method: 'POST' })
  if (!resposta) return { ...falhaSemServidor, jaEnviado: false }
  if (resposta.ok) return { ok: true, mensagem: ((await resposta.json()) as { mensagem: string }).mensagem }
  return {
    ok: false,
    mensagem: await mensagemDoProblema(resposta, 'Não foi possível enviar o fechamento.'),
    jaEnviado: resposta.status === 409,
  }
}

/** Guarda a categoria escolhida para essa descrição; daqui pra frente ela vence as regras. */
export async function corrigirCategoria(descricao: string, categoria: string): Promise<{ ok: true } | Falha> {
  const resposta = await chamarAdmin('/categorias', { method: 'PUT', ...json({ descricao, categoria }) })
  if (!resposta) return falhaSemServidor
  if (resposta.ok) return { ok: true }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível trocar a categoria.') }
}
