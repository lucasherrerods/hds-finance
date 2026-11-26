import { Dialogo, formatarData, formatarMes, formatarMoeda, formatarMoedaComSinal, IconeDoBanco } from '../../shared'
import { bancoDaFatura, mesDaFatura, valorDaFatura, type Fatura } from './faturas'
import { IconeDaCategoria } from './IconeDaCategoria'
import { Situacao } from './Situacao'

/** Painel lateral com uma fatura. O dialog nativo cuida do foco e do Esc. */
export function DetalheDaFatura({ fatura, aoFechar }: { fatura: Fatura; aoFechar: () => void }) {
  const [ano, mes] = mesDaFatura(fatura)
  const gastos = fatura.gastosPorCategoria ?? []
  const maior = Math.max(1, ...gastos.map((g) => g.valor))

  return (
    <Dialogo
      rotulo={`Fatura de ${formatarMes(ano, mes)}`}
      aoFechar={aoFechar}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-md border-l"
      cabecalho={
        <>
          <IconeDoBanco banco={bancoDaFatura(fatura)} />
          <span className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-lg font-semibold tracking-tight first-letter:uppercase">{formatarMes(ano, mes)}</h2>
            <span className="text-sm text-texto-suave">
              {bancoDaFatura(fatura)} · Vencimento em {formatarData(fatura.vencimento)}
            </span>
          </span>
        </>
      }
    >
      <div className="flex flex-col gap-1 rounded-xl bg-fundo p-4">
        <span className="text-sm text-texto-suave">Valor da fatura</span>
        <span className="text-3xl font-bold tracking-tight tabular-nums">{formatarMoeda(valorDaFatura(fatura))}</span>
        <Situacao paga={fatura.paga} />
      </div>

      {gastos.length > 0 && (
        <section aria-label="Gastos por categoria da fatura" className="flex flex-col gap-3">
          <h3 className="text-sm text-texto-suave">Gastos por categoria</h3>
          <ul className="flex flex-col gap-3">
            {gastos.map((g) => (
              <li key={g.categoria} className="flex flex-col gap-1">
                <span className="flex items-center justify-between gap-4">
                  <span className="flex min-w-0 items-center gap-2">
                    <IconeDaCategoria categoria={g.categoria} grupo={g.grupo} className="size-4 shrink-0 opacity-70" />
                    <span className="truncate">{g.categoria}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatarMoeda(g.valor)}</span>
                </span>
                <span aria-hidden className="h-2 overflow-hidden rounded-full bg-fundo">
                  <span className="block h-full rounded-full bg-primaria" style={{ width: `${(g.valor / maior) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Lançamentos da fatura" className="flex flex-col">
        <h3 className="flex justify-between pb-2 text-sm text-texto-suave">
          Lançamentos <span>{fatura.compras.length}</span>
        </h3>
        <ul className="flex flex-col">
          {fatura.compras.map((c, i) => (
            <li key={c.chave ?? i} className="flex items-center justify-between gap-4 border-t border-borda py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-fundo">
                  <IconeDaCategoria categoria={c.categoria} grupo={c.grupo} className="size-4 opacity-70" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{c.descricao}</span>
                  <span className="text-sm text-texto-suave">
                    {formatarData(c.data)}
                    {c.oculta && ' · Fora da soma'}
                  </span>
                </span>
              </span>
              <span className={`shrink-0 font-semibold tabular-nums ${c.oculta ? 'text-texto-suave line-through' : c.valor > 0 ? 'text-entrada' : ''}`}>
                {formatarMoedaComSinal(c.valor, c.valor > 0 ? 'entrada' : 'saida')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Dialogo>
  )
}
