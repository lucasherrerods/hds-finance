import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { formatarMes } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { atalhosDePeriodo, hojeEmIso, intervaloDoMes, mesDoIntervalo, totaisDoIntervalo, transacoesNoIntervalo } from './intervalo'
import { ListaDeTransacoes, type EdicaoDoHistorico } from './ListaDeTransacoes'
import type { Filtros } from './periodos'
import { ResumoDoMes } from './ResumoDoMes'
import { SeletorDePeriodo, type Escolha } from './SeletorDePeriodo'

type Props = {
  meses: ResumoMensal[]
  transacoes: TransacaoCategorizada[]
  edicao?: EdicaoDoHistorico
  hoje?: string
  /** O mês em que a lista abre; sem ele, o mais recente do extrato. */
  mesInicial?: { ano: number; mes: number }
  filtroInicial?: Partial<Filtros>
}

/** Abre no mês mais recente do extrato. O período pode ser um atalho ou qualquer intervalo do calendário. */
export function TransacoesPorMes({ meses, transacoes, edicao, hoje = hojeEmIso(), mesInicial, filtroInicial }: Props) {
  const [escolhida, setEscolhida] = useState<Escolha | null>(() =>
    mesInicial && meses.some((m) => m.ano === mesInicial.ano && m.mes === mesInicial.mes)
      ? { intervalo: intervaloDoMes(mesInicial.ano, mesInicial.mes), rotulo: formatarMes(mesInicial.ano, mesInicial.mes) }
      : null,
  )
  const ultimo = meses.at(-1)
  if (!ultimo) return null

  const datas = transacoes.map((t) => t.data).sort()
  const atalhos = atalhosDePeriodo(hoje, datas[0] ?? intervaloDoMes(meses[0].ano, meses[0].mes).inicio, datas.at(-1) ?? hoje)
  const padrao = intervaloDoMes(ultimo.ano, ultimo.mes)
  const esteMes = atalhos.find((a) => a.chave === 'mes')!
  const escolha = escolhida ?? {
    intervalo: padrao,
    rotulo: esteMes.intervalo.inicio === padrao.inicio ? esteMes.rotulo : formatarMes(ultimo.ano, ultimo.mes),
  }

  const doPeriodo = transacoesNoIntervalo(transacoes, escolha.intervalo)
  const umMes = mesDoIntervalo(escolha.intervalo)
  const resumoDoMes = umMes && meses.find((m) => m.ano === umMes.ano && m.mes === umMes.mes)
  const chave = `${escolha.intervalo.inicio}_${escolha.intervalo.fim}`

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={chave}
        className="flex flex-col gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      >
        <ListaDeTransacoes
          transacoes={doPeriodo}
          historico={transacoes}
          totais={totaisDoIntervalo(meses, transacoes, escolha.intervalo)}
          sufixo={umMes ? 'do mês' : 'no período'}
          periodo={<SeletorDePeriodo escolha={escolha} atalhos={atalhos} aoAplicar={setEscolhida} />}
          edicao={edicao}
          filtroInicial={filtroInicial}
        />
        {resumoDoMes && <ResumoDoMes mes={resumoDoMes} />}
      </motion.div>
    </AnimatePresence>
  )
}
