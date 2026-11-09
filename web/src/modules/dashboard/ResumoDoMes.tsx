import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Equal, PiggyBank, Sigma, Undo2, Wallet, type LucideIcon } from 'lucide-react'
import { formatarMes, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal } from '../import'
import { GastosPorCategoria } from './GastosPorCategoria'

type Props = { mes: ResumoMensal }

export function ResumoDoMes({ mes }: Props) {
  const saldo =
    mes.saldoInicial === null || mes.saldoFinal === null
      ? 'Não informado no extrato'
      : `${formatarMoeda(mes.saldoInicial)} → ${formatarMoeda(mes.saldoFinal)}`

  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-superficie p-6 shadow-elevacao">
      <h2 className="text-2xl leading-tight font-semibold tracking-tight first-letter:uppercase">
        {formatarMes(mes.ano, mes.mes)}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Valor rotulo="Entradas" icone={ArrowDownLeft} texto={formatarMoedaComSinal(mes.entradas, 'entrada')} cor="text-entrada" />
        <Valor rotulo="Saídas" icone={ArrowUpRight} texto={formatarMoedaComSinal(mes.saidas, 'saida')} cor="text-saida" />
        <Valor rotulo="Resultado" icone={Equal} texto={formatarMoeda(mes.resultado)} cor="text-texto" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Valor
          rotulo="Investimentos e transferências"
          icone={ArrowLeftRight}
          texto={formatarMoedaComSinal(mes.investimentosETransferencias, mes.investimentosETransferencias < 0 ? 'saida' : 'entrada')}
          cor="text-texto"
        />
        <Valor rotulo="Saldo" icone={Wallet} texto={saldo} cor="text-texto" />
      </div>
      <Investimentos mes={mes} />
      <GastosPorCategoria gastos={mes.gastosPorCategoria} totalDeSaidas={mes.saidas} />
    </section>
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
