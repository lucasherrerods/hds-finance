/**
 * Toda chamada à área admin passa por aqui: o cookie de sessão (HttpOnly, invisível para o JavaScript)
 * vai junto, e o cabeçalho prova para a api que a chamada veio do próprio front.
 * Sem servidor, devolve nulo.
 */
export async function chamarAdmin(caminho: string, opcoes: RequestInit = {}): Promise<Response | null> {
  try {
    return await fetch(`${import.meta.env.VITE_URL_DA_API}/admin${caminho}`, {
      ...opcoes,
      credentials: 'include',
      headers: { ...(opcoes.headers as Record<string, string> | undefined), 'X-Hds-Admin': '1' },
    })
  } catch {
    return null
  }
}
