import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(cleanup)

// O jsdom não implementa estas APIs, que o motion usa para animar ao rolar e respeitar o movimento reduzido.
class IntersectionObserverFalso {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
vi.stubGlobal('IntersectionObserver', IntersectionObserverFalso)
vi.stubGlobal(
  'matchMedia',
  vi.fn((consulta: string) => ({
    matches: false,
    media: consulta,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  })),
)

// O Node 25 expõe um localStorage próprio, incompleto sem configuração, que esconde o do jsdom.
function criarArmazenamento(): Storage {
  const itens = new Map<string, string>()
  return {
    get length() {
      return itens.size
    },
    clear: () => itens.clear(),
    getItem: (chave) => itens.get(chave) ?? null,
    key: (indice) => [...itens.keys()][indice] ?? null,
    removeItem: (chave) => void itens.delete(chave),
    setItem: (chave, valor) => void itens.set(chave, String(valor)),
  }
}
vi.stubGlobal('localStorage', criarArmazenamento())
