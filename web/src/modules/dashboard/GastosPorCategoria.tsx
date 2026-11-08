import { motion } from 'motion/react'
import { useId } from 'react'
import { formatarMoeda } from '../../shared'
import type { GastoPorCategoria } from '../import'

const cores = ['bg-grafico-1', 'bg-grafico-2', 'bg-grafico-3', 'bg-grafico-4', 'bg-grafico-5']

type Props = { gastos: GastoPorCategoria[]; totalDeSaidas: number }

export function GastosPorCategoria({ gastos, totalDeSaidas }: Props) {
  const idDoTitulo = useId()
  if (gastos.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h3 id={idDoTitulo} className="font-semibold">
        Gastos por categoria
      </h3>
      <ul aria-labelledby={idDoTitulo} className="flex flex-col gap-3">
        {gastos.map((gasto, indice) => {
          const percentual = totalDeSaidas > 0 ? Math.round((gasto.valor / totalDeSaidas) * 100) : 0
          return (
            <li key={gasto.categoria} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-4">
                <span>{gasto.categoria}</span>
                <span className="tabular-nums">
                  <span className="font-semibold">{formatarMoeda(gasto.valor)}</span>
                  <span className="ml-2 text-texto-suave">{percentual}%</span>
                </span>
              </div>
              <div aria-hidden className="h-2 overflow-hidden rounded-full bg-fundo">
                <motion.div
                  className={`h-full rounded-full ${cores[indice % cores.length]}`}
                  initial={{ width: 0 }}
                  whileInView={{ width: `${percentual}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.8, delay: indice * 0.08, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
