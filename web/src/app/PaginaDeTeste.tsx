import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { GraficosDoPeriodo, MesesPorAbas, PainelDoMes } from '../modules/dashboard'
import { AvisoDePrivacidade, EnvioDeExtrato, type ResumoDoExtrato } from '../modules/import'
import { EnviarPorEmail } from '../modules/email'
import { BaixarRelatorio } from '../modules/report'
import { emModoPessoal } from '../shared'

const SUAVE = [0.22, 1, 0.36, 1] as const

// Cada bloco do resultado entra um depois do outro, de baixo para cima.
const bloco = {
  fora: { opacity: 0, y: 32 },
  dentro: { opacity: 1, y: 0, transition: { duration: 0.5, ease: SUAVE } },
}

type Envio = { resumo: ResumoDoExtrato; arquivo: File }

export function PaginaDeTeste() {
  const [envio, setEnvio] = useState<Envio | null>(null)
  const resultado = useRef<HTMLElement>(null)
  const resumo = envio?.resumo

  useEffect(() => {
    if (envio) resultado.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
  }, [envio])

  const meses = resumo?.meses.length ?? 0
  const ultimoMes = resumo?.meses.at(-1)

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-16 pb-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-end">
        <motion.header
          className="flex flex-col gap-6 lg:col-span-6"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: SUAVE }}
        >
          <h1 className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Solta o extrato aqui</h1>
          <p className="max-w-[48ch] text-lg leading-relaxed text-texto-suave">
            No app do Inter, vá em Extrato, escolha o período e exporte em OFX ou CSV. Depois é só largar o arquivo
            ao lado.
          </p>
          <AvisoDePrivacidade />
        </motion.header>

        <motion.div
          className="lg:col-span-6"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: SUAVE }}
        >
          <EnvioDeExtrato aoResumir={(novo, arquivo) => setEnvio({ resumo: novo, arquivo })} />
        </motion.div>
      </div>

      <AnimatePresence mode="wait">
        {envio && resumo && (
          <motion.section
            ref={resultado}
            key={JSON.stringify(resumo)}
            aria-label="Resultado"
            className="flex scroll-mt-24 flex-col gap-6"
            initial="fora"
            animate="dentro"
            exit={{ opacity: 0, y: -12 }}
            transition={{ staggerChildren: 0.12 }}
          >
            <motion.div
              variants={bloco}
              className="flex flex-wrap items-end justify-between gap-6 border-t border-borda pt-12"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-4xl leading-[1.05] font-bold tracking-[-0.03em] sm:text-5xl">
                  {meses === 1 ? 'Aqui está o seu mês' : `Aqui estão os seus ${meses} meses`}
                </h2>
                <p className="text-texto-suave">
                  {resumo.transacoesNovas} transações lidas
                  {resumo.duplicadas > 0 && `, ${resumo.duplicadas} repetidas deixadas de fora`}.
                </p>
              </div>
              {ultimoMes && (
                <div className="flex flex-col items-start gap-4">
                  <BaixarRelatorio arquivo={envio.arquivo} mes={ultimoMes} />
                  {!emModoPessoal() && <EnviarPorEmail arquivo={envio.arquivo} mes={ultimoMes} />}
                </div>
              )}
            </motion.div>
            {resumo.painel && (
              <motion.div variants={bloco}>
                <PainelDoMes painel={resumo.painel} />
              </motion.div>
            )}
            <motion.div variants={bloco}>
              <GraficosDoPeriodo meses={resumo.meses} />
            </motion.div>
            <motion.div variants={bloco} className="flex flex-col gap-6">
              <h2 className="pt-6 text-2xl leading-tight font-bold tracking-[-0.02em] sm:text-3xl">Mês a mês</h2>
              <MesesPorAbas meses={resumo.meses} transacoes={resumo.transacoes} />
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
