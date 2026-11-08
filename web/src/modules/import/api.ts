export type ResumoMensal = {
  ano: number
  mes: number
  entradas: number
  saidas: number
  resultado: number
  investimentosETransferencias: number
  saldoInicial: number | null
  saldoFinal: number | null
}

export type ResumoDoExtrato = {
  transacoesNovas: number
  duplicadas: number
  meses: ResumoMensal[]
}

export type ResultadoDoEnvio = { ok: true; resumo: ResumoDoExtrato } | { ok: false; mensagem: string }

type Problema = { title?: string; detail?: string; linha?: number }

export async function enviarExtrato(arquivo: File): Promise<ResultadoDoEnvio> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)

  let resposta: Response
  try {
    resposta = await fetch(`${import.meta.env.VITE_URL_DA_API}/demonstracao/resumo`, { method: 'POST', body: corpo })
  } catch {
    return { ok: false, mensagem: 'Não foi possível falar com o servidor. Tente de novo.' }
  }

  if (resposta.ok) {
    return { ok: true, resumo: (await resposta.json()) as ResumoDoExtrato }
  }

  const problema = (await resposta.json().catch(() => ({}))) as Problema
  const mensagem = problema.detail ?? problema.title ?? 'Não foi possível ler o extrato.'
  return { ok: false, mensagem: problema.linha ? `${mensagem} (linha ${problema.linha})` : mensagem }
}
