type Problema = { title?: string; detail?: string; linha?: number }

export const MENSAGEM_SEM_SERVIDOR = 'Não foi possível falar com o servidor. Tente de novo.'

/** Transforma o ProblemDetails devolvido pela api numa frase para a tela. */
export async function mensagemDoProblema(resposta: Response, padrao: string) {
  const problema = (await resposta.json().catch(() => ({}))) as Problema
  const mensagem = problema.detail ?? problema.title ?? padrao
  return problema.linha ? `${mensagem} (linha ${problema.linha})` : mensagem
}
