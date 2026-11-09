import { MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'

export type MesDoRelatorio = { ano: number; mes: number }

export type ResultadoDoRelatorio = { ok: true; pdf: Blob } | { ok: false; mensagem: string }

/** Reenvia o extrato, porque o servidor não guarda nada entre uma requisição e outra. */
export async function baixarRelatorio(arquivo: File, mes?: MesDoRelatorio): Promise<ResultadoDoRelatorio> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  const consulta = mes ? `?mes=${mes.ano}-${String(mes.mes).padStart(2, '0')}` : ''

  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/demonstracao/relatorio${consulta}`, {
      method: 'POST',
      body: corpo,
    })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }
  }

  if (resposta.ok) {
    return { ok: true, pdf: await resposta.blob() }
  }

  return { ok: false, mensagem: await mensagemDoProblema(resposta, 'Não foi possível gerar o PDF.') }
}
