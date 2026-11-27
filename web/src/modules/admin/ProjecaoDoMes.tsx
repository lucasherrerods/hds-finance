import { Telescope } from 'lucide-react'
import { motion } from 'motion/react'
import { formatarMes, formatarMoeda } from '../../shared'
import type { Projecao } from './api'

/** Como o mês em andamento deve fechar no ritmo de hoje. O número vem pronto da api. */
export function ProjecaoDoMes({ projecao: p }: { projecao: Projecao }) {
  const sobra = p.sobraProjetada >= 0
  const mes = formatarMes(p.ano, p.mes).split(' ')[0]

  return (
    <section aria-label="Projeção do mês" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
      <h3 className="flex items-center gap-2 text-sm font-medium tracking-wider text-texto-suave uppercase">
        <Telescope aria-hidden className="size-4 opacity-70" />
        Projeção do mês
      </h3>
      <p className="text-lg">
        Nesse ritmo, você fecha {mes} {sobra ? 'sobrando' : 'faltando'}{' '}
        <span className={`text-2xl font-bold tracking-tight tabular-nums ${sobra ? 'text-entrada' : 'text-saida'}`}>
          {formatarMoeda(Math.abs(p.sobraProjetada))}
        </span>
      </p>
      <div className="flex flex-col gap-2">
        <span aria-hidden className="h-2 overflow-hidden rounded-full bg-fundo">
          <motion.span
            className="block h-full rounded-full bg-primaria"
            initial={{ width: 0 }}
            animate={{ width: `${(p.diasPassados / p.diasNoMes) * 100}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </span>
        <span className="text-sm text-texto-suave">
          Dia {p.diasPassados} de {p.diasNoMes}
        </span>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Numero rotulo="Gasto até agora" valor={p.gastoAteAgora} />
        <Numero rotulo="Gasto previsto no mês" valor={p.gastoProjetado} />
        <Numero rotulo="Recorrentes que faltam" valor={p.recorrentesPendentes} />
      </dl>
    </section>
  )
}

function Numero({ rotulo, valor }: { rotulo: string; valor: number }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-fundo p-4">
      <dt className="text-sm text-texto-suave">{rotulo}</dt>
      <dd className="font-semibold tabular-nums">{formatarMoeda(valor)}</dd>
    </div>
  )
}
