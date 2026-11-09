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
}

/** O extrato da conta não traz rendimentos: é só o que saiu para investir e o que voltou. */
export type Investimentos = { aplicado: number; resgatado: number; aplicadoAcumulado: number }

export type GastoPorCategoria = {
  categoria: string
  valor: number
}

export type ResumoDoExtrato = {
  transacoesNovas: number
  duplicadas: number
  meses: ResumoMensal[]
  painel: Painel | null
  transacoes: TransacaoCategorizada[]
}

export type ResultadoDoEnvio = { ok: true; resumo: ResumoDoExtrato } | { ok: false; mensagem: string }

export async function enviarExtrato(arquivo: File): Promise<ResultadoDoEnvio> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)

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
}

export type TransacaoCategorizada = { data: string; descricao: string; categoria: string; valor: number }

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
