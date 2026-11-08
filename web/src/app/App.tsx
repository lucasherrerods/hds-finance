import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { ResumoDoMes } from '../modules/dashboard'
import { AvisoDePrivacidade, EnvioDeExtrato, type ResumoDoExtrato } from '../modules/import'
import { Cabecalho, ComoUsar, ExemploDeResultado, Inicio, Privacidade, Rodape, Secao } from '../modules/landing'
import { Revelar } from '../shared'

export function App() {
  const [resumo, setResumo] = useState<ResumoDoExtrato | null>(null)

  return (
    <>
      <Cabecalho />
      <main>
        <Inicio />
        <ComoUsar />
        <ExemploDeResultado />

        <Secao
          id="testar"
          titulo="Teste com o seu extrato"
          descricao="Escolha o arquivo exportado pelo Inter. O resultado aparece logo abaixo."
        >
          <Revelar className="flex flex-col gap-4">
            <AvisoDePrivacidade />
            <EnvioDeExtrato aoResumir={setResumo} />
          </Revelar>

          <AnimatePresence mode="wait">
            {resumo && (
              <motion.div
                key={JSON.stringify(resumo)}
                className="flex flex-col gap-4"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <p className="text-texto-suave">
                  {resumo.transacoesNovas} transações lidas
                  {resumo.duplicadas > 0 && `, ${resumo.duplicadas} duplicadas ignoradas`}.
                </p>
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
              </motion.div>
            )}
          </AnimatePresence>
        </Secao>

        <Privacidade />
      </main>
      <Rodape />
    </>
  )
}
