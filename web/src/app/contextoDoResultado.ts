import { createContext, useContext } from 'react'
import type { Ajuste, ResumoDoExtrato } from '../modules/import'

export type Resultado = { resumo: ResumoDoExtrato; arquivos: File[]; ajustes: Ajuste[] }

export type ValorDoContexto = {
  resultado: Resultado | null
  definir: (resultado: Resultado) => void
  esquecer: () => void
}

export const ContextoDoResultado = createContext<ValorDoContexto | null>(null)

export function useResultado() {
  const valor = useContext(ContextoDoResultado)
  if (!valor) throw new Error('useResultado precisa estar dentro do ProvedorDoResultado.')
  return valor
}
