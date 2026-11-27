import { Check, Clock, Repeat, TrendingUp } from 'lucide-react'
import { formatarMoeda } from '../../shared'
import type { Recorrente } from './api'

/** O que se repete todo mês. O total é o fixo pelo valor de costume; cada item diz se já saiu, se falta ou se ficou mais caro. */
export function RecorrentesDoMes({ recorrentes }: { recorrentes: Recorrente[] }) {
  const total = recorrentes.reduce((s, r) => s + r.valor, 0)

  return (
    <section aria-label="Recorrentes" className="flex flex-col gap-4 rounded-2xl border border-borda bg-superficie p-6">
      <header className="flex flex-col gap-1">
        <h3 className="flex items-center gap-2 text-sm font-medium tracking-wider text-texto-suave uppercase">
          <Repeat aria-hidden className="size-4 opacity-70" />
          Recorrentes
        </h3>
        <p className="text-texto-suave">
          <span className="text-2xl font-semibold tracking-tight text-texto tabular-nums">{formatarMoeda(total)}</span> fixos por mês
        </p>
      </header>

      {recorrentes.length === 0 ? (
        <p className="text-texto-suave">Nada se repetiu todo mês com valor parecido nos últimos meses.</p>
      ) : (
        <ul className="flex flex-col">
          {recorrentes.map((r) => (
            <li key={r.descricao} aria-label={r.descricao} className="flex items-center gap-3 border-t border-borda py-3 first:border-0">
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate" title={r.descricao}>
                  {r.descricao}
                </span>
                <span className="text-sm text-texto-suave">
                  {r.categoria} · todo dia {r.dia}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="font-semibold tabular-nums">{formatarMoeda(r.valorNoMes ?? r.valor)}</span>
                <Situacao recorrente={r} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Situacao({ recorrente: r }: { recorrente: Recorrente }) {
  if (r.situacao === 'Paga')
    return (
      <span className="flex items-center gap-1 text-sm text-entrada">
        <Check aria-hidden className="size-3.5" />
        Paga
      </span>
    )
  if (r.situacao === 'MaisCara')
    return (
      <span className="flex items-center gap-1 text-sm text-saida">
        <TrendingUp aria-hidden className="size-3.5" />+{formatarMoeda((r.valorNoMes ?? r.valor) - r.valor)}
      </span>
    )
  return (
    <span className="flex items-center gap-1 text-sm text-texto-suave">
      <Clock aria-hidden className="size-3.5 opacity-70" />
      Dia {r.dia}
    </span>
  )
}
