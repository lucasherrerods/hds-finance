import { formatarMoedaComSinal } from '../../shared'
import type { TransacaoCategorizada } from '../import'
import { Cartao } from './Cartao'
import { IconeDaCategoria } from './IconeDaCategoria'
import { agruparPorDia } from './painel'

type Props = { transacoes: TransacaoCategorizada[] }

export function TransacoesRecentes({ transacoes }: Props) {
  return (
    <Cartao titulo="Transações recentes">
      <div className="flex flex-col gap-6">
        {agruparPorDia(transacoes).map((grupo) => (
          <div key={grupo.data} className="flex flex-col gap-2">
            <h4 className="text-sm tracking-wider text-texto-suave uppercase">{grupo.rotulo}</h4>
            <ul className="flex flex-col">
              {grupo.transacoes.map((t, i) => {
                const entrada = t.valor > 0
                return (
                  <li key={`${t.descricao}-${i}`} className="flex items-center gap-4 py-2">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-fundo">
                      <IconeDaCategoria categoria={t.categoria} className="size-5 opacity-70" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{t.descricao}</span>
                    <span className="hidden shrink-0 rounded-md bg-fundo px-2 py-1 text-sm text-texto-suave sm:inline">
                      {t.categoria}
                    </span>
                    <span
                      className={`w-28 shrink-0 text-right font-semibold tabular-nums ${entrada ? 'text-entrada' : 'text-texto'}`}
                    >
                      {formatarMoedaComSinal(t.valor, entrada ? 'entrada' : 'saida')}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </Cartao>
  )
}
