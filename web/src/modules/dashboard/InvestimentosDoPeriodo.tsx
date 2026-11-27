import { ArrowDownLeft, ArrowUpRight, Flame, PiggyBank, Trophy, Undo2, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { lazy, Suspense, useState } from 'react'
import { formatarData, formatarMesCurto, formatarMoeda, formatarMoedaComSinal } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { META_MENSAL, movimentacoesDeInvestimento, resumoDosInvestimentos, sequenciaDeAplicacao } from './investimentos'

// O Recharts só baixa quando há gráfico para mostrar.
const GraficoDeInvestimentos = lazy(() => import('./GraficoDeInvestimentos').then((m) => ({ default: m.GraficoDeInvestimentos })))

const POR_VEZ = 8

const Espera = ({ altura }: { altura: string }) => <div aria-hidden className={`${altura} rounded-2xl border border-borda bg-superficie opacity-50 motion-safe:animate-pulse`} />

type Props = { meses: ResumoMensal[]; transacoes: TransacaoCategorizada[] }

/** O que saiu da conta para investir e o que voltou: números do período, gráfico, meses e movimentações. */
export function InvestimentosDoPeriodo({ meses, transacoes }: Props) {
  const [todas, setTodas] = useState(false)
  const resumo = resumoDosInvestimentos(meses)
  const movimentacoes = movimentacoesDeInvestimento(transacoes)
  const visiveis = todas ? movimentacoes : movimentacoes.slice(0, POR_VEZ)
  const maior = resumo.maiorAplicacao

  return (
    <div className="flex flex-col gap-8">
      <section
        aria-label="Aplicado líquido"
        className="flex flex-col items-center gap-2 rounded-2xl border border-borda bg-linear-to-b from-primaria-suave to-superficie px-6 py-8 text-center"
      >
        <span className="flex items-center gap-2 text-texto-suave">
          <PiggyBank aria-hidden className="size-4 opacity-70" />
          Aplicado líquido no período
        </span>
        <span className="text-4xl leading-tight font-bold tracking-[-0.03em] tabular-nums sm:text-5xl">{formatarMoeda(resumo.liquido)}</span>
        <span className="max-w-[48ch] text-texto-suave">
          {resumo.taxaDeInvestimento !== null
            ? `${resumo.taxaDeInvestimento.toLocaleString('pt-BR')}% do que entrou foi guardado.`
            : 'O que foi aplicado menos o que foi resgatado.'}
        </span>
      </section>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Numero rotulo="Aplicado" icone={ArrowUpRight} valor={formatarMoeda(resumo.aplicado)} />
        <Numero rotulo="Resgatado" icone={Undo2} valor={formatarMoeda(resumo.resgatado)} />
        <SequenciaDeAplicacao meses={meses} />
        <Numero
          rotulo="Maior aplicação"
          icone={Trophy}
          valor={maior ? formatarMoeda(maior.valor) : '—'}
          detalhe={maior ? formatarMesCurto(maior.ano, maior.mes) : undefined}
        />
      </div>

      {meses.length > 1 && (
        <Suspense fallback={<Espera altura="h-[352px]" />}>
          <GraficoDeInvestimentos meses={meses} />
        </Suspense>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Investimentos por mês" className="overflow-x-auto rounded-2xl border border-borda bg-superficie p-6">
          <h2 className="pb-4 text-sm font-medium tracking-wider text-texto-suave uppercase">Mês a mês</h2>
          <table className="w-full min-w-[24rem] text-left tabular-nums">
            <thead className="text-sm text-texto-suave">
              <tr>
                <th className="pb-3 font-medium">Mês</th>
                <th className="pb-3 text-right font-medium">Aplicado</th>
                <th className="pb-3 text-right font-medium">Resgatado</th>
                <th className="pb-3 text-right font-medium">Acumulado</th>
              </tr>
            </thead>
            <tbody>
              {meses.toReversed().map((m) => (
                <tr key={`${m.ano}-${m.mes}`} className="border-t border-borda">
                  <td className="py-3">{formatarMesCurto(m.ano, m.mes)}</td>
                  <td className="py-3 text-right">{formatarMoeda(m.investimentos.aplicado)}</td>
                  <td className="py-3 text-right">{formatarMoeda(m.investimentos.resgatado)}</td>
                  <td className="py-3 text-right">{formatarMoeda(m.investimentos.aplicadoAcumulado)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section aria-label="Movimentações" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
          <h2 className="text-sm font-medium tracking-wider text-texto-suave uppercase">Movimentações</h2>
          {visiveis.length === 0 ? (
            <p className="text-texto-suave">Nenhuma movimentação neste extrato.</p>
          ) : (
            <ul className="flex flex-col">
              {visiveis.map((t, i) => (
                <Movimentacao key={t.chave ?? `${t.data}-${i}`} transacao={t} />
              ))}
            </ul>
          )}
          {movimentacoes.length > POR_VEZ && (
            <button type="button" onClick={() => setTodas(!todas)} className="self-start font-medium text-primaria underline underline-offset-4">
              {todas ? 'Mostrar menos' : `Ver todas (${movimentacoes.length})`}
            </button>
          )}
        </section>
      </div>
    </div>
  )
}

function Movimentacao({ transacao: t }: { transacao: TransacaoCategorizada }) {
  const voltou = t.valor > 0
  const Icone = voltou ? ArrowDownLeft : ArrowUpRight
  return (
    <li className="flex items-center gap-3 border-b border-borda py-3 last:border-0">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-fundo">
        <Icone aria-hidden className="size-4 opacity-70" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate" title={t.descricao}>
          {t.descricao}
        </span>
        <span className="text-sm text-texto-suave">
          {formatarData(t.data)} · {voltou ? 'Voltou para a conta' : 'Saiu da conta'}
        </span>
      </span>
      <span className={`font-semibold whitespace-nowrap tabular-nums ${voltou ? 'text-entrada' : ''}`}>
        {formatarMoedaComSinal(t.valor, voltou ? 'entrada' : 'saida')}
      </span>
    </li>
  )
}

function SequenciaDeAplicacao({ meses }: { meses: ResumoMensal[] }) {
  const { atual, recorde } = sequenciaDeAplicacao(meses)
  const acesa = atual > 0
  return (
    <div role="group" aria-label="Sequência de aplicação" className="flex min-w-0 flex-col gap-2 rounded-2xl border border-borda bg-superficie p-4 sm:p-6">
      <span className="flex items-center gap-2 text-sm text-texto-suave">
        <motion.span
          aria-hidden
          className={`inline-flex ${acesa ? 'text-calor-4' : 'opacity-40'}`}
          animate={acesa ? { scale: [1, 1.15, 1], rotate: [0, -6, 4, 0] } : undefined}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame className="size-4" />
        </motion.span>
        Sequência
      </span>
      <span className="text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">
        {atual} {atual === 1 ? 'mês' : 'meses'}
      </span>
      <span className="text-sm text-texto-suave">
        seguidos aplicando {formatarMoeda(META_MENSAL)}+{recorde > atual && ` · recorde ${recorde}`}
      </span>
    </div>
  )
}

type NumeroProps = { rotulo: string; icone: LucideIcon; valor: string; detalhe?: string }

function Numero({ rotulo, icone: Icone, valor, detalhe }: NumeroProps) {
  return (
    <div role="group" aria-label={rotulo} className="flex min-w-0 flex-col gap-2 rounded-2xl border border-borda bg-superficie p-4 sm:p-6">
      <span className="flex items-center gap-2 text-sm text-texto-suave">
        <Icone aria-hidden className="size-4 shrink-0 opacity-70" />
        {rotulo}
      </span>
      <span className="text-lg font-semibold tracking-tight tabular-nums sm:text-2xl">{valor}</span>
      {detalhe && <span className="text-sm text-texto-suave">{detalhe}</span>}
    </div>
  )
}
