import { lazy, Suspense } from 'react'
import type { ResumoMensal } from '../import'

// O Recharts é a maior dependência do front; só baixa quando há gráfico para mostrar.
const GraficosDoPeriodo = lazy(() => import('./GraficosDoPeriodo').then((m) => ({ default: m.GraficosDoPeriodo })))

type Props = { meses: ResumoMensal[] }

export function GraficosSobDemanda({ meses }: Props) {
  if (meses.length < 2) return null

  return (
    <Suspense fallback={<div aria-hidden className="h-[352px] rounded-2xl bg-superficie opacity-50" />}>
      <GraficosDoPeriodo meses={meses} />
    </Suspense>
  )
}
