import { AnimatePresence, motion } from 'motion/react'
import { useId, useState } from 'react'
import { formatarMesCurto } from '../../shared'
import type { ResumoMensal, TransacaoCategorizada } from '../import'
import { Abas } from './Abas'
import { ListaDeTransacoes, type EdicaoDeCategoria } from './ListaDeTransacoes'
import { agruparMesesPorAno, transacoesDoMes } from './periodos'
import { ResumoDoMes } from './ResumoDoMes'

type Props = { meses: ResumoMensal[]; transacoes: TransacaoCategorizada[]; edicao?: EdicaoDeCategoria }

const chaveDo = (mes: ResumoMensal) => `${mes.ano}-${mes.mes}`

export function MesesPorAbas({ meses, transacoes, edicao }: Props) {
  const anos = agruparMesesPorAno(meses)
  const [chave, setChave] = useState(() => (meses.length > 0 ? chaveDo(meses[meses.length - 1]) : ''))
  const idDoPainel = useId()

  const selecionado = meses.find((m) => chaveDo(m) === chave) ?? meses[meses.length - 1]
  if (!selecionado) return null
  const doAno = anos.find((a) => a.ano === selecionado.ano)!

  function selecionarAno(ano: string) {
    const meses = anos.find((a) => String(a.ano) === ano)!.meses
    setChave(chaveDo(meses[meses.length - 1]))
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Abas
          rotulo="Anos"
          abas={anos.map((a) => ({ chave: String(a.ano), rotulo: String(a.ano) }))}
          selecionada={String(selecionado.ano)}
          aoSelecionar={selecionarAno}
          idDoPainel={idDoPainel}
        />
        <Abas
          rotulo={`Meses de ${selecionado.ano}`}
          abas={doAno.meses.map((m) => ({ chave: chaveDo(m), rotulo: formatarMesCurto(m.ano, m.mes).split('/')[0] }))}
          selecionada={chave}
          aoSelecionar={setChave}
          idDoPainel={idDoPainel}
        />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={chaveDo(selecionado)}
          id={idDoPainel}
          role="tabpanel"
          className="flex flex-col gap-6"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <ResumoDoMes mes={selecionado} />
          <ListaDeTransacoes
            mes={selecionado}
            transacoes={transacoesDoMes(transacoes, selecionado.ano, selecionado.mes)}
            edicao={edicao}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
