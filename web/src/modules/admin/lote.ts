import { adicionarExtrato, adicionarFatura, type ResultadoDaFatura, type ResultadoDaImportacao } from './api'

type Incluido = { ok: true; transacoesNovas: number; duplicadas: number; fechamento?: string } | { ok: false; mensagem: string }

export type ArquivoIncluido = { arquivo: File; resultado: Incluido }

export type Lote = { incluidos: ArquivoIncluido[]; semSenha: File[] }

const ehFatura = (arquivo: File) => arquivo.name.toLowerCase().endsWith('.pdf')

/**
 * As faturas vão antes, para o fechamento já contar o cartão, e só o último extrato fecha o mês:
 * senão cada arquivo do lote mandaria o próprio e-mail.
 */
export async function incluirArquivos(arquivos: File[], senha: string): Promise<Lote> {
  const lote: Lote = { incluidos: [], semSenha: [] }

  for (const arquivo of arquivos.filter(ehFatura)) {
    const resultado: ResultadoDaFatura = await adicionarFatura(arquivo, senha)
    if (!resultado.ok && resultado.pedeSenha) lote.semSenha.push(arquivo)
    else lote.incluidos.push({ arquivo, resultado })
  }

  const extratos = arquivos.filter((a) => !ehFatura(a))
  for (const [i, arquivo] of extratos.entries()) {
    const ultimo = i === extratos.length - 1
    const resultado: ResultadoDaImportacao = await adicionarExtrato(arquivo, ultimo)
    // Só o último tem o que dizer sobre o fechamento.
    lote.incluidos.push({ arquivo, resultado: resultado.ok && !ultimo ? { ...resultado, fechamento: undefined } : resultado })
  }

  return lote
}
