import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import { formatarMes } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { ListaDeTransacoes, type EdicaoDoHistorico } from './ListaDeTransacoes'
import { agruparMesesPorAno, transacoesDoMes } from './periodos'
import { ResumoDoMes } from './ResumoDoMes'
import { Seletor } from './Seletor'
import { Seta } from './Seta'

type Props = { meses: ResumoMensal[]; transacoes: TransacaoCategorizada[]; edicao?: EdicaoDoHistorico }

const chaveDo = (mes: ResumoMensal) => `${mes.ano}-${mes.mes}`

/** Um mês por vez: o seletor pula para qualquer um, e as setas andam de um em um. */
export function TransacoesPorMes({ meses, transacoes, edicao }: Props) {
  const [chave, setChave] = useState('')
  const idDoMes = useId()
  const achado = meses.findIndex((m) => chaveDo(m) === chave)
  // Se o mês escolhido sumir (foi apagado), volta para o mais novo.
  const indice = achado >= 0 ? achado : meses.length - 1
  const selecionado = meses[indice]
  if (!selecionado) return null
  const ir = (destino: number) => setChave(chaveDo(meses[destino]))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 self-start">
        <Seta rotulo="Mês anterior" icone={ChevronLeft} ativa={indice > 0} aoClicar={() => ir(indice - 1)} />
        <label htmlFor={idDoMes} className="sr-only">
          Mês
        </label>
        <Seletor
          id={idDoMes}
          value={chaveDo(selecionado)}
          icone={<CalendarDays aria-hidden className="size-4" />}
          onChange={(e) => setChave(e.target.value)}
        >
          {agruparMesesPorAno(meses)
            .toReversed()
            .map(({ ano, meses: doAno }) => (
              <optgroup key={ano} label={String(ano)}>
                {doAno.toReversed().map((m) => (
                  <option key={m.mes} value={chaveDo(m)}>
                    {formatarMes(m.ano, m.mes)}
                  </option>
                ))}
              </optgroup>
            ))}
        </Seletor>
        <Seta rotulo="Mês seguinte" icone={ChevronRight} ativa={indice < meses.length - 1} aoClicar={() => ir(indice + 1)} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={chaveDo(selecionado)}
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <ListaDeTransacoes
            mes={selecionado}
            transacoes={transacoesDoMes(transacoes, selecionado.ano, selecionado.mes)}
            edicao={edicao}
          />
          <ResumoDoMes mes={selecionado} />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
