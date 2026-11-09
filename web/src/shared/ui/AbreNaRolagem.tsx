import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react'
import { useRef, type ReactNode } from 'react'
import { recorteDaAbertura } from './recorte'

type Props = { children: ReactNode; className?: string }

/**
 * Bloco que nasce recolhido e abre até o tamanho cheio conforme a página desce,
 * enquanto o conteúdo de dentro se afasta, como uma câmera recuando.
 */
export function AbreNaRolagem({ children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const parado = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'center center'] })
  const progresso = useSpring(scrollYProgress, { stiffness: 140, damping: 30 })
  const clipPath = useTransform(progresso, (p) => recorteDaAbertura(p))
  const escala = useTransform(progresso, [0, 1], [0.9, 1], { clamp: true })
  const zoom = useTransform(progresso, [0, 1], [1.2, 1], { clamp: true })

  return (
    <motion.div
      ref={ref}
      className={className}
      style={parado ? { clipPath: recorteDaAbertura(1) } : { clipPath, scale: escala }}
    >
      <motion.div className="h-full w-full" style={parado ? undefined : { scale: zoom }}>
        {children}
      </motion.div>
    </motion.div>
  )
}
