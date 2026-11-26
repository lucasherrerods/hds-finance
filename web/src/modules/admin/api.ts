import { chamarAdmin, MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'
import type { Fatura, Saldo } from '../dashboard'
import type { GrupoDeCategoria, Painel, ResumoMensal, TransacaoCategorizada } from '../import'

export type Historico = {
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  /** As categorias que dá para escolher ao corrigir uma transação. */
  categorias: string[]
  saldo: Saldo | null
  faturas: Fatura[]
  grupos?: GrupoDeCategoria[]
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
export async function adicionarExtrato(arquivo: File, fechar = true): Promise<ResultadoDaImportacao> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)

  const resposta = await chamarAdmin(`/extratos${fechar ? '' : '?fechar=false'}`, { method: 'POST', body: corpo })
  if (!resposta) return falhaSemServidor
  if (resposta.ok) return { ok: true, ...((await resposta.json()) as Omit<Extract<ResultadoDaImportacao, { ok: true }>, 'ok'>) }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível importar o extrato.') }
}

export type ResultadoDaFatura =
  | { ok: true; transacoesNovas: number; duplicadas: number }
  | { ok: false; mensagem: string; pedeSenha: boolean }

/** A senha vai no corpo e só abre o PDF: a api não guarda. */
export async function adicionarFatura(arquivo: File, senha: string): Promise<ResultadoDaFatura> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  if (senha) corpo.append('senha', senha)

  const resposta = await chamarAdmin('/faturas', { method: 'POST', body: corpo })
  if (!resposta) return { ...falhaSemServidor, pedeSenha: false }
  if (resposta.ok) return { ok: true, ...((await resposta.json()) as { transacoesNovas: number; duplicadas: number }) }
  return {
    ok: false,
    mensagem: await mensagemDoProblema(resposta, 'Não foi possível importar a fatura.'),
    pedeSenha: resposta.status === 423,
  }
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

/** Só para esta transação; nulo volta à categoria automática. */
export async function mudarCategoria(chave: string, categoria: string | null): Promise<{ ok: true } | Falha> {
  return ajustar('/transacoes/categoria', { chave, categoria }, 'Não foi possível trocar a categoria.')
}

export async function ocultarTransacao(chave: string, oculta: boolean): Promise<{ ok: true } | Falha> {
  return ajustar('/transacoes/oculta', { chave, oculta }, 'Não foi possível mudar a transação.')
}

async function ajustar(caminho: string, corpo: unknown, padrao: string): Promise<{ ok: true } | Falha> {
  const resposta = await chamarAdmin(caminho, { method: 'PUT', ...json(corpo) })
  if (!resposta) return falhaSemServidor
  return resposta.ok ? { ok: true } : { ok: false, mensagem: await mensagemDoProblema(resposta, padrao) }
}

/** Guarda a categoria escolhida para essa descrição; daqui pra frente ela vence as regras. */
export async function corrigirCategoria(descricao: string, categoria: string): Promise<{ ok: true } | Falha> {
  return ajustar('/categorias', { descricao, categoria }, 'Não foi possível trocar a categoria.')
}

export type Alerta = { tipo: string; assunto: string; valor: number; referencia: number | null; texto: string }

/** Comentário nulo quando a IA não está configurada ou não respondeu; os alertas vêm sempre. */
export type Analise = { ano: number; mes: number; comentario: string | null; alertas: Alerta[] }

export async function buscarAnalise(mes: MesDoFechamento): Promise<{ ok: true; analise: Analise | null } | Falha> {
  const resposta = await chamarAdmin(`/assistente/analise?mes=${mes.ano}-${String(mes.mes).padStart(2, '0')}`)
  if (!resposta) return falhaSemServidor
  if (resposta.status === 204) return { ok: true, analise: null }
  if (resposta.ok) {
    // Resposta fora do formato vale como sem análise: o painel nunca quebra por causa do assistente.
    const corpo = (await resposta.json().catch(() => null)) as Analise | null
    return { ok: true, analise: Array.isArray(corpo?.alertas) ? corpo : null }
  }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível analisar o mês.') }
}

export type SugestaoDeCategoria = { descricao: string; categoria: string; quantidade: number; valor: number }

export async function buscarSugestoes(): Promise<{ ok: true; sugestoes: SugestaoDeCategoria[] } | Falha> {
  const resposta = await chamarAdmin('/assistente/sugestoes')
  if (!resposta) return falhaSemServidor
  if (resposta.ok) {
    const corpo: unknown = await resposta.json().catch(() => null)
    return { ok: true, sugestoes: Array.isArray(corpo) ? (corpo as SugestaoDeCategoria[]) : [] }
  }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível buscar as sugestões.') }
}

/** A pergunta vai no corpo, nunca na URL. */
export async function perguntar(pergunta: string): Promise<{ ok: true; resposta: string } | Falha> {
  const resposta = await chamarAdmin('/assistente/pergunta', { method: 'POST', ...json({ pergunta }) })
  if (!resposta) return falhaSemServidor
  if (resposta.ok) return { ok: true, resposta: ((await resposta.json()) as { resposta: string }).resposta }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível responder.') }
}
