import { motion } from 'motion/react'
import { useNavigate } from 'react-router'
import { AvisoDePrivacidade, EnvioDeExtrato } from '../modules/import'
import { useResultado } from './contextoDoResultado'

const SUAVE = [0.22, 1, 0.36, 1] as const

export function PaginaDeTeste() {
  const { definir } = useResultado()
  const navegar = useNavigate()

  return (
    <div className="mx-auto grid max-w-6xl gap-12 px-6 pt-16 pb-24 lg:grid-cols-12 lg:items-end">
      <motion.header
        className="flex flex-col gap-6 lg:col-span-6"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: SUAVE }}
      >
        <h1 className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Solta o extrato aqui</h1>
        <p className="max-w-[48ch] text-lg leading-relaxed text-texto-suave">
          No app do Inter, vá em Extrato, escolha o período e exporte em OFX ou CSV. Depois é só largar o arquivo ao
          lado.
        </p>
        <AvisoDePrivacidade />
      </motion.header>

      <motion.div
        className="lg:col-span-6"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: SUAVE }}
      >
        <EnvioDeExtrato
          aoResumir={(resumo, arquivo) => {
            definir({ resumo, arquivo })
            navegar('/dashboard')
          }}
        />
      </motion.div>
    </div>
  )
}
