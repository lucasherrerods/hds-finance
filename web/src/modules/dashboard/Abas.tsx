import { motion } from 'motion/react'
import { useId, useRef, type KeyboardEvent } from 'react'

type Aba = { chave: string; rotulo: string }

type Props = {
  rotulo: string
  abas: Aba[]
  selecionada: string
  aoSelecionar: (chave: string) => void
  idDoPainel: string
}

/** Lista de abas acessível: setas e Home/End mudam de aba, e o indicador desliza até a aba ativa. */
export function Abas({ rotulo, abas, selecionada, aoSelecionar, idDoPainel }: Props) {
  const idDoIndicador = useId()
  const botoes = useRef<(HTMLButtonElement | null)[]>([])

  function aoTeclar(evento: KeyboardEvent, indice: number) {
    const destinos: Record<string, number> = {
      ArrowRight: (indice + 1) % abas.length,
      ArrowLeft: (indice - 1 + abas.length) % abas.length,
      Home: 0,
      End: abas.length - 1,
    }
    const destino = destinos[evento.key]
    if (destino === undefined) return
    evento.preventDefault()
    aoSelecionar(abas[destino].chave)
    botoes.current[destino]?.focus()
  }

  return (
    <div role="tablist" aria-label={rotulo} className="flex flex-wrap gap-2">
      {abas.map((aba, indice) => {
        const ativa = aba.chave === selecionada
        return (
          <button
            key={aba.chave}
            ref={(botao) => {
              botoes.current[indice] = botao
            }}
            type="button"
            role="tab"
            aria-selected={ativa}
            aria-controls={idDoPainel}
            tabIndex={ativa ? 0 : -1}
            onClick={() => aoSelecionar(aba.chave)}
            onKeyDown={(evento) => aoTeclar(evento, indice)}
            className={`relative rounded-full px-4 py-2 font-medium transition-colors ${
              ativa ? 'text-primaria' : 'text-texto-suave hover:text-texto'
            }`}
          >
            {ativa && (
              <motion.span
                layoutId={idDoIndicador}
                aria-hidden
                className="absolute inset-0 rounded-full bg-primaria-suave"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">{aba.rotulo}</span>
          </button>
        )
      })}
    </div>
  )
}
