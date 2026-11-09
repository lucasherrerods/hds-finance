import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { GraficosDoPeriodo, MesesPorAbas, PainelDoMes } from '../dashboard'
import { buscarHistorico, type ResultadoDoHistorico } from './api'

const SUAVE = [0.22, 1, 0.36, 1] as const

/** O painel do modo pessoal: os últimos 12 meses guardados na própria máquina. */
export function PaginaDoHistorico() {
  const [resultado, setResultado] = useState<ResultadoDoHistorico | null>(null)

  useEffect(() => {
    let ativo = true
    buscarHistorico().then((r) => ativo && setResultado(r))
    return () => {
      ativo = false
    }
  }, [])

  const meses = resultado?.ok ? resultado.historico.meses.length : 0

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pt-16 pb-24">
      <motion.header
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: SUAVE }}
      >
        <h1 className="text-5xl leading-[1.02] font-bold tracking-[-0.03em] sm:text-6xl">Seu histórico</h1>
        {resultado?.ok && meses > 0 && (
          <p className="text-lg text-texto-suave">
            {meses === 1 ? '1 mês guardado' : `${meses} meses guardados`} nesta máquina.
          </p>
        )}
      </motion.header>

      {resultado && !resultado.ok && (
        <p role="alert" className="text-saida">
          {resultado.mensagem}
        </p>
      )}

      {resultado?.ok && meses === 0 && (
        <p className="max-w-[60ch] text-lg text-texto-suave">
          Nada importado ainda. Solte um extrato na pasta de extratos com o Worker rodando, ou importe pela CLI.
        </p>
      )}

      {resultado?.ok && meses > 0 && (
        <div className="flex flex-col gap-6">
          {resultado.historico.painel && <PainelDoMes painel={resultado.historico.painel} />}
          <GraficosDoPeriodo meses={resultado.historico.meses} />
          <h2 className="pt-6 text-2xl leading-tight font-bold tracking-[-0.02em] sm:text-3xl">Mês a mês</h2>
          <MesesPorAbas meses={resultado.historico.meses} transacoes={resultado.historico.transacoes} />
        </div>
      )}
    </div>
  )
}
