export type Tema = 'claro' | 'escuro'

const CHAVE = 'hds-finance:tema'

export function lerTemaSalvo(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE)
    return valor === 'claro' || valor === 'escuro' ? valor : null
  } catch {
    return null
  }
}

export function salvarTema(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE, tema)
  } catch {
    // Sem armazenamento (aba anônima, bloqueio do navegador): o tema vale só nesta visita.
  }
}

export function temaInicial(sistemaPrefereEscuro: boolean): Tema {
  return lerTemaSalvo() ?? (sistemaPrefereEscuro ? 'escuro' : 'claro')
}

export function aplicarTema(tema: Tema): void {
  document.documentElement.dataset.tema = tema
}

export function temaAtual(): Tema {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
}
