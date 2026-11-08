import { ArrowDownLeft, ArrowUpRight, Equal, type LucideIcon } from 'lucide-react'
import { formatarMes, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal } from '../import'

type Props = { mes: ResumoMensal }

export function ResumoDoMes({ mes }: Props) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-superficie p-6 shadow-elevacao">
      <h2 className="text-2xl leading-tight font-semibold tracking-tight first-letter:uppercase">
        {formatarMes(mes.ano, mes.mes)}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Valor rotulo="Entradas" icone={ArrowDownLeft} texto={formatarMoedaComSinal(mes.entradas, 'entrada')} cor="text-entrada" />
        <Valor rotulo="Saídas" icone={ArrowUpRight} texto={formatarMoedaComSinal(mes.saidas, 'saida')} cor="text-saida" />
        <Valor rotulo="Resultado" icone={Equal} texto={formatarMoeda(mes.resultado)} cor="text-texto" />
      </div>
    </section>
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
