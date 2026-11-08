import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { GraficosDoPeriodo, ResumoDoMes } from '../modules/dashboard'
import { AvisoDePrivacidade, EnvioDeExtrato, type ResumoDoExtrato } from '../modules/import'

export function PaginaDeTeste() {
  const [resumo, setResumo] = useState<ResumoDoExtrato | null>(null)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-16 pb-24">
      <motion.header
        className="flex max-w-[60ch] flex-col gap-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <h1 className="text-4xl leading-[1.1] font-bold tracking-[-0.02em] sm:text-5xl">Teste com o seu extrato</h1>
        <p className="text-lg text-texto-suave">
          Escolha o arquivo .ofx ou .csv exportado pelo Inter. O resultado aparece logo abaixo.
        </p>
        <AvisoDePrivacidade />
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <EnvioDeExtrato aoResumir={setResumo} />
      </motion.div>

      <AnimatePresence mode="wait">
        {resumo && (
          <motion.section
            key={JSON.stringify(resumo)}
            aria-label="Resultado"
            className="flex flex-col gap-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-texto-suave">
              {resumo.transacoesNovas} transações lidas
              {resumo.duplicadas > 0 && `, ${resumo.duplicadas} duplicadas ignoradas`}.
            </p>
            <GraficosDoPeriodo meses={resumo.meses} />
            {resumo.meses.map((mes, indice) => (
              <motion.div
                key={`${mes.ano}-${mes.mes}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * indice }}
              >
                <ResumoDoMes mes={mes} />
              </motion.div>
            ))}
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
