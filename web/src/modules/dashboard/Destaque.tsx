import { Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatarMes, formatarMoeda, formatarPercentual } from '../../shared'
import type { Painel } from '../import'
import { IconeDaCategoria } from './IconeDaCategoria'
import { textoDoDestaque } from './painel'

type Props = { painel: Painel }

export function Destaque({ painel }: Props) {
  const { titulo, frase } = textoDoDestaque(painel)
  const nomeDoMes = formatarMes(painel.ano, painel.mes).split(' ')[0]
  const maior = painel.principaisCategorias[0]
  const variacao = painel.variacaoPercentual

  return (
    <section
      aria-label="Destaque do mês"
      className="relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-2xl bg-superficie p-6 shadow-elevacao sm:p-8"
    >
      <Sparkles aria-hidden className="pointer-events-none absolute -top-8 -right-8 size-48 text-primaria opacity-5" />
      <div className="relative flex flex-col gap-3">
        <h3 className="text-2xl leading-tight font-semibold tracking-tight text-primaria sm:text-3xl">{titulo}</h3>
        <p className="max-w-[60ch] text-lg text-texto-suave">{frase}</p>
      </div>

      <div className="relative grid gap-4 sm:grid-cols-3">
        <Indicador rotulo={`Gasto em ${nomeDoMes}`}>{formatarMoeda(painel.gastoNoMes)}</Indicador>
        <Indicador rotulo="Vs. mês anterior">
          {variacao === null ? (
            <span className="text-texto-suave">Sem comparação</span>
          ) : (
            <span className={`flex items-center gap-2 ${variacao > 0 ? 'text-saida' : 'text-entrada'}`}>
              {variacao > 0 ? <TrendingUp aria-hidden className="size-5" /> : <TrendingDown aria-hidden className="size-5" />}
              {formatarPercentual(variacao)}
            </span>
          )}
        </Indicador>
        <Indicador rotulo="Maior categoria">
          {maior ? (
            <span className="flex min-w-0 items-center gap-2">
              <IconeDaCategoria categoria={maior.categoria} className="size-5 shrink-0 opacity-70" />
              <span className="truncate">{maior.categoria}</span>
            </span>
          ) : (
            <span className="text-texto-suave">Sem gastos</span>
          )}
        </Indicador>
      </div>
    </section>
  )
}

function Indicador({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={rotulo} className="flex min-w-0 flex-col gap-2 rounded-xl bg-fundo p-4">
      <span className="text-sm tracking-wider text-texto-suave uppercase">{rotulo}</span>
      <span className="text-xl font-semibold tabular-nums">{children}</span>
    </div>
  )
}
