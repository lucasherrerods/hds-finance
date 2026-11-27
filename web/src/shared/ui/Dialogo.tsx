import { X } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

type Props = {
  rotulo: string
  aoFechar: () => void
  cabecalho: ReactNode
  children: ReactNode
  className: string
  /** "lado" entra deslizando da direita, como painel; "centro" cresce de leve no meio da tela. */
  entrada?: 'centro' | 'lado'
}

const movimentos = {
  centro: { fechado: { opacity: 0, scale: 0.96, y: 12 }, aberto: { opacity: 1, scale: 1, y: 0 } },
  lado: { fechado: { opacity: 0, x: 48 }, aberto: { opacity: 1, x: 0 } },
}

/** Abre ao ser montado. O dialog nativo cuida do foco; Esc, o botão e o clique fora fecham com a animação de saída. */
export function Dialogo({ rotulo, aoFechar, cabecalho, children, className, entrada = 'centro' }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const [fechando, setFechando] = useState(false)
  const semMovimento = useReducedMotion()
  const { fechado, aberto } = movimentos[entrada]

  useEffect(() => {
    const atual = dialogo.current
    if (atual && !atual.open) atual.showModal()
  }, [])

  // Garante o fechamento mesmo se a animação de saída não terminar (aba em segundo plano, por exemplo).
  useEffect(() => {
    if (!fechando) return
    const tempo = setTimeout(() => dialogo.current?.close(), 300)
    return () => clearTimeout(tempo)
  }, [fechando])

  const fechar = () => (semMovimento ? dialogo.current?.close() : setFechando(true))

  return (
    <motion.dialog
      ref={dialogo}
      aria-label={rotulo}
      onClose={aoFechar}
      onCancel={(e) => {
        e.preventDefault()
        fechar()
      }}
      onClick={(e) => e.target === e.currentTarget && fechar()}
      initial={fechado}
      animate={fechando ? fechado : aberto}
      transition={{ type: 'spring', duration: fechando ? 0.2 : 0.35, bounce: fechando ? 0 : 0.15 }}
      onAnimationComplete={() => fechando && dialogo.current?.close()}
      className={`overflow-y-auto overscroll-contain border-borda bg-superficie text-texto backdrop:bg-fundo/50 ${className}`}
    >
      <div className="flex min-h-full flex-col gap-6 p-6">
        <header className="flex items-center gap-4">
          {cabecalho}
          <button
            type="button"
            aria-label="Fechar"
            onClick={fechar}
            className="ml-auto grid size-10 shrink-0 place-items-center rounded-full text-texto-suave transition-colors hover:bg-fundo hover:text-texto"
          >
            <X aria-hidden className="size-5" />
          </button>
        </header>
        {children}
      </div>
    </motion.dialog>
  )
}
