import { motion } from 'motion/react'
import type { ReactNode } from 'react'

type Props = { children: ReactNode; atraso?: number; className?: string }

/** Sobe e aparece quando entra na tela, uma vez só. */
export function Revelar({ children, atraso = 0, className }: Props) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-64px' }}
      transition={{ duration: 0.5, delay: atraso, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}
