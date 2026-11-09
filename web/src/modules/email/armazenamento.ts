const CHAVE_DO_EMAIL = 'hds-finance:email'
const CHAVE_DA_CONFIRMACAO = 'hds-finance:email-confirmado'

export type EmailConfirmado = { email: string; token: string }

// O endereço e o token ficam só neste navegador; o servidor não guarda nenhum dos dois.
function ler(chave: string): string | null {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave: string, valor: string | null): void {
  try {
    if (valor === null) localStorage.removeItem(chave)
    else localStorage.setItem(chave, valor)
  } catch {
    // Sem armazenamento (aba anônima, bloqueio do navegador): vale só nesta visita.
  }
}

export const lerEmailDigitado = () => ler(CHAVE_DO_EMAIL) ?? ''

export const salvarEmailDigitado = (email: string) => gravar(CHAVE_DO_EMAIL, email)

export function lerEmailConfirmado(): EmailConfirmado | null {
  const salvo = ler(CHAVE_DA_CONFIRMACAO)
  if (!salvo) return null
  try {
    const { email, token } = JSON.parse(salvo) as Partial<EmailConfirmado>
    return typeof email === 'string' && typeof token === 'string' ? { email, token } : null
  } catch {
    return null
  }
}

export function salvarConfirmacao(email: string, token: string): void {
  gravar(CHAVE_DO_EMAIL, email)
  gravar(CHAVE_DA_CONFIRMACAO, JSON.stringify({ email, token }))
}

export function esquecerEmail(): void {
  gravar(CHAVE_DO_EMAIL, null)
  gravar(CHAVE_DA_CONFIRMACAO, null)
}
