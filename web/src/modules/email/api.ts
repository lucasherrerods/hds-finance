import { MENSAGEM_SEM_SERVIDOR, mensagemDoProblema } from '../../shared'

export type MesDoEnvio = { ano: number; mes: number }

type Falha = { ok: false; mensagem: string }

const rota = (caminho: string) => `${import.meta.env.VITE_URL_DA_API}/demonstracao${caminho}`

async function postarJson<T>(caminho: string, corpo: unknown, padrao: string): Promise<({ ok: true } & T) | Falha> {
  let resposta: Response
  try {
    resposta = await fetch(rota(caminho), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(corpo),
    })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR }
  }

  if (resposta.ok) return { ok: true, ...((await resposta.json()) as T) }
  return { ok: false, mensagem: await mensagemDoProblema(resposta, padrao) }
}

export const pedirCodigo = (email: string) =>
  postarJson<{ desafio: string }>('/email/codigo', { email }, 'Não foi possível mandar o código.')

export const confirmarCodigo = (email: string, codigo: string, desafio: string) =>
  postarJson<{ token: string }>('/email/confirmar', { email, codigo, desafio }, 'Não foi possível confirmar o código.')

export type ResultadoDoEnvioPorEmail = { ok: true } | (Falha & { confirmarDeNovo: boolean })

/** Reenvia o extrato, porque o servidor não guarda nada entre uma requisição e outra. */
export async function enviarRelatorioPorEmail(
  arquivo: File,
  mes: MesDoEnvio,
  email: string,
  token: string,
): Promise<ResultadoDoEnvioPorEmail> {
  const corpo = new FormData()
  corpo.append('arquivo', arquivo)
  corpo.append('email', email)
  corpo.append('token', token)

  let resposta: Response
  try {
    resposta = await fetch(rota(`/relatorio/email?mes=${mes.ano}-${String(mes.mes).padStart(2, '0')}`), {
      method: 'POST',
      body: corpo,
    })
  } catch {
    return { ok: false, mensagem: MENSAGEM_SEM_SERVIDOR, confirmarDeNovo: false }
  }

  if (resposta.ok) return { ok: true }
  return {
    ok: false,
    mensagem: await mensagemDoProblema(resposta, 'Não foi possível enviar o e-mail.'),
    confirmarDeNovo: resposta.status === 401,
  }
}
