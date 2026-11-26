import { formularioDoExtrato, type Ajuste } from './ajustes'
import { MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'

export type ResumoMensal = {
  ano: number
  mes: number
  entradas: number
  saidas: number
  resultado: number
  investimentosETransferencias: number
  saldoInicial: number | null
  saldoFinal: number | null
  gastosPorCategoria: GastoPorCategoria[]
  investimentos: Investimentos
  /** O que entrou emprestado: não é receita. */
  emprestimos?: number
}

/** O extrato da conta não traz rendimentos: é só o que saiu para investir e o que voltou. */
export type Investimentos = { aplicado: number; resgatado: number; aplicadoAcumulado: number }

export type GastoPorCategoria = {
  categoria: string
  valor: number
  /** O conjunto da categoria: Supermercado fica em Alimentação. */
  grupo?: string
}

/** Os grupos e as categorias de cada um, na ordem de escolha. */
export type GrupoDeCategoria = { nome: string; categorias: string[] }

export type ResumoDoExtrato = {
  transacoesNovas: number
  duplicadas: number
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
  /** As que dá para escolher numa transação. */
  categorias: string[]
  grupos?: GrupoDeCategoria[]
}

export type ResultadoDoEnvio = { ok: true; resumo: ResumoDoExtrato } | { ok: false; mensagem: string }

/** Com ajustes, a api refaz todas as contas: o front nunca soma nada. */
export async function enviarExtrato(arquivo: File, ajustes: Ajuste[] = []): Promise<ResultadoDoEnvio> {
  const corpo = formularioDoExtrato(arquivo, ajustes)

  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/demonstracao/resumo`, { method: 'POST', body: corpo })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }
  }

  if (resposta.ok) {
    return { ok: true, resumo: (await resposta.json()) as ResumoDoExtrato }
  }

  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível ler o extrato.') }
}

export type PontoDoRitmo = { dia: number; acumuladoAtual: number | null; acumuladoAnterior: number | null }

/** diaDaSemana vai de 0 (domingo) a 6 (sábado); semana é a coluna do calendário do mês. */
export type GastoDoDia = { dia: number; diaDaSemana: number; semana: number; valor: number }

export type CategoriaComparada = {
  categoria: string
  atual: number
  anterior: number | null
  variacaoPercentual: number | null
  grupo?: string
}

export type TransacaoCategorizada = { data: string; descricao: string; categoria: string; valor: number; noCartao?: boolean; chave?: string; oculta?: boolean; banco?: 'Inter' | 'Nubank'; grupo?: string }

export type Painel = {
  ano: number
  mes: number
  gastoNoMes: number
  gastoNoMesAnterior: number | null
  variacaoPercentual: number | null
  mediaDiaria: number
  maiorGasto: GastoDoDia | null
  ritmo: PontoDoRitmo[]
  mapaDeCalor: GastoDoDia[]
  principaisCategorias: CategoriaComparada[]
  transacoesRecentes: TransacaoCategorizada[]
}
