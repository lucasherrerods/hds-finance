import { ArrowLeftRight, ChevronDown, PiggyBank, Sigma, Undo2, type LucideIcon } from 'lucide-react'
import { formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal } from '../import'
import { GastosPorCategoria } from './GastosPorCategoria'

type Props = { mes: ResumoMensal }

/** O que os indicadores da lista não mostram, recolhido para a lista vir primeiro. */
export function ResumoDoMes({ mes }: Props) {
  return (
    <details className="group rounded-2xl border border-borda bg-superficie">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl p-6 font-semibold [&::-webkit-details-marker]:hidden">
        Categorias e investimentos do mês
        <ChevronDown aria-hidden className="size-5 text-texto-suave transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-6 px-6 pb-6">
        <Valor
          rotulo="Investimentos e transferências"
          icone={ArrowLeftRight}
          texto={formatarMoedaComSinal(mes.investimentosETransferencias, mes.investimentosETransferencias < 0 ? 'saida' : 'entrada')}
          cor="text-texto"
        />
      <Investimentos mes={mes} />
      <GastosPorCategoria gastos={mes.gastosPorCategoria} totalDeSaidas={mes.saidas} />
      </div>
    </details>
  )
}

function Investimentos({ mes }: Props) {
  const { aplicado, resgatado, aplicadoAcumulado } = mes.investimentos
  if (aplicado === 0 && resgatado === 0 && aplicadoAcumulado === 0) return null

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium tracking-wider text-texto-suave uppercase">Investimentos</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Valor rotulo="Aplicado no mês" icone={PiggyBank} texto={formatarMoeda(aplicado)} cor="text-texto" />
        <Valor rotulo="Resgatado no mês" icone={Undo2} texto={formatarMoeda(resgatado)} cor="text-texto" />
        <Valor rotulo="Aplicado no período" icone={Sigma} texto={formatarMoeda(aplicadoAcumulado)} cor="text-texto" />
      </div>
      <p className="text-sm text-texto-suave">Valores sem rendimentos: o extrato da conta só mostra o que saiu e o que voltou.</p>
    </div>
  )
}

type ValorProps = { rotulo: string; icone: LucideIcon; texto: string; cor: string }

function Valor({ rotulo, icone: Icone, texto, cor }: ValorProps) {
  return (
    <div role="group" aria-label={rotulo} className="flex flex-col gap-1">
      <span className="flex items-center gap-2 text-texto-suave">
        <Icone aria-hidden className="size-4 opacity-70" />
        {rotulo}
      </span>
      <span className={`text-xl font-semibold tabular-nums ${cor}`}>{texto}</span>
    </div>
  )
}
