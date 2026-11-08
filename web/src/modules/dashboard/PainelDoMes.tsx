import { TrendingDown, TrendingUp } from 'lucide-react'
import { lazy, Suspense } from 'react'
import { formatarMoeda, formatarPercentual, Revelar } from '../../shared'
import type { Painel } from '../import'
import { Cartao } from './Cartao'
import { Destaque } from './Destaque'
import { MapaDeCalor } from './MapaDeCalor'
import { comparacaoDoRitmo } from './painel'
import { PrincipaisCategorias } from './PrincipaisCategorias'
import { TransacoesRecentes } from './TransacoesRecentes'

// O gráfico usa o Recharts, que só é baixado quando o painel aparece.
const RitmoDeGastos = lazy(() => import('./RitmoDeGastos').then((m) => ({ default: m.RitmoDeGastos })))

type Props = { painel: Painel }

export function PainelDoMes({ painel }: Props) {
  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <Revelar className="min-w-0 lg:col-span-7">
        <Destaque painel={painel} />
      </Revelar>
      <Revelar atraso={0.1} className="min-w-0 lg:col-span-5">
        <Ritmo painel={painel} />
      </Revelar>
      <Revelar className="min-w-0 lg:col-span-5">
        <MapaDeCalor painel={painel} />
      </Revelar>
      <Revelar atraso={0.1} className="min-w-0 lg:col-span-7">
        <PrincipaisCategorias categorias={painel.principaisCategorias} />
      </Revelar>
      {painel.transacoesRecentes.length > 0 && (
        <Revelar className="min-w-0 lg:col-span-12">
          <TransacoesRecentes transacoes={painel.transacoesRecentes} />
        </Revelar>
      )}
    </div>
  )
}

function Ritmo({ painel }: Props) {
  const comparacao = comparacaoDoRitmo(painel.ritmo)
  const acima = (comparacao?.diferenca ?? 0) > 0

  return (
    <Cartao titulo="Ritmo de gastos" className="h-full">
      {comparacao ? (
        <div className="flex flex-col gap-2">
          <span className="text-3xl font-bold tracking-tight tabular-nums">
            {formatarMoeda(Math.abs(comparacao.diferenca))}{' '}
            <span className="text-lg font-normal text-texto-suave">{acima ? 'acima' : 'abaixo'}</span>
          </span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-texto-suave">
            {comparacao.percentual !== null && (
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium ${acima ? 'bg-calor-1 text-saida' : 'bg-fundo text-entrada'}`}
              >
                {acima ? <TrendingUp aria-hidden className="size-4" /> : <TrendingDown aria-hidden className="size-4" />}
                {formatarPercentual(comparacao.percentual)}
              </span>
            )}
            do que até o dia {comparacao.dia} do mês anterior
          </span>
        </div>
      ) : (
        <p className="text-texto-suave">Envie também o mês anterior para comparar o ritmo.</p>
      )}
      <Suspense fallback={<div aria-hidden className="h-[240px]" />}>
        <RitmoDeGastos ritmo={painel.ritmo} />
      </Suspense>
    </Cartao>
  )
}
