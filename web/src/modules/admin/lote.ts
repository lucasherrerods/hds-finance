import { adicionarExtrato, adicionarFatura, type ResultadoDaFatura, type ResultadoDaImportacao } from './api'

type Incluido = { ok: true; transacoesNovas: number; duplicadas: number; fechamento?: string } | { ok: false; mensagem: string }

export type ArquivoIncluido = { arquivo: File; resultado: Incluido }

export type Lote = { incluidos: ArquivoIncluido[]; semSenha: File[] }

// A fatura do Nubank em CSV não diz que é fatura, mas o cabeçalho é outro.
async function ehFatura(arquivo: File) {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith('.pdf')) return true
  return nome.endsWith('.csv') && /^\uFEFF?date,/i.test(await arquivo.slice(0, 64).text())
}

// O Nubank não fecha mês, então não pode ser o último do lote.
const ehDoNubank = (arquivo: File) => /^nu(bank)?[_-]/i.test(arquivo.name)

/**
 * As faturas vão antes, para o fechamento já contar o cartão, e só o último extrato fecha o mês:
 * senão cada arquivo do lote mandaria o próprio e-mail.
 */
export async function incluirArquivos(arquivos: File[], senha: string): Promise<Lote> {
  const lote: Lote = { incluidos: [], semSenha: [] }

  const faturas: File[] = []
  const extratos: File[] = []
  for (const arquivo of arquivos) ((await ehFatura(arquivo)) ? faturas : extratos).push(arquivo)
  extratos.sort((a, b) => Number(ehDoNubank(b)) - Number(ehDoNubank(a)))

  for (const arquivo of faturas) {
    const resultado: ResultadoDaFatura = await adicionarFatura(arquivo, senha)
    if (!resultado.ok && resultado.pedeSenha) lote.semSenha.push(arquivo)
    else lote.incluidos.push({ arquivo, resultado })
  }

  for (const [i, arquivo] of extratos.entries()) {
    const ultimo = i === extratos.length - 1
    const resultado: ResultadoDaImportacao = await adicionarExtrato(arquivo, ultimo)
    // Só o último tem o que dizer sobre o fechamento.
    lote.incluidos.push({ arquivo, resultado: resultado.ok && !ultimo ? { ...resultado, fechamento: undefined } : resultado })
  }

  return lote
}
