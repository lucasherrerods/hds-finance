import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { aplicarTema, salvarTema, temaAtual, type Tema } from '../tema/tema'

type Props = { className?: string; comRotulo?: boolean }

/** Alterna entre claro e escuro e lembra a escolha neste navegador. */
export function BotaoDeTema({ className = '', comRotulo = false }: Props) {
  const [tema, setTema] = useState<Tema>(temaAtual)
  const proximo: Tema = tema === 'escuro' ? 'claro' : 'escuro'
  const Icone = tema === 'escuro' ? Sun : Moon

  function alternar() {
    aplicarTema(proximo)
    salvarTema(proximo)
    setTema(proximo)
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={`Usar tema ${proximo}`}
      className={`flex items-center gap-3 rounded-lg p-2 text-texto-suave transition-colors hover:bg-superficie hover:text-texto ${className}`}
    >
      <Icone aria-hidden className="size-5" />
      {comRotulo && <span>Tema {proximo}</span>}
    </button>
  )
}
