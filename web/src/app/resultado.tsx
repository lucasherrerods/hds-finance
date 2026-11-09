import { useState, type ReactNode } from 'react'
import { ContextoDoResultado, type Resultado } from './contextoDoResultado'

/**
 * Guarda o último extrato enviado só na memória da aba, para o dashboard usar.
 * Nunca vai para o localStorage: recarregar a página ou fechar a aba apaga tudo.
 */
export function ProvedorDoResultado({ children }: { children: ReactNode }) {
  const [resultado, setResultado] = useState<Resultado | null>(null)
  return (
    <ContextoDoResultado.Provider value={{ resultado, definir: setResultado, esquecer: () => setResultado(null) }}>
      {children}
    </ContextoDoResultado.Provider>
  )
}
